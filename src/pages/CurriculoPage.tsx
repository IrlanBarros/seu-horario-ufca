import {
  useEffect,
  useState,
} from 'react'
import {
  Link,
  useSearchParams,
} from 'react-router-dom'
import type {
  ComponenteCurricular,
  DadosCurriculoCurso,
  EstruturaCurricular,
  IndiceCurriculos,
} from '../types'
import '../App.css'
import './CurriculoPage.css'

function ordenarEstruturas(
  estruturas: EstruturaCurricular[],
) {
  return [...estruturas].sort(
    (a, b) =>
      b.ano_criacao - a.ano_criacao,
  )
}


function gerarRotuloEstrutura(
  estrutura: EstruturaCurricular,
  indice: number,
  estruturas: EstruturaCurricular[],
) {
  if (indice === 0) {
    return 'Mais recente'
  }

  const estruturasMesmoAno =
    estruturas.filter(
      (item) =>
        item.ano_criacao ===
        estrutura.ano_criacao,
    )

  if (estruturasMesmoAno.length > 1) {
    return (
      `${estrutura.ano_criacao} — ` +
      `${estrutura.codigo}`
    )
  }

  return String(
    estrutura.ano_criacao,
  )
}


function CurriculoPage() {
  const [searchParams] =
    useSearchParams()

  const cursoId =
    searchParams.get('curso')

  const [
    nomeCurso,
    setNomeCurso,
  ] = useState<string | null>(
    null,
  )

  const [
    dadosCurriculo,
    setDadosCurriculo,
  ] = useState<DadosCurriculoCurso | null>(
    null,
  )

  const [
    estruturaSelecionadaId,
    setEstruturaSelecionadaId,
  ] = useState<string | null>(
    null,
  )

  const [
    carregando,
    setCarregando,
  ] = useState(true)

  const [
    erro,
    setErro,
  ] = useState<string | null>(
    null,
  )

  useEffect(() => {
    if (!cursoId) {
        return
    }

    const cursoIdAtual = cursoId
    let cancelado = false

    async function carregarCurriculo() {
      setCarregando(true)
      setErro(null)

      try {
        const responseIndice =
          await fetch(
            '/data/curriculos/index.json',
          )

        if (!responseIndice.ok) {
          throw new Error(
            'Não foi possível carregar ' +
            'o índice de currículos.',
          )
        }

        const indice: IndiceCurriculos =
          await responseIndice.json()

        const curso =
          indice.cursos.find(
            (item) =>
              item.id === cursoIdAtual,
          )

        if (!curso) {
          throw new Error(
            'Curso não encontrado.',
          )
        }

        if (cancelado) {
          return
        }

        setNomeCurso(
          curso.nome,
        )

        if (
          !curso.disponivel ||
          !curso.arquivo
        ) {
          setErro(
            'Estrutura curricular ainda ' +
            'não disponível para este curso.',
          )

          return
        }

        const responseCurriculo =
          await fetch(
            `/data/curriculos/` +
            `${curso.arquivo}`,
          )

        if (!responseCurriculo.ok) {
          throw new Error(
            'Não foi possível carregar ' +
            'a estrutura curricular.',
          )
        }

        const dados:
          DadosCurriculoCurso =
          await responseCurriculo.json()

        if (cancelado) {
          return
        }

        const estruturas =
          ordenarEstruturas(
            dados.estruturas,
          )

        setDadosCurriculo(
          dados,
        )

        setEstruturaSelecionadaId(
          estruturas[0]?.id ??
          null,
        )
      } catch (error) {
        console.error(error)

        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar ' +
                'a estrutura curricular.',
          )
        }
      } finally {
        if (!cancelado) {
          setCarregando(false)
        }
      }
    }

    carregarCurriculo()

    return () => {
      cancelado = true
    }
  }, [
    cursoId,
  ])

  const estruturasOrdenadas =
    dadosCurriculo
      ? ordenarEstruturas(
          dadosCurriculo.estruturas,
        )
      : []

  const estruturaSelecionada =
    estruturasOrdenadas.find(
      (estrutura) =>
        estrutura.id ===
        estruturaSelecionadaId,
    )

  const obrigatoriasPorNivel =
    estruturaSelecionada
      ? estruturaSelecionada.componentes
          .filter(
            (componente) =>
              componente.tipo ===
              'obrigatoria',
          )
          .reduce<
            Record<
              number,
              ComponenteCurricular[]
            >
          >(
            (grupos, componente) => {
              if (
                componente.nivel === null
              ) {
                return grupos
              }

              if (
                !grupos[
                  componente.nivel
                ]
              ) {
                grupos[
                  componente.nivel
                ] = []
              }

              grupos[
                componente.nivel
              ].push(
                componente,
              )

              return grupos
            },
            {},
          )
      : {}

  const optativas =
    estruturaSelecionada
      ? estruturaSelecionada.componentes
          .filter(
            (componente) =>
              componente.tipo ===
              'optativa',
          )
      : []

if (!cursoId) {
    return (
      <main className="container curriculo-page">
        <header className="curriculo-page-header">
          <h1>
            Estrutura curricular
          </h1>

          <p>
            Seu Horário - UFCA
          </p>

          <Link to="/">
            Voltar para Meu Horário
          </Link>
        </header>

        <p className="erro">
          Nenhum curso foi informado.
        </p>
      </main>
    )
  }

  return (
    <main className="container curriculo-page">
      <header className="curriculo-page-header">
        <div>
          <span className="curriculo-page-eyebrow">
            Seu Horário - UFCA
          </span>

          <h1>
            Estrutura curricular
          </h1>

          {nomeCurso && (
            <p className="curriculo-curso-nome">
              {nomeCurso}
            </p>
          )}
        </div>

        <Link
          className="link-voltar"
          to="/"
        >
          Voltar para Meu Horário
        </Link>
      </header>

      {carregando && (
        <p>
          Carregando estrutura
          curricular...
        </p>
      )}

      {!carregando && erro && (
        <p className="erro">
          {erro}
        </p>
      )}

      {!carregando &&
        !erro &&
        estruturaSelecionada && (
        <section className="estrutura-curricular">
          <div className="estrutura-curricular-cabecalho">
            <h2>
              Estrutura curricular
            </h2>

            <div className="estrutura-selector">
              <label htmlFor="estrutura">
                Estrutura
              </label>

              <select
                id="estrutura"
                value={
                  estruturaSelecionadaId ??
                  ''
                }
                onChange={(event) =>
                  setEstruturaSelecionadaId(
                    event.target.value,
                  )
                }
              >
                {estruturasOrdenadas.map(
                  (estrutura, indice) => (
                    <option
                      key={estrutura.id}
                      value={estrutura.id}
                    >
                      {gerarRotuloEstrutura(
                        estrutura,
                        indice,
                        estruturasOrdenadas,
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <p>
              Matriz{' '}
              {estruturaSelecionada.codigo}
              {' • '}
              criada em{' '}
              {
                estruturaSelecionada
                  .ano_criacao
              }
            </p>

            <p>
              {
                estruturaSelecionada
                  .quantidade_obrigatorias
              }{' '}
              obrigatórias
              {' • '}
              {
                estruturaSelecionada
                  .quantidade_optativas
              }{' '}
              optativas
            </p>
          </div>

          <div className="niveis-curriculo">
            {Object.entries(
              obrigatoriasPorNivel,
            )
              .sort(
                ([nivelA], [nivelB]) =>
                  Number(nivelA) -
                  Number(nivelB),
              )
              .map(
                ([
                  nivel,
                  componentes,
                ]) => (
                  <div
                    className="nivel-curriculo"
                    key={nivel}
                  >
                    <h3>
                      {nivel}º período
                    </h3>

                    <div className="componentes-curriculo">
                      {componentes.map(
                        (componente) => (
                          <div
                            className="componente-curricular"
                            key={[
                              componente.codigo,
                              nivel,
                            ].join('-')}
                          >
                            <div>
                              <strong>
                                {
                                  componente
                                    .codigo
                                }
                                {' — '}
                                {
                                  componente
                                    .nome
                                }
                              </strong>

                              <span>
                                {
                                  componente
                                    .carga_horaria
                                }
                                h
                              </span>
                            </div>

                            {componente
                              .pre_requisitos_expressao && (
                              <p>
                                Pré-requisito:{' '}
                                {
                                  componente
                                    .pre_requisitos_expressao
                                }
                              </p>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
          </div>

          {optativas.length > 0 && (
            <div className="nivel-curriculo">
              <h3>
                Optativas
              </h3>

              <div className="componentes-curriculo">
                {optativas.map(
                  (componente) => (
                    <div
                      className="componente-curricular"
                      key={[
                        componente.codigo,
                        'optativa',
                      ].join('-')}
                    >
                      <div>
                        <strong>
                          {componente.codigo}
                          {' — '}
                          {componente.nome}
                        </strong>

                        <span>
                          {
                            componente
                              .carga_horaria
                          }
                          h
                        </span>
                      </div>

                      {componente
                        .pre_requisitos_expressao && (
                        <p>
                          Pré-requisito:{' '}
                          {
                            componente
                              .pre_requisitos_expressao
                          }
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default CurriculoPage
