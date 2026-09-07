from scraper.curricula import (
    extrair_componente,
    extrair_codigos_expressao,
)

def test_extrair_codigos_expressao():
    resultado = extrair_codigos_expressao(
        "( CAR0008 )"
    )

    assert resultado == [
        "CAR0008",
    ]


def test_extrair_codigos_com_ou():
    resultado = extrair_codigos_expressao(
        "( CC0007 OU MC0005 OU CAR0004 )"
    )

    assert resultado == [
        "CC0007",
        "MC0005",
        "CAR0004",
    ]


def test_extrair_codigos_expressao_vazia():
    assert (
        extrair_codigos_expressao(None)
        == []
    )

def test_extrair_componente():
    resultado = extrair_componente(
        "CAR0008 - CÁLCULO I - 96h"
    )

    assert resultado == {
        "codigo": "CAR0008",
        "nome": "CÁLCULO I",
        "carga_horaria": 96,
    }


def test_extrair_componente_com_nome_longo():
    resultado = extrair_componente(
        "ECI0093 - MÉTODOS NUMÉRICOS "
        "PARA EQUAÇÕES DIFERENCIAIS - 64h"
    )

    assert resultado == {
        "codigo": "ECI0093",
        "nome": (
            "MÉTODOS NUMÉRICOS PARA "
            "EQUAÇÕES DIFERENCIAIS"
        ),
        "carga_horaria": 64,
    }


def test_extrair_componente_invalido():
    assert (
        extrair_componente(
            "Carga Horária Total: 256h"
        )
        is None
    )
