from urllib.parse import parse_qs, urlparse

import requests
from bs4 import BeautifulSoup


URL_CURSOS = (
    "https://sig.ufca.edu.br/sigaa/public/curso/"
    "lista.jsf?aba=p-graduacao&nivel=G"
)

SEDE_ALVO = "Juazeiro do Norte"


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


def extrair_id_curso(url):
    query = parse_qs(
        urlparse(url).query
    )

    valores = query.get("id")

    if not valores:
        return None

    return valores[0]


def consultar_cursos():
    session = criar_sessao()

    response = session.get(
        URL_CURSOS,
        timeout=30,
    )

    response.raise_for_status()

    return response.text

def extrair_cursos(html):
    soup = BeautifulSoup(
        html,
        "html.parser",
    )

    cursos = []

    linhas = soup.find_all("tr")

    for linha in linhas:
        celulas = linha.find_all("td")

        if len(celulas) < 4:
            continue

        nome = celulas[0].get_text(
            " ",
            strip=True,
        )

        sede = celulas[1].get_text(
            " ",
            strip=True,
        )

        modalidade = celulas[2].get_text(
            " ",
            strip=True,
        )

        if sede.casefold() != SEDE_ALVO.casefold():
            continue

        link = linha.find(
            "a",
            href=True,
        )

        if not link:
            continue

        url = link["href"]

        curso_id = extrair_id_curso(url)

        if not curso_id:
            continue

        cursos.append(
            {
                "id": curso_id,
                "nome": nome,
                "sede": sede,
                "modalidade": modalidade,
                "url": url,
            }
        )

    return cursos


def main():
    html = consultar_cursos()

    cursos = extrair_cursos(html)

    print(
        f"Cursos encontrados em "
        f"{SEDE_ALVO}: {len(cursos)}"
    )

    print()

    for curso in cursos:
        print(
            f"{curso['id']} | "
            f"{curso['nome']} | "
            f"{curso['modalidade']}"
        )


if __name__ == "__main__":
    main()
