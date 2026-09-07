# Seu Horário - UFCA

Aplicação web para auxiliar estudantes da Universidade Federal do Cariri (campus Juazeiro do Norte) na montagem do horário acadêmico e na consulta da estrutura curricular do curso.

O sistema utiliza dados disponibilizados publicamente pelo SIGAA da UFCA e permite selecionar disciplinas, visualizar a grade semanal, identificar conflitos de horário, consultar matrizes curriculares, visualizar pré-requisitos, identificar disciplinas optativas e exportar o planejamento em CSV ou PDF.

O projeto foi desenvolvido com uma arquitetura sem backend permanente, mantendo a aplicação simples, rápida e de baixo custo.

## Acesso

A aplicação está disponível em:

https://seuhorarioufca.pages.dev/

## Funcionalidades

### Montagem do horário

- Consulta automática das turmas no SIGAA da UFCA para os cursos do campus Juazeiro do Norte
- Conversão dos códigos de horário do SIGAA para dias e horários reais
- Seleção e remoção de turmas
- Detecção automática de conflitos de horário
- Bloqueio visual de turmas incompatíveis com o horário atual
- Exibição detalhada dos conflitos diretamente nos cards das disciplinas
- Identificação visual de disciplinas optativas
- Grade semanal de segunda a sexta
- Persistência do horário escolhido no navegador com `localStorage`
- Busca por código da disciplina, nome da disciplina e docente
- Filtros por todas as turmas, disponíveis, com conflito e selecionadas
- Exportação do horário em CSV
- Exportação do horário em PDF

### Estrutura curricular

- Página dedicada para consulta da estrutura curricular do curso
- Suporte a múltiplas estruturas curriculares do mesmo curso
- Seleção da matriz curricular por ano
- Identificação da estrutura mais nova como `Mais recente`
- Disciplinas obrigatórias organizadas por período
- Disciplinas optativas exibidas separadamente
- Exibição de código, nome e carga horária dos componentes
- Exibição dos pré-requisitos disponibilizados pelo SIGAA
- Suporte a expressões de pré-requisito com operadores `E` e `OU`
- Preservação da estrutura lógica dos pré-requisitos para uso futuro no frontend

### Automação e qualidade

- Atualização automática das turmas através do GitHub Actions
- Atualização automática das estruturas curriculares através do GitHub Actions
- Cache dos componentes curriculares para reduzir consultas repetidas ao SIGAA
- Reaproveitamento dos últimos dados curriculares válidos quando uma atualização falha
- Testes automatizados para o scraper, parser de horários, parser de pré-requisitos e lógica do frontend
- CI para validação de testes, lint e build

## Como funciona

A aplicação não utiliza um backend permanente.

Os dados são coletados das páginas públicas do SIGAA por scrapers escritos em Python e armazenados como arquivos JSON estáticos utilizados diretamente pelo frontend.

### Fluxo das turmas

```text
SIGAA UFCA
    |
    v
Scraper de turmas
    |
    v
Parser de horários
    |
    v
public/data/cursos-atual.json
    |
    v
React
    |
    v
Navegador do usuário
```

O scraper consulta as turmas disponíveis, converte os códigos de horário do SIGAA e gera um arquivo contendo os cursos e suas respectivas turmas.

O GitHub Actions atualiza os dados automaticamente e cria um novo commit apenas quando alguma informação realmente muda.

### Fluxo das estruturas curriculares

```text
SIGAA UFCA
    |
    v
Scraper de currículos
    |
    +--> Índice dos cursos
    |
    +--> Estruturas curriculares
    |
    +--> Componentes curriculares
    |
    +--> Pré-requisitos
    |
    v
public/data/curriculos/
    |
    +--> index.json
    |
    `--> <curso_id>.json
            |
            v
      React Router
            |
            v
      /curriculo?curso=<id>
```

Cada curso pode possuir mais de uma estrutura curricular. Essas estruturas são preservadas para permitir a consulta de matrizes antigas e atuais.

As consultas detalhadas dos componentes utilizam cache local durante a execução do scraper, evitando requisições desnecessárias ao SIGAA e permitindo retomar atualizações interrompidas com maior eficiência.

## Arquitetura

```text
seu-horario-ufca/
|
|-- .github/
|   `-- workflows/
|       |-- atualizar-curriculos.yml
|       |-- atualizar-turmas.yml
|       `-- ci.yml
|
|-- data/
|   `-- cache/
|       `-- cache-componentes.json
|
|-- public/
|   `-- data/
|       |-- cursos-atual.json
|       `-- curriculos/
|           |-- index.json
|           `-- <curso_id>.json
|
|-- scraper/
|   |-- __init__.py
|   |-- curricula.py
|   |-- requisite_parser.py
|   |-- schedule_parser.py
|   |-- scraper.py
|   `-- requirements.txt
|
|-- src/
|   |-- components/
|   |   `-- GradeSemanal.tsx
|   |
|   |-- pages/
|   |   |-- CurriculoPage.css
|   |   `-- CurriculoPage.tsx
|   |
|   |-- utils/
|   |   |-- conflitos.ts
|   |   |-- conflitos.test.ts
|   |   |-- exportarCsv.ts
|   |   `-- exportarPdf.ts
|   |
|   |-- App.tsx
|   |-- App.css
|   |-- index.css
|   |-- main.tsx
|   `-- types.ts
|
|-- tests/
|   |-- test_requisite_parser.py
|   `-- test_schedule_parser.py
|
|-- package.json
|-- package-lock.json
|-- tsconfig.json
|-- vite.config.ts
`-- README.md
```

## Tecnologias

### Frontend

- React
- React Router
- TypeScript
- Vite
- CSS
- jsPDF

### Coleta e processamento de dados

- Python
- Requests
- BeautifulSoup

### Testes

- Pytest
- Vitest

### Automação e CI

- GitHub Actions
- ESLint
- TypeScript
- Vite Build

## Interpretação dos horários do SIGAA

O SIGAA representa os horários através de códigos como:

```text
24T46
246M68
35M24
```

O projeto possui um parser responsável por transformar esses códigos em estruturas utilizáveis pelo frontend.

Por exemplo:

```text
24T46
```

é convertido para:

```text
segunda-feira: 14:00 - 16:00
quarta-feira: 14:00 - 16:00
```

Internamente:

```json
[
  {
    "dia": 2,
    "dia_nome": "segunda-feira",
    "inicio": "14:00",
    "fim": "16:00"
  },
  {
    "dia": 4,
    "dia_nome": "quarta-feira",
    "inicio": "14:00",
    "fim": "16:00"
  }
]
```

Essa representação é utilizada pela grade semanal e pelo detector de conflitos.

## Detecção de conflitos

Antes de adicionar uma turma, seus intervalos de horário são comparados com todas as turmas já selecionadas.

Por exemplo:

```text
Disciplina A
08:00 - 10:00

Disciplina B
09:00 - 11:00
```

Resultado:

```text
Conflito: 09:00 - 10:00
```

A turma incompatível passa a ser marcada visualmente e não pode ser adicionada enquanto o conflito existir.

Horários consecutivos não são considerados conflito:

```text
08:00 - 10:00
10:00 - 12:00
```

## Estruturas curriculares

A página de estrutura curricular é acessada a partir do curso selecionado na página principal.

A navegação utiliza uma rota no formato:

```text
/curriculo?curso=<id_do_curso>
```

A página carrega o índice de currículos e, em seguida, o arquivo correspondente ao curso selecionado.

Quando um curso possui múltiplas estruturas curriculares, a mais nova é selecionada por padrão e apresentada como:

```text
Mais recente
```

As estruturas anteriores são identificadas pelo ano de criação.

Cada estrutura pode conter:

- disciplinas obrigatórias;
- disciplinas optativas;
- período ou nível recomendado;
- carga horária;
- pré-requisitos;
- co-requisitos;
- equivalências.

No momento, o frontend apresenta principalmente a organização por período, as optativas e os pré-requisitos.

## Pré-requisitos

Os pré-requisitos são coletados das páginas públicas de detalhes dos componentes curriculares.

Expressões simples e compostas são preservadas.

Exemplo:

```text
( CAR0012 ) E ( ECI0025 OU ECI0097 )
```

Internamente, a expressão também pode ser representada de forma estruturada:

```json
{
  "operador": "E",
  "esquerda": {
    "codigo": "CAR0012"
  },
  "direita": {
    "operador": "OU",
    "esquerda": {
      "codigo": "ECI0025"
    },
    "direita": {
      "codigo": "ECI0097"
    }
  }
}
```

Essa representação permite que, futuramente, o sistema avalie automaticamente se o estudante atende aos requisitos necessários para cursar uma disciplina.

## Identificação de disciplinas optativas

Na página principal, as turmas correspondentes a componentes optativos são identificadas visualmente nos cards.

Para isso, o frontend consulta a estrutura curricular mais recente do curso selecionado e compara o código das turmas ofertadas com os componentes classificados como optativos.

Essa identificação é apenas informativa e não altera a lógica de seleção ou de conflitos.

## Persistência local

As disciplinas selecionadas são armazenadas no `localStorage` do navegador.

Isso significa que o usuário pode atualizar ou fechar a página sem perder o horário montado.

As seleções são armazenadas separadamente por período acadêmico e por curso.

Nenhuma informação do estudante é enviada ou armazenada em um servidor.

## Atualização automática das turmas

O workflow:

```text
.github/workflows/atualizar-turmas.yml
```

é responsável por:

1. configurar o ambiente Python;
2. instalar as dependências;
3. executar os testes;
4. consultar o SIGAA;
5. gerar os dados atualizados;
6. verificar se houve alguma alteração real;
7. criar um commit automaticamente quando necessário.

Caso os dados permaneçam iguais, nenhum novo commit é criado.

O workflow também pode ser executado manualmente pela interface do GitHub Actions.

## Atualização automática das estruturas curriculares

O workflow:

```text
.github/workflows/atualizar-curriculos.yml
```

atualiza periodicamente as estruturas curriculares extraídas do SIGAA.

A execução automática ocorre uma vez por mês.

O processo:

1. configura o ambiente Python;
2. restaura o cache de componentes quando disponível;
3. instala as dependências;
4. executa os testes;
5. consulta as estruturas curriculares;
6. consulta os detalhes dos componentes necessários;
7. atualiza os arquivos em `public/data/curriculos/`;
8. cria um commit apenas quando os dados públicos realmente mudam.

Se a atualização de um curso falhar e já existir uma versão válida salva anteriormente, o sistema mantém os últimos dados disponíveis.

## Integração contínua

O projeto possui um workflow de CI executado em pushes e Pull Requests para a branch `main`.

As verificações incluem:

### Python

```bash
python -m pytest -v
```

### Frontend

```bash
npm test
npm run lint
npm run build
```

O objetivo é impedir que alterações que quebrem os parsers, a lógica de conflitos, o TypeScript ou o build da aplicação sejam incorporadas sem serem detectadas.

## Executando localmente

### Pré-requisitos

Recomenda-se possuir:

```text
Python 3.12+
Node.js 22+
npm
Git
```

### Clone o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd seu-horario-ufca
```

### Configure o ambiente Python

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r scraper/requirements.txt
```

### Execute os testes Python

```bash
python -m pytest -v
```

### Atualize os dados das turmas

```bash
python -m scraper.scraper
```

Os dados das turmas serão gerados em:

```text
public/data/cursos-atual.json
```

### Atualize as estruturas curriculares

```bash
python -m scraper.curricula
```

Os dados serão gerados em:

```text
public/data/curriculos/
```

### Instale as dependências do frontend

```bash
npm install
```

### Execute os testes do frontend

```bash
npm test
```

### Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

O Vite exibirá no terminal o endereço local da aplicação, normalmente:

```text
http://localhost:5173
```

A página principal ficará disponível em:

```text
/
```

e as estruturas curriculares em:

```text
/curriculo?curso=<id_do_curso>
```

## Build de produção

Para gerar uma versão otimizada:

```bash
npm run build
```

Os arquivos serão gerados no diretório:

```text
dist/
```

Para validar o código:

```bash
npm run lint
```

## Exportação

### CSV

A exportação CSV contém informações como:

```text
Código
Disciplina
Turma
Docente
Dia
Horário inicial
Horário final
Código de horário do SIGAA
```

O arquivo utiliza codificação UTF-8 e pode ser aberto em ferramentas como LibreOffice Calc e Microsoft Excel.

### PDF

O PDF é gerado diretamente no navegador e contém:

- período acadêmico;
- grade semanal;
- disciplinas selecionadas;
- turma;
- docente;
- horário.

A grade é desenhada diretamente no documento, evitando depender de capturas de tela da interface.

## Privacidade

O projeto não possui sistema de autenticação e não coleta dados pessoais dos estudantes.

As escolhas realizadas pelo usuário permanecem armazenadas apenas no navegador através do `localStorage`.

## Fonte dos dados

As informações de estruturas curriculares, componentes, turmas, docentes, vagas e horários são obtidas a partir das páginas públicas do SIGAA da Universidade Federal do Cariri.

Este projeto não possui vínculo oficial com a UFCA.

Os dados exibidos dependem das informações disponibilizadas pela instituição no SIGAA e podem sofrer alterações.

Para decisões acadêmicas oficiais, consulte sempre os sistemas e canais institucionais da UFCA.

## Status do projeto

O projeto possui atualmente uma versão funcional com:

- coleta automática das turmas;
- montagem do horário;
- detecção de conflitos;
- persistência local;
- busca e filtros;
- exportação em CSV e PDF;
- consulta de estruturas curriculares;
- suporte a múltiplas matrizes;
- exibição de pré-requisitos;
- identificação visual de disciplinas optativas;
- atualização automatizada dos dados.

Entre as possíveis evoluções futuras estão:

- uso do histórico acadêmico para identificar disciplinas concluídas;
- avaliação automática de pré-requisitos;
- indicação de quais disciplinas o estudante pode cursar;
- geração automática de combinações de horários;
- priorização de horários com menos janelas;
- preferência por determinados dias ou turnos;
- melhorias de acessibilidade;
- otimizações para dispositivos móveis.

## Autor

Desenvolvido por **Irlan Barros**.

Transformando café em código e conflitos de horário em problema resolvido.
