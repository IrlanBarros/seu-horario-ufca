import { jsPDF } from 'jspdf'
import type { Turma } from '../types'

const DIAS = [
  { numero: 2, nome: 'Segunda' },
  { numero: 3, nome: 'Terça' },
  { numero: 4, nome: 'Quarta' },
  { numero: 5, nome: 'Quinta' },
  { numero: 6, nome: 'Sexta' },
]

const INICIO_GRADE = 7 * 60
const FIM_GRADE = 23 * 60
const INTERVALO = 30

function horaParaMinutos(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number)

  return horas * 60 + minutos
}

function formatarHora(minutos: number) {
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60

  return `${String(horas).padStart(2, '0')}:${String(
    minutosRestantes,
  ).padStart(2, '0')}`
}

function formatarData() {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())
}

function quebrarTexto(
  pdf: jsPDF,
  texto: string,
  largura: number,
) {
  return pdf.splitTextToSize(texto, largura) as string[]
}

function gerarCorTurma(codigo: string) {
  let hash = 0

  for (let i = 0; i < codigo.length; i += 1) {
    hash =
      codigo.charCodeAt(i) +
      ((hash << 5) - hash)
  }

  const cores = [
    [219, 234, 254],
    [220, 252, 231],
    [254, 249, 195],
    [243, 232, 255],
    [255, 237, 213],
    [224, 242, 254],
    [254, 226, 226],
  ]

  return cores[Math.abs(hash) % cores.length]
}

function desenharCabecalho(
  pdf: jsPDF,
  periodo: string,
) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)

  pdf.text(
    'Seu Horario CC - UFCA',
    15,
    15,
  )

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)

  pdf.text(
    `Ciencia da Computacao - Periodo ${periodo}`,
    15,
    22,
  )

  pdf.setTextColor(100)

  pdf.text(
    `Gerado em ${formatarData()}`,
    15,
    28,
  )

  pdf.setTextColor(0)
}

function desenharGrade(
  pdf: jsPDF,
  turmas: Turma[],
) {
  const xInicial = 15
  const yInicial = 36

  const larguraHorario = 18
  const larguraDia = 50

  const alturaCabecalho = 9
  const alturaSlot = 4.7

  const quantidadeSlots =
    (FIM_GRADE - INICIO_GRADE) /
    INTERVALO

  // Canto superior esquerdo
  pdf.setFillColor(243, 244, 246)
  pdf.setDrawColor(210)

  pdf.rect(
    xInicial,
    yInicial,
    larguraHorario,
    alturaCabecalho,
    'FD',
  )

  // Cabeçalho dos dias
  DIAS.forEach((dia, index) => {
    const x =
      xInicial +
      larguraHorario +
      index * larguraDia

    pdf.setFillColor(243, 244, 246)

    pdf.rect(
      x,
      yInicial,
      larguraDia,
      alturaCabecalho,
      'FD',
    )

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)

    pdf.text(
      dia.nome,
      x + larguraDia / 2,
      yInicial + 6,
      {
        align: 'center',
      },
    )
  })

  // Linhas e horários
  for (
    let slot = 0;
    slot < quantidadeSlots;
    slot += 1
  ) {
    const minutos =
      INICIO_GRADE +
      slot * INTERVALO

    const y =
      yInicial +
      alturaCabecalho +
      slot * alturaSlot

    pdf.setDrawColor(225)

    pdf.rect(
      xInicial,
      y,
      larguraHorario,
      alturaSlot,
    )

    if (minutos % 60 === 0) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.5)
      pdf.setTextColor(90)

      pdf.text(
        formatarHora(minutos),
        xInicial + larguraHorario - 2,
        y + 3.3,
        {
          align: 'right',
        },
      )

      pdf.setTextColor(0)
    }

    DIAS.forEach((_, index) => {
      const x =
        xInicial +
        larguraHorario +
        index * larguraDia

      pdf.rect(
        x,
        y,
        larguraDia,
        alturaSlot,
      )
    })
  }

  // Blocos das disciplinas
  turmas.forEach((turma) => {
    turma.horarios.forEach((horario) => {
      const diaIndex = DIAS.findIndex(
        (dia) =>
          dia.numero === horario.dia,
      )

      if (diaIndex === -1) {
        return
      }

      const inicio =
        horaParaMinutos(horario.inicio)

      const fim =
        horaParaMinutos(horario.fim)

      const slotInicial =
        (inicio - INICIO_GRADE) /
        INTERVALO

      const quantidadeSlotsAula =
        (fim - inicio) /
        INTERVALO

      const x =
        xInicial +
        larguraHorario +
        diaIndex * larguraDia +
        1

      const y =
        yInicial +
        alturaCabecalho +
        slotInicial * alturaSlot +
        0.7

      const largura =
        larguraDia - 2

      const altura =
        quantidadeSlotsAula *
          alturaSlot -
        1.4

      const [r, g, b] =
        gerarCorTurma(turma.codigo)

      pdf.setFillColor(r, g, b)
      pdf.setDrawColor(80, 120, 180)

      pdf.roundedRect(
        x,
        y,
        largura,
        altura,
        1,
        1,
        'FD',
      )

      pdf.setTextColor(30)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)

      pdf.text(
        turma.codigo,
        x + 2,
        y + 3.5,
      )

      pdf.setFont(
        'helvetica',
        'normal',
      )

      pdf.setFontSize(5.8)

      const nome = quebrarTexto(
        pdf,
        turma.disciplina,
        largura - 4,
      )

      const maxLinhasNome =
        altura >= 18 ? 2 : 1

      pdf.text(
        nome.slice(0, maxLinhasNome),
        x + 2,
        y + 7,
      )

      pdf.setFontSize(5.5)

      pdf.text(
        `${horario.inicio} - ${horario.fim}`,
        x + 2,
        y + altura - 2,
      )
    })
  })

  pdf.setTextColor(0)
}

function adicionarPaginaDisciplinas(
  pdf: jsPDF,
  turmas: Turma[],
  periodo: string,
) {
  pdf.addPage('a4', 'landscape')

  desenharCabecalho(
    pdf,
    periodo,
  )

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)

  pdf.text(
    'Turmas selecionadas',
    15,
    40,
  )

  let y = 49

  turmas.forEach((turma) => {
    const alturaCard = 26

    if (y + alturaCard > 195) {
      pdf.addPage(
        'a4',
        'landscape',
      )

      desenharCabecalho(
        pdf,
        periodo,
      )

      y = 40
    }

    pdf.setFillColor(
      248,
      250,
      252,
    )

    pdf.setDrawColor(220)

    pdf.roundedRect(
      15,
      y,
      267,
      alturaCard,
      2,
      2,
      'FD',
    )

    pdf.setFont(
      'helvetica',
      'bold',
    )

    pdf.setFontSize(10)

    pdf.text(
      `${turma.codigo} - ${turma.disciplina}`,
      20,
      y + 6,
    )

    pdf.setFont(
      'helvetica',
      'normal',
    )

    pdf.setFontSize(8)

    pdf.text(
      `Turma: ${turma.turma}`,
      20,
      y + 12,
    )

    pdf.text(
      `Docente: ${
        turma.docente ||
        'Nao informado'
      }`,
      20,
      y + 17,
    )

    pdf.text(
      `Horario SIGAA: ${
        turma.horario_sigaa ||
        'Nao informado'
      }`,
      20,
      y + 22,
    )

    y += alturaCard + 4
  })
}

export function exportarHorarioPdf(
  turmas: Turma[],
  periodo: string,
) {
  if (turmas.length === 0) {
    return
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  desenharCabecalho(
    pdf,
    periodo,
  )

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)

  pdf.text(
    'Grade semanal',
    15,
    33,
  )

  desenharGrade(
    pdf,
    turmas,
  )

  adicionarPaginaDisciplinas(
    pdf,
    turmas,
    periodo,
  )

  pdf.save(
    `meu-horario-cc-ufca-${periodo}.pdf`,
  )
}
