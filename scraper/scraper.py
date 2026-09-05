import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from .schedule_parser import decodificar_horario

import requests
from bs4 import BeautifulSoup


URL = (
    "https://sig.ufca.edu.br/sigaa/public/curso/"
    "turmas.jsf?id=32652294&lc=pt_BR"
)

CURSO_ID = "32652294"
CURSO_NOME = "Ciência da Computação"

ANO = "2026"
PERIODO = "2"

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


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


def montar_payload(form, valor_periodo):
    payload = {}

    for field in form.find_all("input"):
        name = field.get("name")

        if not name:
            continue

        payload[name] = field.get("value", "")

    payload["form:inputAno"] = ANO
    payload["form:inputPeriodo"] = valor_periodo
    payload["form:buscar"] = "Buscar"

    return payload


def consultar_sigaa():
    session = criar_sessao()

    # Primeiro GET:
    # cria a sessão e obtém o javax.faces.ViewState
    response = session.get(URL, timeout=30)
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
        PERIODO,
    )

    payload = montar_payload(
        form,
        valor_periodo,
    )

    post_url = urljoin(
        response.url,
        form.get("action"),
    )

    # Consulta efetiva das turmas
    result = session.post(
        post_url,
        data=payload,
        timeout=30,
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


def salvar_json(turmas):
    dados = {
        "curso": {
            "id": CURSO_ID,
            "nome": CURSO_NOME,
        },
        "periodo": f"{ANO}.{PERIODO}",
        "atualizado_em": datetime.now(
            timezone.utc
        ).isoformat(),
        "quantidade_turmas": len(turmas),
        "turmas": turmas,
    }

    arquivo = (
        DATA_DIR
        / f"{ANO}.{PERIODO}.json"
    )

    arquivo.write_text(
        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return arquivo


def main():
    print(
        f"Consultando turmas de "
        f"{CURSO_NOME} - {ANO}.{PERIODO}..."
    )

    html = consultar_sigaa()

    turmas = extrair_turmas(html)

    if not turmas:
        raise RuntimeError(
            "Nenhuma turma foi encontrada."
        )

    arquivo = salvar_json(turmas)

    print()
    print("Consulta concluída com sucesso.")
    print(f"Turmas encontradas: {len(turmas)}")
    print(f"Arquivo gerado: {arquivo}")

    print()
    print("Primeiras turmas:")

    for turma in turmas[:5]:
        print(
            f"- {turma['codigo']} - "
            f"{turma['disciplina']} | "
            f"Turma {turma['turma']} | "
            f"{turma['horario_sigaa']}"
        )


if __name__ == "__main__":
    main()
