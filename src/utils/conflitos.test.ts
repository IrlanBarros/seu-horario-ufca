import {
  describe,
  expect,
  it,
} from 'vitest'

import type { Turma } from '../types'

import {
  encontrarConflitos,
} from './conflitos'

function criarTurma(
  codigo: string,
  dia: number,
  diaNome: string,
  inicio: string,
  fim: string,
): Turma {
  return {
    codigo,
    disciplina: `Disciplina ${codigo}`,
    turma: '01',
    docente: 'Professor Teste',
    vagas_reservadas: 40,
    horario_sigaa: 'TESTE',
    periodo: '2026.2',

    horarios: [
      {
        dia,
        dia_nome: diaNome,
        inicio,
        fim,
      },
    ],
  }
}

describe('encontrarConflitos', () => {
  it('detecta conflito no mesmo dia', () => {
    const selecionada = criarTurma(
      'CC0001',
      2,
      'segunda-feira',
      '08:00',
      '10:00',
    )

    const novaTurma = criarTurma(
      'CC0002',
      2,
      'segunda-feira',
      '09:00',
      '11:00',
    )

    const conflitos = encontrarConflitos(
      novaTurma,
      [selecionada],
    )

    expect(conflitos).toHaveLength(1)

    expect(conflitos[0]).toMatchObject({
      turma: selecionada,
      dia: 2,
      diaNome: 'segunda-feira',
      inicio: '09:00',
      fim: '10:00',
    })
  })

  it('nao considera aulas consecutivas como conflito', () => {
    const selecionada = criarTurma(
      'CC0001',
      2,
      'segunda-feira',
      '08:00',
      '10:00',
    )

    const novaTurma = criarTurma(
      'CC0002',
      2,
      'segunda-feira',
      '10:00',
      '12:00',
    )

    const conflitos = encontrarConflitos(
      novaTurma,
      [selecionada],
    )

    expect(conflitos).toHaveLength(0)
  })

  it('nao detecta conflito em dias diferentes', () => {
    const selecionada = criarTurma(
      'CC0001',
      2,
      'segunda-feira',
      '08:00',
      '10:00',
    )

    const novaTurma = criarTurma(
      'CC0002',
      3,
      'terça-feira',
      '08:00',
      '10:00',
    )

    const conflitos = encontrarConflitos(
      novaTurma,
      [selecionada],
    )

    expect(conflitos).toHaveLength(0)
  })

  it('detecta quando uma aula esta totalmente dentro de outra', () => {
    const selecionada = criarTurma(
      'CC0001',
      4,
      'quarta-feira',
      '14:00',
      '18:00',
    )

    const novaTurma = criarTurma(
      'CC0002',
      4,
      'quarta-feira',
      '15:00',
      '16:00',
    )

    const conflitos = encontrarConflitos(
      novaTurma,
      [selecionada],
    )

    expect(conflitos).toHaveLength(1)

    expect(conflitos[0]).toMatchObject({
      inicio: '15:00',
      fim: '16:00',
    })
  })

  it('detecta conflitos em mais de um dia', () => {
    const selecionada: Turma = {
      ...criarTurma(
        'CC0001',
        2,
        'segunda-feira',
        '14:00',
        '16:00',
      ),

      horarios: [
        {
          dia: 2,
          dia_nome: 'segunda-feira',
          inicio: '14:00',
          fim: '16:00',
        },
        {
          dia: 4,
          dia_nome: 'quarta-feira',
          inicio: '14:00',
          fim: '16:00',
        },
      ],
    }

    const novaTurma: Turma = {
      ...criarTurma(
        'CC0002',
        2,
        'segunda-feira',
        '14:00',
        '16:00',
      ),

      horarios: [
        {
          dia: 2,
          dia_nome: 'segunda-feira',
          inicio: '14:00',
          fim: '16:00',
        },
        {
          dia: 4,
          dia_nome: 'quarta-feira',
          inicio: '14:00',
          fim: '16:00',
        },
      ],
    }

    const conflitos = encontrarConflitos(
      novaTurma,
      [selecionada],
    )

    expect(conflitos).toHaveLength(2)

    expect(
      conflitos.map((conflito) => conflito.dia),
    ).toEqual([2, 4])
  })
})
