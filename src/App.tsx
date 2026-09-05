import { useEffect, useState } from 'react'
import type { DadosCurso, Turma } from './types'
import {
  encontrarConflitos,
  type ConflitoHorario,
} from './utils/conflitos'
import './App.css'
import GradeSemanal from './components/GradeSemanal'
import { exportarHorarioCsv } from './utils/exportarCsv'
import { exportarHorarioPdf } from './utils/exportarPdf'

type FiltroTurmas =
  | 'todas'
  | 'disponiveis'
  | 'conflito'
  | 'selecionadas'

function gerarIdTurma(turma: Turma) {
  return [
    turma.codigo,
    turma.turma,
    turma.docente,
    turma.horario_sigaa,
  ].join('|')
}

function normalizarTexto(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function gerarStorageKey(
  periodo: string,
) {
  return (
    `seu-horario-cc-ufca:` +
    `${periodo}:turmas`
  )
}

function App() {
  const [dados, setDados] = useState<DadosCurso | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionadas, setSelecionadas] = useState<Turma[]>([])
  const [busca, setBusca] = useState('')
  const [conflitos, setConflitos] =
    useState<ConflitoHorario[]>([])

  const [turmaComConflito, setTurmaComConflito] =
    useState<Turma | null>(null)

  const [filtro, setFiltro] =
    useState<FiltroTurmas>('todas')

  useEffect(() => {
    async function carregarDados() {
      try {
        const response = await fetch('/data/atual.json')

        if (!response.ok) {
          throw new Error(
            `Erro ao carregar dados: ${response.status}`,
          )
        }

        const json: DadosCurso = await response.json()

        setDados(json)

        try {
          const storageKey =
            gerarStorageKey(json.periodo)

          const idsSalvos = JSON.parse(
            localStorage.getItem(
              storageKey,
            ) ?? '[]',
          ) as string[]

          const turmasSalvas =
            json.turmas.filter((turma) =>
              idsSalvos.includes(
                gerarIdTurma(turma),
              ),
            )

          setSelecionadas(
            turmasSalvas,
          )
        } catch {
          localStorage.removeItem(
            gerarStorageKey(json.periodo),
          )
        }
      } catch (error) {
        console.error(error)
        setErro(
          'Não foi possível carregar as turmas.',
        )
      }
    }

    carregarDados()
  }, [])

  useEffect(() => {
    if (!dados) {
      return
    }

    const ids = selecionadas.map(gerarIdTurma)

    const storageKey =
      gerarStorageKey(dados.periodo)

    localStorage.setItem(
      storageKey,
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

  const termoBusca = normalizarTexto(busca)

  const turmasFiltradas = dados.turmas.filter((turma) => {
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

    const correspondeBusca =
      !termoBusca ||
      normalizarTexto(turma.codigo).includes(termoBusca) ||
      normalizarTexto(turma.disciplina).includes(termoBusca) ||
      normalizarTexto(turma.docente).includes(termoBusca)

    if (!correspondeBusca) {
      return false
    }

    switch (filtro) {
      case 'disponiveis':
        return !selecionada && !possuiConflito

      case 'conflito':
        return possuiConflito

      case 'selecionadas':
        return selecionada

      case 'todas':
      default:
        return true
    }
  })

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
          <div className="acoes-exportacao">
            <button
              type="button"
              className="botao-exportar"
              onClick={() =>
                exportarHorarioCsv(
                  selecionadas,
                  dados.periodo,
                )
              }
            >
              Exportar CSV
            </button>

            <button
              type="button"
              className="botao-exportar"
              onClick={() =>
                exportarHorarioPdf(
                  selecionadas,
                  dados.periodo,
                )
              }
            >
              Exportar PDF
            </button>
          </div>
        )}

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

        <div className="turmas-titulo">
          <div>
            <h2>
              Turmas disponíveis
            </h2>

            <p>
              {turmasFiltradas.length} de{' '}
              {dados.turmas.length} turma(s)
            </p>
          </div>
        </div>

        <div className="busca-container">
          <input
            type="search"
            className="campo-busca"
            placeholder="Buscar por código, disciplina ou docente..."
            value={busca}
            onChange={(event) =>
              setBusca(event.target.value)
            }
            aria-label="Buscar turmas"
          />
        </div>

        <div className="filtros-turmas">
          <button
            type="button"
            className={filtro === 'todas' ? 'filtro-ativo' : ''}
            onClick={() => setFiltro('todas')}
          >
            Todas
          </button>

          <button
            type="button"
            className={filtro === 'disponiveis' ? 'filtro-ativo' : ''}
            onClick={() => setFiltro('disponiveis')}
          >
            Disponíveis
          </button>

          <button
            type="button"
            className={filtro === 'conflito' ? 'filtro-ativo' : ''}
            onClick={() => setFiltro('conflito')}
          >
            Com conflito
          </button>

          <button
            type="button"
            className={filtro === 'selecionadas' ? 'filtro-ativo' : ''}
            onClick={() => setFiltro('selecionadas')}
          >
            Selecionadas
          </button>
        </div>

        {turmasFiltradas.length === 0 && (
          <div className="nenhum-resultado">
            <strong>
              Nenhuma turma encontrada
            </strong>

            <p>
              Tente pesquisar por outro código,
              disciplina ou docente.
            </p>
          </div>
        )}

        <div className="lista-turmas">
          {turmasFiltradas.map((turma) => {
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
