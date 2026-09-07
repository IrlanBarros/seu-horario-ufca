import re
from bs4 import BeautifulSoup
from .courses import (
    criar_sessao,
    consultar_cursos,
    extrair_cursos,
)
from urllib.parse import urljoin
from .requisite_parser import (
    parsear_expressao_requisito,
)
import json
from pathlib import Path
import time
import requests
from datetime import datetime, timezone

PADRAO_NIVEL = re.compile(
    r"(\d+)\s*[º°o]?\s*N[ií]vel",
    re.IGNORECASE,
)

PADRAO_COMPONENTE = re.compile(
    r"^([A-Z0-9]+)\s*-\s*(.+)\s*-\s*(\d+)h$"
)

URL_CURRICULOS = (
    "https://sig.ufca.edu.br/sigaa/public/curso/"
    "curriculo.jsf"
)

CURRICULOS_DIR = Path(
    "public/data/curriculos"
)

CURRICULOS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

CACHE_DIR = Path(
    "data/cache"
)

CACHE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

CACHE_REGRAS_ARQUIVO = (
    CACHE_DIR
    / "cache-componentes.json"
)

PADRAO_CODIGO_COMPONENTE = re.compile(
    r"\b[A-Z]{2,}\d+\b"
)

def salvar_indice_curriculos(
    cursos,
    sucessos,
    falhas,
):
    ids_sucesso = {
        item["id"]
        for item in sucessos
    }

    ids_falha = {
        item["id"]
        for item in falhas
    }

    cursos_indice = []

    for curso in cursos:
        curso_id = curso["id"]

        arquivo_curriculo = (
            CURRICULOS_DIR
            / f"{curso_id}.json"
        )

        disponivel = (
            arquivo_curriculo.exists()
        )

        item = {
            "id": curso_id,
            "nome": curso["nome"],
            "modalidade": curso["modalidade"],
            "disponivel": disponivel,
            "arquivo": (
                f"{curso_id}.json"
                if disponivel
                else None
            ),
        }

        if curso_id in ids_falha:
            if disponivel:
                item["aviso"] = (
                    "Falha na atualização. "
                    "Utilizando os últimos "
                    "dados disponíveis."
                )
            else:
                item["erro"] = (
                    "Estrutura curricular "
                    "indisponível."
                )

        cursos_indice.append(item)
        
        quantidade_disponiveis = sum(
            1
            for curso in cursos_indice
            if curso["disponivel"]
        )

        quantidade_indisponiveis = (
            len(cursos_indice)
            - quantidade_disponiveis
        )

    dados = {
        "quantidade_cursos":
            len(cursos_indice),
        "quantidade_disponiveis":
            quantidade_disponiveis,
        "quantidade_indisponiveis":
            quantidade_indisponiveis,
        "cursos":
            cursos_indice,
    }

    arquivo = (
        CURRICULOS_DIR
        / "index.json"
    )

    arquivo.write_text(
        json.dumps(
            dados,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        f"Índice salvo em: "
        f"{arquivo}"
    )

def salvar_estruturas_curso(
    curso_id,
    estruturas,
):
    arquivo = (
        CURRICULOS_DIR
        / f"{curso_id}.json"
    )

    dados_base = {
        "curso_id": curso_id,
        "quantidade_estruturas": (
            len(estruturas)
        ),
        "estruturas": estruturas,
    }

    if arquivo.exists():
        try:
            dados_atuais = json.loads(
                arquivo.read_text(
                    encoding="utf-8"
                )
            )

            dados_atuais_base = {
                "curso_id":
                    dados_atuais.get(
                        "curso_id"
                    ),
                "quantidade_estruturas":
                    dados_atuais.get(
                        "quantidade_estruturas"
                    ),
                "estruturas":
                    dados_atuais.get(
                        "estruturas"
                    ),
            }

            if (
                dados_atuais_base
                == dados_base
            ):
                print(
                    "Nenhuma alteração nas "
                    "estruturas curriculares."
                )

                return arquivo

        except (
            json.JSONDecodeError,
            OSError,
        ):
            pass

    dados = {
        **dados_base,
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
        f"Estruturas salvas em: "
        f"{arquivo}"
    )

    return arquivo

def carregar_cache_regras():
    if not CACHE_REGRAS_ARQUIVO.exists():
        return {}

    try:
        conteudo = (
            CACHE_REGRAS_ARQUIVO
            .read_text(
                encoding="utf-8"
            )
        )

        return json.loads(
            conteudo
        )

    except (
        json.JSONDecodeError,
        OSError,
    ):
        print(
            "AVISO: não foi possível "
            "carregar o cache."
        )

        print(
            "Um novo cache será criado."
        )

        return {}


def salvar_cache_regras(cache):
    CACHE_REGRAS_ARQUIVO.write_text(
        json.dumps(
            cache,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

def coletar_estruturas_do_curso(
    session,
    curso_id,
    cache_regras,
):

    pagina_curriculos = consultar_curriculos(
        session,
        curso_id,
    )

    curriculos = extrair_curriculos(
        pagina_curriculos.text
    )

    print(
        f"Componentes carregados do cache: "
        f"{len(cache_regras)}"
    )
    estruturas = []

    total = len(curriculos)

    for indice, curriculo in enumerate(
        curriculos,
        start=1,
    ):
        print()
        print("=" * 70)
        print(
            f"[{indice}/{total}] "
            f"Estrutura {curriculo['codigo']}"
        )
        print("=" * 70)

        # Busca novamente a lista para obter
        # um ViewState atualizado.
        pagina_curriculos = (
            consultar_curriculos(
                session,
                curso_id,
            )
        )

        curriculos_atualizados = (
            extrair_curriculos(
                pagina_curriculos.text
            )
        )

        curriculo_atual = next(
            item
            for item
            in curriculos_atualizados
            if item["id"]
            == curriculo["id"]
        )

        pagina_estrutura = (
            consultar_estrutura_curricular(
                session,
                pagina_curriculos,
                curriculo_atual,
            )
        )

        componentes = (
            extrair_componentes_curriculo(
                pagina_estrutura.text
            )
        )

        componentes_enriquecidos = (
            enriquecer_componentes_com_regras(
                session,
                pagina_estrutura,
                componentes,
                cache_regras,
            )
        )

        estrutura = {
            "id": curriculo["id"],
            "codigo": curriculo["codigo"],
            "ano_criacao":
                curriculo["ano_criacao"],
            "status":
                curriculo["status"],
            "quantidade_componentes":
                len(componentes_enriquecidos),
            "quantidade_obrigatorias":
                sum(
                    1
                    for componente
                    in componentes_enriquecidos
                    if componente["tipo"]
                    == "obrigatoria"
                ),
            "quantidade_optativas":
                sum(
                    1
                    for componente
                    in componentes_enriquecidos
                    if componente["tipo"]
                    == "optativa"
                ),
            "componentes":
                componentes_enriquecidos,
        }

        estruturas.append(
            estrutura
        )

        print(
            f"Estrutura "
            f"{curriculo['codigo']}: "
            f"{len(componentes_enriquecidos)} "
            f"componentes"
        )

        print(
            f"Cache acumulado: "
            f"{len(cache_regras)}"
        )

    return estruturas

def enriquecer_componentes_com_regras(
    session,
    pagina_estrutura,
    componentes,
    cache=None,
):
    if cache is None:
        cache = {}

    resultados = []

    total = len(componentes)

    for indice, componente in enumerate(
        componentes,
        start=1,
    ):
        print(
            f"[{indice}/{total}] "
            f"{componente['codigo']} - "
            f"{componente['nome']}"
        )

        componente_id = componente.get("id")

        if not componente_id:
            print(
                "  Sem ID do SIGAA. "
                "Mantendo sem regras."
            )

            resultado = {
                **componente,
                "pre_requisitos_expressao": None,
                "pre_requisitos_codigos": [],
                "pre_requisitos_regra": None,
                "co_requisitos_expressao": None,
                "co_requisitos_codigos": [],
                "equivalencias_expressao": None,
                "equivalencias_codigos": [],
            }

            resultado.pop(
                "acao_jsf",
                None,
            )

            resultados.append(
                resultado
            )

            continue

        if componente_id in cache:
            print(
                "  Usando regras do cache."
            )

            regras = cache[
                componente_id
            ]
        else:
            time.sleep(0.5)
            
            pagina_detalhes = (
                consultar_detalhes_componente(
                    session,
                    pagina_estrutura,
                    componente,
                )
            )

            regras = (
                extrair_regras_componente(
                    pagina_detalhes.text
                )
            )

            cache[
                componente_id
            ] = regras
            
            salvar_cache_regras(
                cache
            )

        resultado = {
            **componente,
            "pre_requisitos_expressao":
                regras[
                    "pre_requisitos_expressao"
                ],
            "pre_requisitos_codigos":
                regras[
                    "pre_requisitos_codigos"
                ],
            "pre_requisitos_regra":
                regras[
                    "pre_requisitos_regra"
                ],
            "co_requisitos_expressao":
                regras[
                    "co_requisitos_expressao"
                ],
            "co_requisitos_codigos":
                regras[
                    "co_requisitos_codigos"
                ],
            "equivalencias_expressao":
                regras[
                    "equivalencias_expressao"
                ],
            "equivalencias_codigos":
                regras[
                    "equivalencias_codigos"
                ],
        }

        resultado.pop(
            "acao_jsf",
            None,
        )

        resultados.append(
            resultado
        )

    return resultados

def extrair_codigos_expressao(expressao):
    if not expressao:
        return []

    return PADRAO_CODIGO_COMPONENTE.findall(
        expressao
    )

def extrair_detalhes_componente_jsf(linha):
    link = linha.find(
        "a",
        title=lambda valor:
            valor
            and
            "Visualizar Detalhes do Componente"
            in valor,
    )

    if not link:
        return None, None

    onclick = link.get(
        "onclick",
        "",
    )

    parametros = dict(
        re.findall(
            r"'([^']+)':'([^']*)'",
            onclick,
        )
    )

    componente_id = parametros.get(
        "id"
    )

    acao = next(
        (
            chave
            for chave, valor
            in parametros.items()
            if (
                chave.startswith("formulario:")
                and chave == valor
            )
        ),
        None,
    )

    return componente_id, acao

def extrair_obrigatorias(html):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    componentes = []

    for tabela in soup.find_all(
        "table",
        class_="subFormulario",
    ):
        texto_tabela = tabela.get_text(
            " ",
            strip=True,
        )

        nivel_match = PADRAO_NIVEL.search(
            texto_tabela
        )

        if not nivel_match:
            continue

        nivel = int(
            nivel_match.group(1)
        )

        linhas = tabela.find_all("tr")

        for linha in linhas:
            celulas = linha.find_all(
                "td",
                recursive=False,
            )

            if len(celulas) < 2:
                continue

            texto_componente = (
                celulas[0].get_text(
                    " ",
                    strip=True,
                )
            )

            tipo = celulas[1].get_text(
                " ",
                strip=True,
            )

            if (
                tipo.casefold()
                != "obrigatória".casefold()
            ):
                continue

            componente = extrair_componente(
                texto_componente
            )

            if not componente:
                continue
            
            componente_id, acao_jsf = (
                extrair_detalhes_componente_jsf(
                    linha
                )
            )

            componente["tipo"] = (
                "obrigatoria"
            )

            componente["nivel"] = nivel
            
            componente["id"] = componente_id
            componente["acao_jsf"] = acao_jsf

            componentes.append(
                componente
            )

    return componentes

def extrair_componente(texto):
    match = PADRAO_COMPONENTE.match(
        texto.strip()
    )

    if not match:
        return None

    codigo = match.group(1).strip()
    nome = match.group(2).strip()
    carga_horaria = int(
        match.group(3)
    )

    return {
        "codigo": codigo,
        "nome": nome,
        "carga_horaria": carga_horaria,
    }

def extrair_optativas(html):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    componentes = []

    for tabela in soup.find_all(
        "table",
        class_="subFormulario",
    ):
        linhas = tabela.find_all("tr")

        for linha in linhas:
            celulas = linha.find_all(
                "td",
                recursive=False,
            )

            if len(celulas) < 2:
                continue

            texto_componente = (
                celulas[0].get_text(
                    " ",
                    strip=True,
                )
            )

            tipo = celulas[1].get_text(
                " ",
                strip=True,
            )

            if tipo.casefold() != "optativa":
                continue

            componente = extrair_componente(
                texto_componente
            )

            if not componente:
                continue
            
            componente_id, acao_jsf = (
                extrair_detalhes_componente_jsf(
                    linha
                )
            )
            
            componente["tipo"] = "optativa"
            componente["nivel"] = None
            componente["id"] = componente_id
            componente["acao_jsf"] = acao_jsf

            componentes.append(
                componente
            )

    return componentes

def extrair_campos_detalhes(html):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    titulo = soup.find(
        string=lambda texto:
            texto
            and (
                "Dados Gerais do "
                "Componente Curricular"
                in texto
            ),
    )

    if not titulo:
        raise RuntimeError(
            "Título dos dados gerais "
            "não encontrado."
        )

    tabela = titulo.find_parent("table")

    if not tabela:
        raise RuntimeError(
            "Tabela dos dados gerais "
            "não encontrada."
        )

    def extrair_valor(rotulo):
        for celula in tabela.find_all(
            ["td", "th"]
        ):
            texto = celula.get_text(
                " ",
                strip=True,
            )

            # Caso:
            # <td>Código:</td>
            # <td>CAR0011</td>
            if (
                texto
                .rstrip(":")
                .strip()
                == rotulo
            ):
                proxima = (
                    celula.find_next_sibling(
                        ["td", "th"]
                    )
                )

                if proxima:
                    return proxima.get_text(
                        " ",
                        strip=True,
                    )

            # Caso:
            # <td>Código: CAR0011</td>
            prefixo = f"{rotulo}:"

            if texto.startswith(prefixo):
                valor = texto[
                    len(prefixo):
                ].strip()

                if valor:
                    return valor

        return None

    return {
        "codigo": extrair_valor(
            "Código"
        ),
        "nome": extrair_valor(
            "Nome"
        ),
        "pre_requisitos": extrair_valor(
            "Pré-Requisitos"
        ),
        "co_requisitos": extrair_valor(
            "Co-Requisitos"
        ),
        "equivalencias": extrair_valor(
            "Equivalências"
        ),
    }

def normalizar_expressao(valor):
    if not valor:
        return None

    valor = valor.strip()

    if valor in {"-", ""}:
        return None

    return valor

def extrair_regras_componente(html):
    campos = extrair_campos_detalhes(
        html
    )

    pre_requisitos = normalizar_expressao(
        campos["pre_requisitos"]
    )
    
    pre_requisitos_regra = (
        parsear_expressao_requisito(
            pre_requisitos
        )
    )

    co_requisitos = normalizar_expressao(
        campos["co_requisitos"]
    )

    equivalencias = normalizar_expressao(
        campos["equivalencias"]
    )

    return {
        "codigo": campos["codigo"],
        "nome": campos["nome"],
        "pre_requisitos_expressao":
            pre_requisitos,
        "pre_requisitos_codigos":
            extrair_codigos_expressao(
                pre_requisitos
            ),
        "co_requisitos_expressao":
            co_requisitos,
        "co_requisitos_codigos":
            extrair_codigos_expressao(
                co_requisitos
            ),
        "equivalencias_expressao":
            equivalencias,
        "equivalencias_codigos":
            extrair_codigos_expressao(
                equivalencias
            ),
        "pre_requisitos_regra":
            pre_requisitos_regra,
    }
def extrair_componentes_curriculo(html):
    obrigatorias = extrair_obrigatorias(
        html
    )

    optativas = extrair_optativas(
        html
    )

    return [
        *obrigatorias,
        *optativas,
    ]

def montar_payload_formulario(form):
    payload = {}

    for campo in form.find_all("input"):
        nome = campo.get("name")

        if not nome:
            continue

        tipo = campo.get(
            "type",
            "text",
        ).lower()

        if tipo in {
            "submit",
            "button",
            "image",
            "reset",
            "file",
        }:
            continue

        if (
            tipo in {"checkbox", "radio"}
            and not campo.has_attr("checked")
        ):
            continue

        payload[nome] = campo.get(
            "value",
            "",
        )

    return payload

def consultar_detalhes_componente(
    session,
    pagina_estrutura,
    componente,
):
    soup = BeautifulSoup(
        pagina_estrutura.text,
        "html.parser",
    )

    form = soup.find(
        "form",
        id="formulario",
    )

    if not form:
        raise RuntimeError(
            "Formulário da estrutura "
            "curricular não encontrado."
        )

    if not componente.get("acao_jsf"):
        raise RuntimeError(
            f"Ação JSF não encontrada para "
            f"{componente['codigo']}."
        )

    payload = montar_payload_formulario(
        form
    )

    payload[
        componente["acao_jsf"]
    ] = componente["acao_jsf"]

    payload["id"] = componente["id"]
    payload["publico"] = "public"

    post_url = urljoin(
        pagina_estrutura.url,
        form.get("action"),
    )

    max_tentativas = 4

    for tentativa in range(
        1,
        max_tentativas + 1,
    ):
        try:
            response = session.post(
                post_url,
                data=payload,
                timeout=30,
            )

            response.raise_for_status()

            return response

        except requests.exceptions.RequestException as erro:
            if tentativa == max_tentativas:
                raise

            espera = 2 ** tentativa

            print(
                f"  Falha ao consultar "
                f"{componente['codigo']}. "
                f"Nova tentativa em "
                f"{espera}s..."
            )

            print(
                f"  Motivo: "
                f"{type(erro).__name__}"
            )

            time.sleep(espera)

def consultar_estrutura_curricular(
    session,
    pagina_curriculos,
    curriculo,
):
    soup = BeautifulSoup(
        pagina_curriculos.text,
        "html.parser",
    )

    form = soup.find(
        "form",
        id="formCurriculosCurso",
    )

    if not form:
        raise RuntimeError(
            "Formulário de currículos "
            "não encontrado."
        )

    payload = montar_payload_formulario(
        form
    )

    payload[
        curriculo["acao_jsf"]
    ] = curriculo["acao_jsf"]

    payload["id"] = curriculo["id"]

    post_url = urljoin(
        pagina_curriculos.url,
        form.get("action"),
    )

    response = session.post(
        post_url,
        data=payload,
        timeout=30,
    )

    response.raise_for_status()

    return response

def extrair_parametros_jsf(onclick):
    pares = re.findall(
        r"'([^']+)':'([^']*)'",
        onclick,
    )

    parametros = dict(pares)

    curriculo_id = parametros.get("id")

    acao = next(
        (
            chave
            for chave in parametros
            if chave.startswith(
                "formCurriculosCurso:"
            )
        ),
        None,
    )

    return acao, curriculo_id

def extrair_curriculos(html):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    curriculos = []

    for linha in soup.find_all("tr"):
        texto = linha.get_text(
            " ",
            strip=True,
        )

        if (
            "Detalhes da Estrutura Curricular"
            not in texto
        ):
            continue

        codigo_match = re.search(
            r"Detalhes da Estrutura Curricular\s+"
            r"(.+?),",
            texto,
        )

        ano_match = re.search(
            r"Criado em\s+(\d{4})",
            texto,
        )

        if (
            not codigo_match
            or not ano_match
        ):
            continue

        codigo = (
            codigo_match
            .group(1)
            .strip()
        )

        ano_criacao = int(
            ano_match.group(1)
        )

        if "Ativa" in texto:
            status = "Ativa"
        elif "Inativa" in texto:
            status = "Inativa"
        else:
            status = "Desconhecido"

        link_visualizar = linha.find(
            "a",
            title=lambda valor:
                valor
                and
                "Visualizar Estrutura Curricular"
                in valor,
        )

        if not link_visualizar:
            print(
                f"AVISO: link não encontrado "
                f"para {codigo}"
            )
            continue

        onclick = link_visualizar.get(
            "onclick",
            "",
        )

        acao, curriculo_id = (
            extrair_parametros_jsf(
                onclick
            )
        )

        if not acao:
            print(
                f"AVISO: ação JSF não encontrada "
                f"para {codigo}"
            )
            continue

        if not curriculo_id:
            print(
                f"AVISO: ID não encontrado "
                f"para {codigo}"
            )
            continue

        curriculos.append(
            {
                "id": curriculo_id,
                "codigo": codigo,
                "ano_criacao": ano_criacao,
                "status": status,
                "acao_jsf": acao,
            }
        )

    return curriculos

def consultar_curriculos(
    session,
    curso_id,
):
    response = session.get(
        URL_CURRICULOS,
        params={
            "id": curso_id,
            "lc": "pt_BR",
        },
        timeout=30,
    )

    response.raise_for_status()

    return response

def main():
    session = criar_sessao()

    cache_regras = (
        carregar_cache_regras()
    )

    print(
        f"Componentes carregados do cache: "
        f"{len(cache_regras)}"
    )

    html_cursos = consultar_cursos()

    cursos = extrair_cursos(
        html_cursos
    )

    print(
        f"Cursos encontrados: "
        f"{len(cursos)}"
    )

    sucessos = []
    falhas = []

    for indice, curso in enumerate(
        cursos,
        start=1,
    ):
        print()
        print("=" * 70)
        print(
            f"[{indice}/{len(cursos)}] "
            f"{curso['nome']}"
        )
        print(
            f"ID: {curso['id']}"
        )
        print("=" * 70)

        try:
            estruturas = (
                coletar_estruturas_do_curso(
                    session,
                    curso["id"],
                    cache_regras,
                )
            )

            salvar_estruturas_curso(
                curso["id"],
                estruturas,
            )

            sucessos.append(
                {
                    "id": curso["id"],
                    "nome": curso["nome"],
                    "estruturas": len(
                        estruturas
                    ),
                }
            )

            print(
                f"Estruturas encontradas: "
                f"{len(estruturas)}"
            )

            print(
                f"Cache acumulado: "
                f"{len(cache_regras)}"
            )

        except Exception as erro:
            falhas.append(
                {
                    "id": curso["id"],
                    "nome": curso["nome"],
                    "erro": str(erro),
                }
            )

            print()
            print(
                f"ERRO ao processar "
                f"{curso['nome']}."
            )

            print(
                f"{type(erro).__name__}: "
                f"{erro}"
            )

            print(
                "Continuando para o "
                "próximo curso..."
            )
    
    print()
    print("=" * 70)
    print("PROCESSAMENTO CONCLUÍDO")
    print("=" * 70)

    print(
        f"Cursos processados com sucesso: "
        f"{len(sucessos)}"
    )

    print(
        f"Cursos com falha: "
        f"{len(falhas)}"
    )

    print(
        f"Componentes únicos no cache: "
        f"{len(cache_regras)}"
    )

    if falhas:
        print()
        print("FALHAS:")

        for falha in falhas:
            print(
                f"- {falha['nome']} "
                f"(ID {falha['id']}): "
                f"{falha['erro']}"
            )
            
    salvar_indice_curriculos(
        cursos,
        sucessos,
        falhas,
    )

if __name__ == "__main__":
    main()
