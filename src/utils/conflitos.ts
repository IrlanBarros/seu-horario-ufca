import type { Horario, Turma } from '../types'

export interface ConflitoHorario {
  turma: Turma
  dia: number
  diaNome: string
  inicio: string
  fim: string
}

function horaParaMinutos(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number)

  return horas * 60 + minutos
}

function minutosParaHora(minutos: number) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

function compararHorarios(
  a: Horario,
  b: Horario,
): {
  inicio: string
  fim: string
} | null {
  if (a.dia !== b.dia) {
    return null
  }

  const inicioA = horaParaMinutos(a.inicio)
  const fimA = horaParaMinutos(a.fim)

  const inicioB = horaParaMinutos(b.inicio)
  const fimB = horaParaMinutos(b.fim)

  const inicioConflito = Math.max(inicioA, inicioB)
  const fimConflito = Math.min(fimA, fimB)

  if (inicioConflito >= fimConflito) {
    return null
  }

  return {
    inicio: minutosParaHora(inicioConflito),
    fim: minutosParaHora(fimConflito),
  }
}

export function encontrarConflitos(
  novaTurma: Turma,
  selecionadas: Turma[],
): ConflitoHorario[] {
  const conflitos: ConflitoHorario[] = []

  for (const selecionada of selecionadas) {
    for (const horarioNovo of novaTurma.horarios) {
      for (const horarioExistente of selecionada.horarios) {
        const conflito = compararHorarios(
          horarioNovo,
          horarioExistente,
        )

        if (!conflito) {
          continue
        }

        conflitos.push({
          turma: selecionada,
          dia: horarioNovo.dia,
          diaNome: horarioNovo.dia_nome,
          inicio: conflito.inicio,
          fim: conflito.fim,
        })
      }
    }
  }

  return conflitos
}
