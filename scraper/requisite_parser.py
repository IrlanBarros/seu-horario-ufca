import re


PADRAO_CODIGO_COMPONENTE = re.compile(
    r"\b[A-Z]{2,}\d+\b"
)

PADRAO_TOKEN_REQUISITO = re.compile(
    r"\(|\)|\bOU\b|\bE\b|\b[A-Z]{2,}\d+\b"
)


def tokenizar_expressao(expressao):
    if not expressao:
        return []

    return PADRAO_TOKEN_REQUISITO.findall(
        expressao
    )


class ParserRequisito:
    def __init__(self, tokens):
        self.tokens = tokens
        self.posicao = 0

    def atual(self):
        if self.posicao >= len(self.tokens):
            return None

        return self.tokens[self.posicao]

    def consumir(self, esperado=None):
        token = self.atual()

        if token is None:
            raise ValueError(
                "Fim inesperado da expressão."
            )

        if (
            esperado is not None
            and token != esperado
        ):
            raise ValueError(
                f"Esperado {esperado}, "
                f"encontrado {token}."
            )

        self.posicao += 1

        return token

    def parse(self):
        if not self.tokens:
            return None

        resultado = self.parse_ou()

        if self.atual() is not None:
            raise ValueError(
                f"Token inesperado: "
                f"{self.atual()}"
            )

        return resultado

    def parse_ou(self):
        esquerda = self.parse_e()

        while self.atual() == "OU":
            self.consumir("OU")

            direita = self.parse_e()

            esquerda = {
                "operador": "OU",
                "esquerda": esquerda,
                "direita": direita,
            }

        return esquerda

    def parse_e(self):
        esquerda = self.parse_fator()

        while self.atual() == "E":
            self.consumir("E")

            direita = self.parse_fator()

            esquerda = {
                "operador": "E",
                "esquerda": esquerda,
                "direita": direita,
            }

        return esquerda

    def parse_fator(self):
        token = self.atual()

        if token == "(":
            self.consumir("(")

            expressao = self.parse_ou()

            self.consumir(")")

            return expressao

        if (
            token
            and PADRAO_CODIGO_COMPONENTE.fullmatch(
                token
            )
        ):
            self.consumir()

            return {
                "codigo": token,
            }

        raise ValueError(
            f"Token inválido: {token}"
        )


def parsear_expressao_requisito(expressao):
    if not expressao:
        return None

    tokens = tokenizar_expressao(
        expressao
    )

    parser = ParserRequisito(tokens)

    return parser.parse()


def requisito_satisfeito(
    regra,
    concluidas,
):
    if regra is None:
        return True

    if "codigo" in regra:
        return regra["codigo"] in concluidas

    esquerda = requisito_satisfeito(
        regra["esquerda"],
        concluidas,
    )

    direita = requisito_satisfeito(
        regra["direita"],
        concluidas,
    )

    if regra["operador"] == "E":
        return esquerda and direita

    if regra["operador"] == "OU":
        return esquerda or direita

    raise ValueError(
        f"Operador desconhecido: "
        f"{regra['operador']}"
    )
