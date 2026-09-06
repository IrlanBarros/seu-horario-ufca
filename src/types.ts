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

export interface Curso {
  id: string
  nome: string
  sede: string
  modalidade: string
  quantidade_turmas: number
  turmas: Turma[]
}

export interface DadosCursos {
  periodo: string
  quantidade_cursos: number
  quantidade_turmas: number
  cursos: Curso[]
}
