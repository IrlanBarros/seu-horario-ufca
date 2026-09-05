import type { Turma } from '../types'

function escaparCampo(valor: string | number | null) {
  const texto = valor === null ? '' : String(valor)

  if (
    texto.includes(';') ||
    texto.includes('"') ||
    texto.includes('\n')
  ) {
    return `"${texto.replace(/"/g, '""')}"`
  }

  return texto
}

export function exportarHorarioCsv(
  turmas: Turma[],
  periodo: string,
) {
  if (turmas.length === 0) {
    return
  }

  const cabecalho = [
    'Código',
    'Disciplina',
    'Turma',
    'Docente',
    'Dia',
    'Início',
    'Fim',
    'Horário SIGAA',
  ]

  const linhas = turmas.flatMap((turma) => {
    if (turma.horarios.length === 0) {
      return [
        [
          turma.codigo,
          turma.disciplina,
          turma.turma,
          turma.docente,
          '',
          '',
          '',
          turma.horario_sigaa,
        ],
      ]
    }

    return turma.horarios.map((horario) => [
      turma.codigo,
      turma.disciplina,
      turma.turma,
      turma.docente,
      horario.dia_nome,
      horario.inicio,
      horario.fim,
      turma.horario_sigaa,
    ])
  })

  const conteudo = [
    cabecalho,
    ...linhas,
  ]
    .map((linha) =>
      linha
        .map((campo) => escaparCampo(campo))
        .join(';'),
    )
    .join('\n')

  // BOM ajuda Excel/LibreOffice a reconhecer UTF-8 corretamente.
  const blob = new Blob(
    ['\uFEFF', conteudo],
    {
      type: 'text/csv;charset=utf-8;',
    },
  )

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  link.href = url
  link.download = `meu-horario-cc-ufca-${periodo}.csv`

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
