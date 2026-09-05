import re
from collections import defaultdict


DIAS = {
    1: "domingo",
    2: "segunda-feira",
    3: "terça-feira",
    4: "quarta-feira",
    5: "quinta-feira",
    6: "sexta-feira",
    7: "sábado",
}


HORARIOS = {
    "M": {
        "0": ("07:00", "08:00"),
        "1": ("07:30", "08:30"),
        "2": ("08:00", "09:00"),
        "3": ("08:30", "09:30"),
        "4": ("09:00", "10:00"),
        "5": ("09:30", "10:30"),
        "6": ("10:00", "11:00"),
        "7": ("10:30", "11:30"),
        "8": ("11:00", "12:00"),
        "9": ("11:30", "12:30"),
    },
    "T": {
        "0": ("12:00", "13:00"),
        "1": ("12:30", "13:30"),
        "2": ("13:00", "14:00"),
        "3": ("13:30", "14:30"),
        "4": ("14:00", "15:00"),
        "5": ("14:30", "15:30"),
        "6": ("15:00", "16:00"),
        "7": ("15:30", "16:30"),
        "8": ("16:00", "17:00"),
        "9": ("16:30", "17:30"),
    },
    "N": {
        "0": ("17:00", "18:00"),
        "1": ("17:30", "18:30"),
        "2": ("18:00", "19:00"),
        "3": ("18:30", "19:30"),
        "4": ("19:00", "20:00"),
        "5": ("19:30", "20:30"),
        "6": ("20:00", "21:00"),
        "7": ("20:30", "21:30"),
        "8": ("21:00", "22:00"),
        "9": ("21:30", "22:30"),
    },
}


PADRAO_HORARIO = re.compile(
    r"([1-7]+)([MTN])([0-9]+)"
)


def hora_para_minutos(hora):
    horas, minutos = map(
        int,
        hora.split(":"),
    )

    return horas * 60 + minutos


def minutos_para_hora(minutos):
    return (
        f"{minutos // 60:02d}:"
        f"{minutos % 60:02d}"
    )


def mesclar_intervalos(intervalos):
    if not intervalos:
        return []

    intervalos.sort(
        key=lambda intervalo: intervalo[0]
    )

    resultado = [intervalos[0]]

    for inicio, fim in intervalos[1:]:
        ultimo_inicio, ultimo_fim = resultado[-1]

        # Intervalos consecutivos ou sobrepostos
        if inicio <= ultimo_fim:
            resultado[-1] = (
                ultimo_inicio,
                max(ultimo_fim, fim),
            )
        else:
            resultado.append(
                (inicio, fim)
            )

    return resultado


def decodificar_horario(codigo):
    codigo = codigo.strip()

    if not codigo or codigo == "-" or codigo == "." or codigo == " ":
        return []

    horarios_por_dia = defaultdict(list)

    encontrados = list(
        PADRAO_HORARIO.finditer(codigo)
    )

    if not encontrados:
        raise ValueError(
            f"Horário SIGAA inválido: {codigo}"
        )

    for match in encontrados:
        dias_codigo = match.group(1)
        turno = match.group(2)
        aulas = match.group(3)

        for dia_texto in dias_codigo:
            dia = int(dia_texto)

            for aula in aulas:
                inicio, fim = HORARIOS[turno][aula]

                horarios_por_dia[dia].append(
                    (
                        hora_para_minutos(inicio),
                        hora_para_minutos(fim),
                    )
                )

    resultado = []

    for dia in sorted(horarios_por_dia):
        intervalos = mesclar_intervalos(
            horarios_por_dia[dia]
        )

        for inicio, fim in intervalos:
            resultado.append(
                {
                    "dia": dia,
                    "dia_nome": DIAS[dia],
                    "inicio": minutos_para_hora(
                        inicio
                    ),
                    "fim": minutos_para_hora(
                        fim
                    ),
                }
            )

    return resultado
