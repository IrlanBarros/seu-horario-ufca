import time
import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
from urllib.parse import urljoin
from .schedule_parser import decodificar_horario
from .courses import (
    consultar_cursos,
    extrair_cursos,
)

import requests
from bs4 import BeautifulSoup

URL_TURMAS = (
    "https://sig.ufca.edu.br/sigaa/public/curso/"
    "turmas.jsf"
)

DATA_DIR = Path("public/data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
FUSO_LOCAL = ZoneInfo("America/Fortaleza")

def gerar_periodos_candidatos():
    ano_atual = datetime.now(FUSO_LOCAL).year

    return [
        (str(ano_atual + 1), "1"),
        (str(ano_atual), "2"),
        (str(ano_atual), "1"),
        (str(ano_atual - 1), "2"),
        (str(ano_atual - 1), "1"),
    ]

def criar_sessao():
    session = requests.Session()

    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 "
                "Chrome/140.0 Safari/537.36"
            )
        }
    )

    return session


def encontrar_valor_periodo(select, periodo):
    for option in select.find_all("option"):
        texto = option.get_text(strip=True)

        if texto == periodo:
            return option.get("value")

    raise RuntimeError(
        f"Não foi possível encontrar o período {periodo}."
    )


def montar_payload(form, ano, valor_periodo):
    payload = {}

    for field in form.find_all("input"):
        name = field.get("name")

        if not name:
            continue

        payload[name] = field.get("value", "")

    payload["form:inputAno"] = ano
    payload["form:inputPeriodo"] = valor_periodo
    payload["form:buscar"] = "Buscar"

    return payload

def encontrar_periodo_global(cursos):
    candidatos = gerar_periodos_candidatos()

    print()
    print(
        "Procurando período acadêmico "
        "mais recente com turmas..."
    )

    for ano, periodo in candidatos:
        periodo_completo = f"{ano}.{periodo}"

        print()
        print(
            f"Verificando {periodo_completo}..."
        )

        for curso in cursos:
            html = consultar_sigaa(
                curso["id"],
                ano,
                periodo,
            )

            turmas = extrair_turmas(html)

            if turmas:
                print()
                print(
                    f"Período global encontrado: "
                    f"{periodo_completo}"
                )

                print(
                    f"Primeira oferta encontrada em: "
                    f"{curso['nome']}"
                )

                return ano, periodo

        print(
            f"Nenhum dos cursos possui turmas "
            f"em {periodo_completo}."
        )

    raise RuntimeError(
        "Nenhum período acadêmico "
        "com turmas foi encontrado."
    )

def coletar_turmas_dos_cursos(
    cursos,
    ano,
    periodo,
):
    resultados = []

    total_cursos = len(cursos)

    for indice, curso in enumerate(
        cursos,
        start=1,
    ):
        print()
        print(
            f"[{indice}/{total_cursos}] "
            f"Consultando {curso['nome']}..."
        )

        html = consultar_sigaa(
            curso["id"],
            ano,
            periodo,
        )

        turmas = extrair_turmas(html)

        resultados.append(
            {
                "id": curso["id"],
                "nome": curso["nome"],
                "sede": curso["sede"],
                "modalidade": curso["modalidade"],
                "quantidade_turmas": len(turmas),
                "turmas": turmas,
            }
        )

        print(
            f"{curso['nome']}: "
            f"{len(turmas)} turma(s)"
        )

    return resultados

def executar_com_retry(
    operacao,
    descricao,
    tentativas=4,
):
    ultimo_erro = None

    for tentativa in range(
        1,
        tentativas + 1,
    ):
        try:
            return operacao()

        except requests.RequestException as error:
            ultimo_erro = error

            if tentativa == tentativas:
                break

            espera = 2 ** tentativa

            print(
                f"{descricao} falhou "
                f"(tentativa {tentativa}/"
                f"{tentativas}). "
                f"Nova tentativa em "
                f"{espera}s..."
            )

            time.sleep(espera)

    raise ultimo_erro

def consultar_sigaa(curso_id, ano, periodo):
    session = criar_sessao()
    url = (
    	f"{URL_TURMAS}"
    	f"?id={curso_id}"
    	f"&lc=pt_BR"
    )

    # Primeiro GET:
    # cria a sessão e obtém o javax.faces.ViewState
    response = executar_com_retry(
        lambda: session.get(
            url,
            timeout=30,
        ),
        "GET do SIGAA",
    )
    response.raise_for_status()

    soup = BeautifulSoup(
        response.text,
        "html.parser",
    )

    form = soup.find("form", id="form")

    if not form:
        raise RuntimeError(
            "Formulário de consulta não encontrado."
        )

    select_periodo = soup.find(
        "select",
        attrs={"name": "form:inputPeriodo"},
    )

    if not select_periodo:
        raise RuntimeError(
            "Campo de período não encontrado."
        )

    valor_periodo = encontrar_valor_periodo(
        select_periodo,
        periodo,
    )

    payload = montar_payload(
        form,
	ano,
        valor_periodo,
    )

    post_url = urljoin(
        response.url,
        form.get("action"),
    )

    # Consulta efetiva das turmas
    result = executar_com_retry(
        lambda: session.post(
            post_url,
            data=payload,
            timeout=30,
        ),
        "POST do SIGAA",
    )

    result.raise_for_status()

    return result.text


def separar_codigo_nome(texto):
    partes = texto.split(" - ", 1)

    if len(partes) != 2:
        return texto.strip(), ""

    codigo = partes[0].strip()
    nome = partes[1].strip()

    return codigo, nome


def extrair_turmas(html):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    turmas = []

    tabelas = soup.find_all(
        "table",
        id="table_lt",
    )

    print(
        f"Tabelas de turmas encontradas: "
        f"{len(tabelas)}"
    )

    for tabela in tabelas:
        # Cada table_lt tem imediatamente antes dela
        # um div group_lt contendo o código e o nome
        # da disciplina.
        grupo = tabela.find_previous_sibling(
            "div",
            id="group_lt",
        )

        if not grupo:
            print(
                "AVISO: disciplina não encontrada "
                "para uma tabela."
            )
            continue

        # Não usamos o span porque o SIGAA repete IDs
        # de maneira inválida no HTML.
        titulo_texto = grupo.get_text(
            " ",
            strip=True,
        )

        codigo, disciplina = separar_codigo_nome(
            titulo_texto,
        )

        tbody = tabela.find("tbody")

        if not tbody:
            continue

        linhas = tbody.find_all(
            "tr",
            recursive=False,
        )

        for linha in linhas:
            celulas = linha.find_all(
                "td",
                recursive=False,
            )

            if len(celulas) < 5:
                continue

            periodo = celulas[0].get_text(
                " ",
                strip=True,
            )

            numero_turma = celulas[1].get_text(
                " ",
                strip=True,
            )

            docente = celulas[2].get_text(
                " ",
                strip=True,
            )

            vagas_texto = celulas[3].get_text(
                " ",
                strip=True,
            )

            horario = celulas[4].get_text(
                " ",
                strip=True,
            )

            try:
                vagas_reservadas = int(
                    vagas_texto
                )
            except ValueError:
                vagas_reservadas = None

            turma = {
    		"codigo": codigo,
    		"disciplina": disciplina,
    		"turma": numero_turma,
    		"docente": docente,
    		"vagas_reservadas": vagas_reservadas,
    		"horario_sigaa": horario,
    		"horarios": decodificar_horario(horario),
    		"periodo": periodo,
	    }

            turmas.append(turma)

            print(
                f"Extraída: "
                f"{codigo} - {disciplina} | "
                f"Turma {numero_turma} | "
                f"{horario}"
            )

    return turmas

def encontrar_periodo_mais_recente(curso_id):
    candidatos = gerar_periodos_candidatos()

    print()
    print("Procurando período acadêmico mais recente...")

    for ano, periodo in candidatos:
        periodo_completo = f"{ano}.{periodo}"

        print()
        print(f"Verificando {periodo_completo}...")

        html = consultar_sigaa(
            curso_id,
	    ano,
            periodo,
        )

        turmas = extrair_turmas(html)

        if turmas:
            print()
            print(
                f"Período encontrado: {periodo_completo}"
            )

            return ano, periodo, turmas

        print(
            f"Nenhuma turma encontrada em "
            f"{periodo_completo}."
        )

    raise RuntimeError(
        "Nenhum período acadêmico com turmas "
        "foi encontrado."
    )

def salvar_json(turmas, ano, periodo):
    arquivo = DATA_DIR / "atual.json"

    periodo_completo = f"{ano}.{periodo}"

    novos_dados_base = {
        "curso": {
            "id": CURSO_ID,
            "nome": CURSO_NOME,
        },
        "periodo": periodo_completo,
        "quantidade_turmas": len(turmas),
        "turmas": turmas,
    }

    if arquivo.exists():
        try:
            dados_atuais = json.loads(
                arquivo.read_text(
                    encoding="utf-8"
                )
            )

            dados_atuais_base = {
                "curso": dados_atuais.get(
                    "curso"
                ),
                "periodo": dados_atuais.get(
                    "periodo"
                ),
                "quantidade_turmas": dados_atuais.get(
                    "quantidade_turmas"
                ),
                "turmas": dados_atuais.get(
                    "turmas"
                ),
            }

            if (
                dados_atuais_base
                == novos_dados_base
            ):
                print(
                    "Nenhuma alteração nas turmas."
                )

                return arquivo

        except (
            json.JSONDecodeError,
            OSError,
        ):
            pass

    dados = {
        **novos_dados_base,
        "atualizado_em": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    arquivo.write_text(
        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "Dados alterados. JSON atualizado."
    )

    return arquivo

def salvar_dados_cursos(
    resultados,
    ano,
    periodo,
):
    arquivo = DATA_DIR / "cursos-atual.json"

    periodo_completo = f"{ano}.{periodo}"

    total_turmas = sum(
        curso["quantidade_turmas"]
        for curso in resultados
    )

    dados = {
        "periodo": periodo_completo,
        "quantidade_cursos": len(resultados),
        "quantidade_turmas": total_turmas,
        "cursos": resultados,
    }

    arquivo.write_text(
        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print(
        f"Dados salvos em: {arquivo}"
    )

    return arquivo

def main():
    print(
        "Buscando cursos de graduação "
        "de Juazeiro do Norte..."
    )

    html_cursos = consultar_cursos()

    cursos = extrair_cursos(
        html_cursos,
    )

    print()
    print(
        f"Cursos encontrados: "
        f"{len(cursos)}"
    )

    ano, periodo = (
        encontrar_periodo_global(
            cursos
        )
    )

    resultados = (
        coletar_turmas_dos_cursos(
            cursos,
            ano,
            periodo,
        )
    )

    arquivo = salvar_dados_cursos(
   	resultados,
        ano,
        periodo,
    )

    print()
    print("=" * 60)
    print(
        f"RESUMO - {ano}.{periodo}"
    )
    print("=" * 60)

    print(
        f"Arquivo gerado: {arquivo}"
    )

    total_turmas = 0

    for curso in resultados:
        quantidade = (
            curso["quantidade_turmas"]
        )

        total_turmas += quantidade

        print(
            f"{curso['nome']}: "
            f"{quantidade}"
        )

    print()
    print(
        f"Cursos processados: "
        f"{len(resultados)}"
    )

    print(
        f"Total de turmas: "
        f"{total_turmas}"
    )

if __name__ == "__main__":
    main()
