# 🧠 Lorepsum

> Uma base de conhecimento pessoal em forma de **grafo**: a *lore* de uma pessoa, montada a partir do que ela **gosta, consome e viveu**.

Uma mistura de **Obsidian + Wikipedia + Letterboxd + Goodreads + Knowledge Graph**. A ideia central é simples e poderosa:

> **Tudo é uma entidade, e tudo pode se conectar.**

Batman é uma entidade. Robin é uma entidade. Uma nota pessoal, um filme, um autor, um lugar, uma memória — tudo é entidade, e o valor está nas **conexões** entre elas.

## O que é (e o que não é)

- **É:** um grafo de identidade pessoal, focado em **navegação e descoberta de conexões**.
- **Não é:** rede social, nem uma simples biblioteca/lista de mídias.

O banco guarda apenas a **ligação**; o **significado** (o rótulo "mentor de", a cor de uma aresta, o verbo "li/vi") é responsabilidade da camada de apresentação.

## Os 4 mecanismos

- **entity** — um nó do grafo (qualquer coisa nomeável).
- **relationship** — uma aresta direcionada entre entities, com um rótulo livre.
- **attribute** — um dado que descreve uma entity (colunas fixas + uma "gaveta" flexível em JSONB).
- **memória reificada** — quando uma relação fica rica (data, participantes, mídias), ela vira uma entity própria (um `Event`).

## Stack

- **Backend:** Python · FastAPI · SQLAlchemy · Alembic · PostgreSQL
- **Frontend:** React · TypeScript · Vite · TailwindCSS
- **Infra:** Git/GitHub · e um **servidor caseiro** (ver abaixo 👇)

## 🔋 → 🖥️ Servidor no celular

O banco do Lorepsum roda num **celular Android reaproveitado** — transformado em servidor Linux, acessível de qualquer lugar via **Tailscale**. Soberania, custo quase zero e infraestrutura própria. Serve para **qualquer aparelho suportado** pelo postmarketOS (no meu caso, um POCO F3). O passo a passo está em **[docs/servidor-no-celular.md](docs/servidor-no-celular.md)**.

## Estrutura

```
lorepsum/
├── backend/              # API (FastAPI + SQLAlchemy)
│   └── app/
│       ├── main.py       # a aplicação FastAPI
│       ├── database.py   # conexão com o banco + Base do ORM
│       ├── models.py     # tabelas: entity_type, entity, relationship
│       └── schemas.py    # formatos da API (Pydantic)
├── frontend/             # interface (React + TypeScript + Vite)
├── docs/                 # documentação (ex.: servidor no celular)
└── README.md
```

## Como rodar (desenvolvimento)

**Backend** (requer Python 3.10+ e PostgreSQL):
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://127.0.0.1:8000  ·  docs interativas em /docs
```

**Frontend** (requer Node.js):
```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

> A camada de banco (conexão + criação das tabelas via **Alembic**) precisa de um PostgreSQL e de um arquivo `.env` com a *connection string*.

## Status

Projeto **pessoal e em construção**, tocado também como uma jornada de aprendizado de engenharia de software (modelagem, arquitetura, backend, frontend, infra).

- ✅ **Modelos** (SQLAlchemy) e **schemas** (Pydantic) da Fase 1 — `entity_type`, `entity`, `relationship`.
- ✅ **API no ar** — endpoint inicial + documentação Swagger.
- 🔜 **Camada de banco** — conexão, migrations (Alembic) e endpoints CRUD.
- 🔜 **Frontend** — em setup; depois, telas e **visualização em grafo**.
- 🔜 **Servidor no celular** — bootloader desbloqueado; Linux a instalar.

---

*Lorepsum é um projeto pessoal, feito com carinho e curiosidade.* ✨
