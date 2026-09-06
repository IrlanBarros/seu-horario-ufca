# Seu Horário - UFCA

Aplicação web para auxiliar estudantes da Universidade Federal do Cariri (campus Juazeiro do Norte) na montagem do horário acadêmico.

O sistema utiliza as turmas disponibilizadas publicamente pelo SIGAA da UFCA e permite selecionar disciplinas, visualizar a grade semanal, identificar conflitos de horário e exportar o planejamento em CSV ou PDF.

O projeto foi desenvolvido com uma arquitetura sem backend permanente, mantendo a aplicação simples, rápida e de baixo custo.

## Acesso

A aplicação está disponível em:

https://seuhorarioufca.pages.dev/

## Funcionalidades

- Consulta automática das turmas no SIGAA da UFCA (todos os cursos do campus Juazeiro do Norte)
- Conversão dos códigos de horário do SIGAA para dias e horários reais
- Seleção e remoção de turmas
- Detecção automática de conflitos de horário
- Bloqueio visual de turmas incompatíveis com o horário atual
- Exibição detalhada dos conflitos diretamente nos cards das disciplinas
- Grade semanal de segunda a sexta
- Persistência do horário escolhido no navegador com `localStorage`
- Busca por:
  - código da disciplina
  - nome da disciplina
  - docente
- Filtros por:
  - todas as turmas
  - disponíveis
  - com conflito
  - selecionadas
- Exportação do horário em CSV
- Exportação do horário em PDF
- Atualização automática das turmas através do GitHub Actions
- Testes automatizados para o scraper e para a lógica do frontend
- CI para validação de testes, lint e build

## Como funciona

A aplicação não utiliza um backend permanente.

Os dados das turmas são coletados periodicamente da consulta pública do SIGAA através de um scraper escrito em Python.

O fluxo principal é:

```text
SIGAA UFCA
    |
    v
Scraper Python
    |
    v
Parser de horários
    |
    v
public/data/<periodo>.json
    |
    v
React
    |
    v
Navegador do usuário
```

O GitHub Actions executa o scraper automaticamente e atualiza o arquivo JSON apenas quando alguma informação das turmas realmente muda.

Isso permite que o frontend permaneça completamente estático.

## Arquitetura

```text
seu-horario-ufca/
|
|-- .github/
|   `-- workflows/
|       |-- atualizar-turmas.yml
|       `-- ci.yml
|
|-- public/
|   `-- data/
|       `-- atual.json
|
|-- scraper/
|   |-- __init__.py
|   |-- scraper.py
|   |-- schedule_parser.py
|   `-- requirements.txt
|
|-- src/
|   |-- components/
|   |   `-- GradeSemanal.tsx
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

## Persistência local

As disciplinas selecionadas são armazenadas no `localStorage` do navegador.

Isso significa que o usuário pode atualizar ou fechar a página sem perder o horário montado.

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

O objetivo é impedir que alterações que quebrem o parser, a lógica de conflitos, o TypeScript ou o build da aplicação sejam incorporadas sem serem detectadas.

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

### Atualize os dados do SIGAA

```bash
python -m scraper.scraper
```

Os dados serão gerados em:

```text
public/data/atual.json
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

As informações de componentes curriculares, turmas, docentes, vagas e horários são obtidas a partir das páginas públicas do SIGAA da Universidade Federal do Cariri.

Este projeto não possui vínculo oficial com a UFCA.

Os dados exibidos dependem das informações disponibilizadas pela instituição no SIGAA e podem sofrer alterações.

Para decisões acadêmicas oficiais, consulte sempre os sistemas e canais institucionais da UFCA.

## Status do projeto

O projeto possui atualmente um MVP funcional, incluindo coleta automática de dados, montagem do horário, detecção de conflitos, persistência local, busca, filtros e exportação.

Entre as possíveis evoluções futuras estão:

- suporte automático a novos períodos acadêmicos;
- geração automática de combinações de horários;
- priorização de horários com menos janelas;
- preferência por determinados dias ou turnos;
- melhorias de acessibilidade;
- otimizações para dispositivos móveis.

## Autor

Desenvolvido por **Irlan Barros**.

Transformando café em código e conflitos de horário em problema resolvido.
