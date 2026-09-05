import { useEffect, useState } from 'react'
import type { DadosCurso, Turma } from './types'
import {
  encontrarConflitos,
  type ConflitoHorario,
} from './utils/conflitos'
import './App.css'
import GradeSemanal from './components/GradeSemanal'

function gerarIdTurma(turma: Turma) {
  return [
    turma.codigo,
    turma.turma,
    turma.docente,
    turma.horario_sigaa,
  ].join('|')
}

const STORAGE_KEY = 'seu-horario-cc-ufca:2026.2:turmas'

function App() {
  const [dados, setDados] = useState<DadosCurso | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [selecionadas, setSelecionadas] = useState<Turma[]>([])

  const [conflitos, setConflitos] =
    useState<ConflitoHorario[]>([])

  const [turmaComConflito, setTurmaComConflito] =
    useState<Turma | null>(null)

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

        try {
          const idsSalvos = JSON.parse(
            localStorage.getItem(STORAGE_KEY) ?? '[]',
          ) as string[]

          const turmasSalvas = json.turmas.filter((turma) =>
            idsSalvos.includes(gerarIdTurma(turma)),
          )

          setSelecionadas(turmasSalvas)
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (error) {
        console.error(error)
        setErro('Não foi possível carregar as turmas.')
      }
    }

    carregarDados()
  }, [])

  useEffect(() => {
    if (!dados) {
      return
    }

    const ids = selecionadas.map(gerarIdTurma)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(ids),
    )
  }, [selecionadas, dados])

  function turmaEstaSelecionada(turma: Turma) {
    const id = gerarIdTurma(turma)

    return selecionadas.some(
      (selecionada) =>
        gerarIdTurma(selecionada) === id,
    )
  }

  function alternarTurma(turma: Turma) {
    const id = gerarIdTurma(turma)

    if (turmaEstaSelecionada(turma)) {
      setSelecionadas((atuais) =>
        atuais.filter(
          (selecionada) =>
            gerarIdTurma(selecionada) !== id,
        ),
      )

      setConflitos([])
      setTurmaComConflito(null)

      return
    }

    const conflitosEncontrados =
      encontrarConflitos(
        turma,
        selecionadas,
      )

    if (conflitosEncontrados.length > 0) {
      setConflitos(conflitosEncontrados)
      setTurmaComConflito(turma)

      return
    }

    setConflitos([])
    setTurmaComConflito(null)

    setSelecionadas((atuais) => [
      ...atuais,
      turma,
    ])
  }

  function tentarAdicionarTurma(
    turma: Turma,
    conflitosDaTurma: ConflitoHorario[],
  ) {
    if (conflitosDaTurma.length > 0) {
      setConflitos(conflitosDaTurma)
      setTurmaComConflito(turma)

      return
    }

    alternarTurma(turma)
  }

  function fecharAvisoConflito() {
    setConflitos([])
    setTurmaComConflito(null)
  }

  if (erro) {
    return (
      <main className="container">
        <h1>Seu Horário CC - UFCA</h1>

        <p className="erro">
          {erro}
        </p>
      </main>
    )
  }

  if (!dados) {
    return (
      <main className="container">
        <h1>Seu Horário CC - UFCA</h1>

        <p>
          Carregando turmas...
        </p>
      </main>
    )
  }

  return (
    <main className="container">
      <header>
        <h1>
          Seu Horário CC - UFCA
        </h1>

        <p>
          {dados.curso.nome} • {dados.periodo}
        </p>

        <strong>
          {dados.quantidade_turmas} turmas disponíveis
        </strong>
      </header>

      {turmaComConflito && conflitos.length > 0 && (
        <section className="aviso-conflito">
          <div className="aviso-conflito-cabecalho">
            <div>
              <strong>
                Conflito de horário
              </strong>

              <p>
                Não foi possível adicionar{' '}
                <strong>
                  {turmaComConflito.disciplina}
                </strong>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={fecharAvisoConflito}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>

          <ul>
            {conflitos.map((conflito, index) => (
              <li
                key={[
                  gerarIdTurma(conflito.turma),
                  conflito.dia,
                  conflito.inicio,
                  index,
                ].join('|')}
              >
                Conflito com{' '}
                <strong>
                  {conflito.turma.disciplina}
                </strong>{' '}
                na {conflito.diaNome}, das{' '}
                <strong>
                  {conflito.inicio} às {conflito.fim}
                </strong>
                .
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="meu-horario">
        <div className="meu-horario-cabecalho">
          <div>
            <h2>
              Meu horário
            </h2>

            <p>
              {selecionadas.length === 0
                ? 'Nenhuma turma selecionada.'
                : `${selecionadas.length} turma(s) selecionada(s).`}
            </p>
          </div>
        </div>

        {selecionadas.length > 0 && (
          <GradeSemanal turmas={selecionadas} />
        )}

        {selecionadas.length > 0 && (
          <div className="selecionadas">
            {selecionadas.map((turma) => (
              <div
                className="selecionada"
                key={gerarIdTurma(turma)}
              >
                <div>
                  <strong>
                    {turma.codigo} — {turma.disciplina}
                  </strong>

                  <span>
                    {turma.horario_sigaa}
                  </span>
                </div>

                <button
                  type="button"
                  className="botao-remover"
                  onClick={() => alternarTurma(turma)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>
          Turmas disponíveis
        </h2>

        <div className="lista-turmas">
          {dados.turmas.map((turma) => {
          const selecionada =
            turmaEstaSelecionada(turma)

          const conflitosDaTurma = selecionada
            ? []
            : encontrarConflitos(
                turma,
                selecionadas,
              )

          const possuiConflito =
            conflitosDaTurma.length > 0

            return (
              <article
                className={[
                  'turma-card',
                  selecionada
                    ? 'selecionada-card'
                    : '',
                  possuiConflito
                    ? 'conflito-card'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={gerarIdTurma(turma)}
              >
                <div className="turma-cabecalho">
                  <span className="codigo">
                    {turma.codigo}
                  </span>

                  <span>
                    Turma {turma.turma}
                  </span>
                </div>

                <h2>
                  {turma.disciplina}
                </h2>

                <p>
                  <strong>
                    Docente:
                  </strong>{' '}
                  {turma.docente || 'Não informado'}
                </p>

                <p>
                  <strong>
                    Horário:
                  </strong>{' '}
                  {turma.horario_sigaa || 'Não informado'}
                </p>

                <div className="horarios">
                  {turma.horarios.map((horario) => (
                    <span
                      className="horario"
                      key={[
                        horario.dia,
                        horario.inicio,
                        horario.fim,
                      ].join('|')}
                    >
                      {horario.dia_nome}:{' '}
                      {horario.inicio}–{horario.fim}
                    </span>
                  ))}
                </div>

                {possuiConflito && (
                  <div className="conflito-card-aviso">
                    <strong>
                      ⚠ Conflito de horário
                    </strong>

                    {conflitosDaTurma.map(
                      (conflito, index) => (
                        <p
                          key={[
                            conflito.turma.codigo,
                            conflito.dia,
                            conflito.inicio,
                            index,
                          ].join('|')}
                        >
                          Conflita com{' '}
                          <strong>
                            {conflito.turma.disciplina}
                          </strong>
                          {' '}na {conflito.diaNome}, das{' '}
                          {conflito.inicio} às {conflito.fim}.
                        </p>
                      ),
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className={
                    selecionada
                      ? 'botao-remover'
                      : possuiConflito
                        ? 'botao-bloqueado'
                        : 'botao-adicionar'
                  }
                  aria-disabled={
                    !selecionada && possuiConflito
                  }
                  onClick={() => {
                    if (selecionada) {
                      alternarTurma(turma)
                      return
                    }

                    tentarAdicionarTurma(
                      turma,
                      conflitosDaTurma,
                    )
                  }}
                >
                  {selecionada
                    ? 'Remover do horário'
                    : possuiConflito
                      ? 'Indisponível por conflito'
                      : 'Adicionar ao horário'}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default App
