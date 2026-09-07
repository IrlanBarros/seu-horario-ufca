from scraper.requisite_parser import (
    parsear_expressao_requisito,
    requisito_satisfeito,
    tokenizar_expressao,
)


EXPRESSAO_COMPLEXA = (
    "( CAR0012 ) E "
    "( ECI0025 OU ECI0097 )"
)


def test_tokenizar_expressao_complexa():
    assert tokenizar_expressao(
        EXPRESSAO_COMPLEXA
    ) == [
        "(",
        "CAR0012",
        ")",
        "E",
        "(",
        "ECI0025",
        "OU",
        "ECI0097",
        ")",
    ]


def test_requisito_com_primeira_alternativa():
    regra = parsear_expressao_requisito(
        EXPRESSAO_COMPLEXA
    )

    concluidas = {
        "CAR0012",
        "ECI0025",
    }

    assert requisito_satisfeito(
        regra,
        concluidas,
    )


def test_requisito_com_segunda_alternativa():
    regra = parsear_expressao_requisito(
        EXPRESSAO_COMPLEXA
    )

    concluidas = {
        "CAR0012",
        "ECI0097",
    }

    assert requisito_satisfeito(
        regra,
        concluidas,
    )


def test_requisito_sem_alternativa():
    regra = parsear_expressao_requisito(
        EXPRESSAO_COMPLEXA
    )

    concluidas = {
        "CAR0012",
    }

    assert not requisito_satisfeito(
        regra,
        concluidas,
    )


def test_requisito_sem_car0012():
    regra = parsear_expressao_requisito(
        EXPRESSAO_COMPLEXA
    )

    concluidas = {
        "ECI0025",
        "ECI0097",
    }

    assert not requisito_satisfeito(
        regra,
        concluidas,
    )


def test_sem_pre_requisito():
    regra = parsear_expressao_requisito(
        None
    )

    assert requisito_satisfeito(
        regra,
        set(),
    )
