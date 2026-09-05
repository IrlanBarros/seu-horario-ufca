import { useEffect, useState } from 'react'
import type { DadosCurso } from './types'
import './App.css'

function App() {
  const [dados, setDados] = useState<DadosCurso | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        const response = await fetch('/data/2026.2.json')

        if (!response.ok) {
          throw new Error(
            `Erro ao carregar dados: ${response.status}`,
          )
        }

        const json: DadosCurso = await response.json()

        setDados(json)
      } catch (error) {
        console.error(error)
        setErro('Não foi possível carregar as turmas.')
      }
    }

    carregarDados()
  }, [])

  if (erro) {
    return (
      <main className="container">
        <h1>Seu Horário CC - UFCA</h1>
        <p className="erro">{erro}</p>
      </main>
    )
  }

  if (!dados) {
    return (
      <main className="container">
        <h1>Seu Horário CC - UFCA</h1>
        <p>Carregando turmas...</p>
      </main>
    )
  }

  return (
    <main className="container">
      <header>
        <h1>Seu Horário CC - UFCA</h1>

        <p>
          {dados.curso.nome} • {dados.periodo}
        </p>

        <strong>
          {dados.quantidade_turmas} turmas disponíveis
        </strong>
      </header>

      <section className="lista-turmas">
        {dados.turmas.map((turma, index) => (
          <article
            className="turma-card"
            key={`${turma.codigo}-${turma.turma}-${index}`}
          >
            <div className="turma-cabecalho">
              <span className="codigo">
                {turma.codigo}
              </span>

              <span>
                Turma {turma.turma}
              </span>
            </div>

            <h2>{turma.disciplina}</h2>

            <p>
              <strong>Docente:</strong>{' '}
              {turma.docente || 'Não informado'}
            </p>

            <p>
              <strong>Horário:</strong>{' '}
              {turma.horario_sigaa || 'Não informado'}
            </p>

            <div className="horarios">
              {turma.horarios.map((horario) => (
                <span
                  className="horario"
                  key={`${horario.dia}-${horario.inicio}`}
                >
                  {horario.dia_nome}: {horario.inicio}–
                  {horario.fim}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
