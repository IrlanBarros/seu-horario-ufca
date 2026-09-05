from scraper.schedule_parser import decodificar_horario


def test_24t46():
    assert decodificar_horario("24T46") == [
        {
            "dia": 2,
            "dia_nome": "segunda-feira",
            "inicio": "14:00",
            "fim": "16:00",
        },
        {
            "dia": 4,
            "dia_nome": "quarta-feira",
            "inicio": "14:00",
            "fim": "16:00",
        },
    ]


def test_246m68():
    assert decodificar_horario("246M68") == [
        {
            "dia": 2,
            "dia_nome": "segunda-feira",
            "inicio": "10:00",
            "fim": "12:00",
        },
        {
            "dia": 4,
            "dia_nome": "quarta-feira",
            "inicio": "10:00",
            "fim": "12:00",
        },
        {
            "dia": 6,
            "dia_nome": "sexta-feira",
            "inicio": "10:00",
            "fim": "12:00",
        },
    ]


def test_35m24():
    assert decodificar_horario("35M24") == [
        {
            "dia": 3,
            "dia_nome": "terça-feira",
            "inicio": "08:00",
            "fim": "10:00",
        },
        {
            "dia": 5,
            "dia_nome": "quinta-feira",
            "inicio": "08:00",
            "fim": "10:00",
        },
    ]


def test_sem_horario():
    assert decodificar_horario("") == []
    assert decodificar_horario("-") == []
