export interface RegraRequisitoCodigo {
  codigo: string
}

export interface RegraRequisitoOperador {
  operador: 'E' | 'OU'
  esquerda: RegraRequisito
  direita: RegraRequisito
}

export type RegraRequisito =
  | RegraRequisitoCodigo
  | RegraRequisitoOperador

export interface ComponenteCurricular {
  id: string | null
  codigo: string
  nome: string
  carga_horaria: number
  tipo: 'obrigatoria' | 'optativa'
  nivel: number | null

  pre_requisitos_expressao: string | null
  pre_requisitos_codigos: string[]
  pre_requisitos_regra: RegraRequisito | null

  co_requisitos_expressao: string | null
  co_requisitos_codigos: string[]

  equivalencias_expressao: string | null
  equivalencias_codigos: string[]
}

export interface EstruturaCurricular {
  id: string
  codigo: string
  ano_criacao: number
  status: string
  quantidade_componentes: number
  quantidade_obrigatorias: number
  quantidade_optativas: number
  componentes: ComponenteCurricular[]
}

export interface DadosCurriculoCurso {
  curso_id: string
  quantidade_estruturas: number
  atualizado_em?: string
  estruturas: EstruturaCurricular[]
}

export interface CursoIndiceCurriculo {
  id: string
  nome: string
  modalidade: string
  disponivel: boolean
  arquivo: string | null
  aviso?: string
  erro?: string
}

export interface IndiceCurriculos {
  quantidade_cursos: number
  quantidade_disponiveis: number
  quantidade_indisponiveis: number
  cursos: CursoIndiceCurriculo[]
}

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
