import type { Turma } from '../types'

interface GradeSemanalProps {
  turmas: Turma[]
}

const DIAS = [
  { numero: 2, nome: 'Segunda' },
  { numero: 3, nome: 'Terça' },
  { numero: 4, nome: 'Quarta' },
  { numero: 5, nome: 'Quinta' },
  { numero: 6, nome: 'Sexta' },
]

const INICIO_GRADE = 7 * 60
const FIM_GRADE = 22 * 60 + 30
const INTERVALO = 30

function horaParaMinutos(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number)

  return horas * 60 + minutos
}

function formatarHora(minutos: number) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

function GradeSemanal({ turmas }: GradeSemanalProps) {
  const quantidadeSlots =
    (FIM_GRADE - INICIO_GRADE) / INTERVALO

  const slots = Array.from(
    { length: quantidadeSlots },
    (_, index) => INICIO_GRADE + index * INTERVALO,
  )

  return (
    <div className="grade-wrapper">
      <div
        className="grade-semanal"
        style={{
          gridTemplateRows: `44px repeat(${quantidadeSlots}, 32px)`,
        }}
      >
        <div className="grade-canto" />

        {DIAS.map((dia, index) => (
          <div
            className="grade-dia"
            key={dia.numero}
            style={{
              gridColumn: index + 2,
              gridRow: 1,
            }}
          >
            {dia.nome}
          </div>
        ))}

        {slots.map((minutos, index) => (
          <div
            className="grade-hora"
            key={minutos}
            style={{
              gridColumn: 1,
              gridRow: index + 2,
            }}
          >
            {minutos % 60 === 0
              ? formatarHora(minutos)
              : ''}
          </div>
        ))}

        {DIAS.flatMap((dia, diaIndex) =>
          slots.map((_, slotIndex) => (
            <div
              className="grade-celula"
              key={`${dia.numero}-${slotIndex}`}
              style={{
                gridColumn: diaIndex + 2,
                gridRow: slotIndex + 2,
              }}
            />
          )),
        )}

        {turmas.flatMap((turma) =>
          turma.horarios.map((horario) => {
            const diaIndex = DIAS.findIndex(
              (dia) => dia.numero === horario.dia,
            )

            if (diaIndex === -1) {
              return []
            }

            const inicio =
              horaParaMinutos(horario.inicio)

            const fim =
              horaParaMinutos(horario.fim)

            const linhaInicial =
              2 +
              (inicio - INICIO_GRADE) /
                INTERVALO

            const linhaFinal =
              2 +
              (fim - INICIO_GRADE) /
                INTERVALO

            return (
              <div
                className="grade-aula"
                key={[
                  turma.codigo,
                  turma.turma,
                  turma.docente,
                  horario.dia,
                  horario.inicio,
                ].join('|')}
                style={{
                  gridColumn: diaIndex + 2,
                  gridRow: `${linhaInicial} / ${linhaFinal}`,
                }}
                title={`${turma.disciplina} — ${turma.docente}`}
              >
                <strong>
                  {turma.codigo}
                </strong>

                <span>
                  {turma.disciplina}
                </span>

                <small>
                  {horario.inicio}–{horario.fim}
                </small>
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}

export default GradeSemanal
