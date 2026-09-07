import { useEffect, useState } from 'react'
import type {
  Curso,
  DadosCursos,
  DadosCurriculoCurso,
  IndiceCurriculos,
  Turma,
} from './types'
import {
  encontrarConflitos,
  type ConflitoHorario,
} from './utils/conflitos'
import './App.css'
import GradeSemanal from './components/GradeSemanal'
import { exportarHorarioCsv } from './utils/exportarCsv'
import { exportarHorarioPdf } from './utils/exportarPdf'
import { Link } from 'react-router-dom'

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
  cursoId: string,
) {
  return (
    `seu-horario-ufca:` +
    `${periodo}:${cursoId}:turmas`
  )
}

function gerarRotuloCurso(
  curso: Curso,
  cursos: Curso[],
) {
  const quantidadeMesmoNome =
    cursos.filter(
      (item) =>
        normalizarTexto(item.nome) ===
        normalizarTexto(curso.nome),
    ).length

  if (quantidadeMesmoNome > 1) {
    return `${curso.nome} (${curso.id})`
  }

  return curso.nome
}

function App() {
  const [dados, setDados] = useState<DadosCursos | null>(null)
  const [cursoSelecionadoId, setCursoSelecionadoId] =
  useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [selecionadas, setSelecionadas] = useState<Turma[]>([])
  const [busca, setBusca] = useState('')
  const [conflitos, setConflitos] =
  useState<ConflitoHorario[]>([])

  const [turmaComConflito, setTurmaComConflito] =
    useState<Turma | null>(null)

  const [filtro, setFiltro] =
    useState<FiltroTurmas>('todas')

  const [
    codigosOptativas,
    setCodigosOptativas,
  ] = useState<Set<string>>(
    new Set(),
  )

  useEffect(() => {
    async function carregarDados() {
      try {
        const response = await fetch('/data/cursos-atual.json')

        if (!response.ok) {
          throw new Error(
            `Erro ao carregar dados: ${response.status}`,
          )
        }

        const json: DadosCursos = await response.json()

        setDados(json)

        const cursoPadrao =
          json.cursos.find(
            (curso) =>
              curso.nome
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase() ===
              'ciencia da computacao',
          ) ?? json.cursos[0]

        setCursoSelecionadoId(
          cursoPadrao?.id ?? null,
        )

        try {
          const storageKey =
            gerarStorageKey(
              json.periodo,
              cursoPadrao.id,
            )

          const idsSalvos = JSON.parse(
            localStorage.getItem(
              storageKey,
            ) ?? '[]',
          ) as string[]

          const turmasSalvas =
            cursoPadrao.turmas.filter((turma) =>
              idsSalvos.includes(
                gerarIdTurma(turma),
              ),
            )

          setSelecionadas(
            turmasSalvas,
          )
        } catch {
          localStorage.removeItem(
            gerarStorageKey(
            json.periodo,
            cursoPadrao.id,
          ),
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
    if (!cursoSelecionadoId) {
      return
    }

    const cursoIdAtual =
      cursoSelecionadoId

    let cancelado = false

    async function carregarOptativas() {
      try {
        const responseIndice =
          await fetch(
            '/data/curriculos/index.json',
          )

        if (!responseIndice.ok) {
          return
        }

        const indice: IndiceCurriculos =
          await responseIndice.json()

        const curso =
          indice.cursos.find(
            (item) =>
              item.id === cursoIdAtual,
          )

        if (
          !curso ||
          !curso.disponivel ||
          !curso.arquivo
        ) {
          if (!cancelado) {
            setCodigosOptativas(
              new Set(),
            )
          }

          return
        }

        const responseCurriculo =
          await fetch(
            `/data/curriculos/` +
            `${curso.arquivo}`,
          )

        if (!responseCurriculo.ok) {
          return
        }

        const dadosCurriculo:
          DadosCurriculoCurso =
          await responseCurriculo.json()

        if (cancelado) {
          return
        }

        const estruturaMaisRecente =
          [...dadosCurriculo.estruturas]
            .sort(
              (a, b) =>
                b.ano_criacao -
                a.ano_criacao,
            )[0]

        const optativas = new Set(
          estruturaMaisRecente
            ?.componentes
            .filter(
              (componente) =>
                componente.tipo ===
                'optativa',
            )
            .map(
              (componente) =>
                componente.codigo,
            ) ?? [],
        )

        setCodigosOptativas(
          optativas,
        )
      } catch (error) {
        console.error(error)

        if (!cancelado) {
          setCodigosOptativas(
            new Set(),
          )
        }
      }
    }

    carregarOptativas()

    return () => {
      cancelado = true
    }
  }, [
    cursoSelecionadoId,
  ])

  useEffect(() => {
    if (!dados || !cursoSelecionadoId) {
      return
    }

    const ids =
      selecionadas.map(
        gerarIdTurma,
      )

    const storageKey =
      gerarStorageKey(
        dados.periodo,
        cursoSelecionadoId,
      )

    localStorage.setItem(
      storageKey,
      JSON.stringify(ids),
    )
  }, [
    selecionadas,
    dados,
    cursoSelecionadoId,
  ])

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

  function trocarCurso(novoCursoId: string) {
    if (!dados) {
      return
    }

    const novoCurso = dados.cursos.find(
      (curso) => curso.id === novoCursoId,
    )

    if (!novoCurso) {
      return
    }

    const storageKey = gerarStorageKey(
      dados.periodo,
      novoCurso.id,
    )

    try {
      const idsSalvos = JSON.parse(
        localStorage.getItem(storageKey) ?? '[]',
      ) as string[]

      const turmasSalvas =
        novoCurso.turmas.filter((turma) =>
          idsSalvos.includes(
            gerarIdTurma(turma),
          ),
        )

      setSelecionadas(turmasSalvas)
    } catch {
      localStorage.removeItem(storageKey)
      setSelecionadas([])
    }

    setCursoSelecionadoId(novoCursoId)

    setConflitos([])
    setTurmaComConflito(null)
    setBusca('')
    setFiltro('todas')
  }

  if (erro) {
    return (
      <main className="container">
        <h1>Seu Horário - UFCA</h1>

        <p className="erro">
          {erro}
        </p>
      </main>
    )
  }

  if (!dados) {
    return (
      <main className="container">
        <h1>Seu Horário - UFCA</h1>

        <p>
          Carregando turmas...
        </p>
      </main>
    )
  }

  const cursoSelecionado: Curso | undefined =
  dados.cursos.find(
    (curso) =>
      curso.id === cursoSelecionadoId,
  )
  
  if (!cursoSelecionado) {
    return (
      <main className="container">
        <p>Nenhum curso selecionado.</p>
      </main>
    )
  }

  const termoBusca = normalizarTexto(busca)

  const turmasFiltradas = cursoSelecionado.turmas.filter((turma) => {
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
          Seu Horário - UFCA
        </h1>

          <div className="curso-selector">
            <label htmlFor="curso">
              Curso
            </label>

            <select
              id="curso"
              value={cursoSelecionadoId ?? ''}
              onChange={(event) =>
                trocarCurso(event.target.value)
              }
            >
              {dados.cursos.map((curso) => (
                <option
                  key={curso.id}
                  value={curso.id}
                >
                  {gerarRotuloCurso(
                    curso,
                    dados.cursos,
                  )}
                </option>
              ))}
            </select>
          </div>

          <Link
            className="link-curriculo"
            to={
              `/curriculo?curso=` +
              `${cursoSelecionado.id}`
            }
          >
            Ver estrutura curricular
          </Link>

        <p>
          {cursoSelecionado.nome} • {dados.periodo}
        </p>

        <strong>
          {cursoSelecionado.quantidade_turmas} turmas disponíveis
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
                  cursoSelecionado.nome,
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
                  cursoSelecionado.nome,
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
              {cursoSelecionado.turmas.length} turma(s)
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

            const optativa =
              codigosOptativas.has(
                turma.codigo,
              )

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
                    optativa
                      ? 'optativa-card'
                      : '',
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
                    <div className="turma-identificacao">
                      <span className="codigo">
                        {turma.codigo}
                      </span>

                      {optativa && (
                        <span className="badge-optativa">
                          Optativa
                        </span>
                      )}
                    </div>

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
