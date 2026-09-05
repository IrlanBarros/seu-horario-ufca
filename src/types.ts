export interface Horario {
  dia: number
  dia_nome: string
  inicio: string
  fim: string
}

export interface Turma {
  codigo: string
  disciplina: string
  turma: string
  docente: string
  vagas_reservadas: number | null
  horario_sigaa: string
  horarios: Horario[]
  periodo: string
}

export interface DadosCurso {
  curso: {
    id: string
    nome: string
  }
  periodo: string
  atualizado_em: string
  quantidade_turmas: number
  turmas: Turma[]
}
