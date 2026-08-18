# Lorepsum — Direção de Design

> Documento **vivo** — referência das decisões de design da interface. Atualizar conforme a gente refina.
> Última revisão: 2026-08-18.

---

## Mockups (índice visual)

Todos em `docs/design/` — abrir no navegador.

| Mockup | O que é |
|---|---|
| [home-landing.html](./home-landing.html) | **Tela inicial** — constelação ambiente + estrela roxa pulsante + log in. Theme-aware (claro/escuro). |
| [home-chat.html](./home-chat.html) | **Onboarding conversacional** (protótipo interativo) — clica na estrela → desce pro chat (moldura + "digitando…") → responde → a constelação nasce ao lado. Fluxo **DEFINIDO**. |
| [design-mockup.html](./design-mockup.html) | **Telas do app** — Constelação (grafo) + Foco (detalhe da entidade). |
| [brand-logo.html](./brand-logo.html) | **Símbolo** (logomark) — o nó-eu irradiando conexões. |
| [brand-wordmark.html](./brand-wordmark.html) | **Wordmark** — `lorepsum.` em IBM Plex Mono, ponto roxo. |

---

## 1. Princípio guia (a alma)

O valor do Lorepsum não é *guardar* coisas (isso é app de notas / catálogo) — é **explorar as CONEXÕES** da sua lore. A interface tem que fazer a pessoa sentir que está **vagando pela própria identidade**, puxando fios, descobrindo links inesperados.

- **O herói é o GRAFO e o ATO de explorar** — não formulário, não lista.
- **Forma segue função:** cada decisão visual serve a navegação/descoberta, não é enfeite.
- O loop central é **focar & pular**: entra numa entidade, lê, salta pra uma conectada.

---

## 2. Telas

1. **Constelação (início):** o grafo em si — entidades como nós, conexões como linhas. Um mapa vivo que se navega (pan/zoom, seguir arestas). Nó-eu (`você`) por perto do centro.
2. **Foco (detalhe da entidade):** clicou num nó → ele vem pro centro e abre a "etiqueta de museu": **capa**, tipo, nome, atributos, e as **conexões como links** ("dirigido por → Christopher Nolan"). Daqui se **pula** pro vizinho.
3. **Captura (adicionar / conectar):** leve, tipo barra de comando / quick-add — não uma página de formulário gigante. *(fluxo de conectar duas entidades ainda a desenhar.)*
4. **Busca (⌘K):** teleporte rápido pra qualquer entidade (command palette). *(a detalhar.)*

## 3. Fluxos principais

- **Vagar:** cair no grafo (centrado no nó-eu), seguir arestas, descobrir caminhos.
- **Focar & pular:** entrar numa entidade → ler → saltar por uma conexão. O coração.
- **Capturar & conectar:** adicionar algo e já **amarrar** no que existe, inline.

---

## 4. Identidade visual (decisões travadas até aqui)

- **Modo:** **claro (papel) é o PADRÃO**; **escuro (noite) é alternância**. Mesmo desenho nos dois — a troca é só **swap de paleta** (estrutura, tipografia e layout não mudam).
- **Tipografia:**
  - **Fraunces** (serif editorial) → nomes de entidade, títulos, "voz".
  - **IBM Plex Mono** → rótulos, metadados, chrome de UI.
  - Sensação de **etiqueta de museu / livro bem feito**, não painel SaaS.
- **Cor — roxo empoeirado é o PRIMÁRIO, e é RESERVADO:**
  - Usado só em: **conexão forte** (weight alto), ponto do wordmark, **hover de link**.
  - **NÃO** usar como enfeite espalhado. Um acento só.
  - Regra de ouro: **cor = significado; forma/ícone = tipo.**
- **Nós do grafo:** **moldura de tamanho fixo** (o ícone tem espaço próprio, independente da forma) + **ícone por tipo**. Monocromáticos (o tipo vem pela forma, não pela cor).
  - Vocabulário de ícones: **livro · filme · pessoa · lugar · memória** (expansível).
  - O mapa `tipo → ícone` é **decisão de APRESENTAÇÃO**, derivada do `kind` estrutural — o banco não sabe de ícone (princípio: *tipo é estrutura, estilo é apresentação*).
- **Nó-eu (`você`):** **caixa sólida INVERTIDA** (preenchida com a cor de tinta: preto no claro, branco no escuro). Distinguido por **inversão**, NÃO por roxo.
- **Mídia / capa:** rica só na tela de **Foco** (slot de capa ao lado do nome). Nós ficam com **ícone**, não miniatura — **calma > riqueza** (miniatura em todo nó poluiria o canvas, e nem toda entidade tem imagem). No dado, a capa é um **atributo/satélite** da entidade (liga com a pergunta aberta "foto × entidade").
- **Restrição geral:** sem gradiente, sem sombra, sem cartão empilhado, muito respiro. Fugir da "cara de template gerado por AI".

### Paleta (hex de referência)

| Papel (claro — padrão) | | Noite (escuro — alternância) | |
|---|---|---|---|
| mesa (fundo externo) | `#e6dfce` | mesa | `#080706` |
| canvas (tela) | `#f6f2e9` | canvas | `#0e0d0c` |
| tinta (texto) | `#26231d` | tinta | `#ece7dd` |
| apagado (muted) | `#8a8072` | apagado | `#8b857a` |
| linha fina | `#d7cebc` | linha fina | `#332f29` |
| **acento (roxo)** | `#6b4e96` (ameixa) | **acento (roxo)** | `#ad8bd4` (lavanda) |

Fontes: `Fraunces` (serif) · `IBM Plex Mono` (mono) — via Google Fonts.

### Marca — símbolo + wordmark (FECHADA 2026-08-13)

- **Símbolo (logomark):** o "**nó-eu no centro**" — um nó central **sólido** (cor de tinta, que **inverte por modo**: preto no claro, branco no escuro) irradiando **4 conexões** a nós menores, com **uma aresta em roxo** (a conexão forte). Mesmo mark serve favicon / ícone de app. Coerente com o nó-eu das telas. Ref.: [`docs/brand-logo.html`](./brand-logo.html).
- **Wordmark (logotipo):** `lorepsum.` em **IBM Plex Mono, peso 500, minúsculo, tracking apertado (~-0.02em)**, com **ponto roxo** final. O ponto usa o acento (ameixa `#6b4e96` no claro, lavanda `#ad8bd4` no escuro). Ref.: [`docs/brand-wordmark.html`](./brand-wordmark.html).
- **Lockup:** símbolo + wordmark lado a lado (símbolo ≈ altura da caixa do texto).

---

## ✨ IDEIA GUARDADA (2026-08-17) — Home com AGENTE DE IA (funil de entrada)

**Conceito (dela):** na home, um **agente de IA** pergunta ao usuário algo que ele ama (filme / livro / personagem / qualquer coisa). Com a resposta, o app **semeia uma "lore"** — cria entidades relacionadas + conexões automaticamente. Resolve o **cold-start** (grafo vazio não tem o que explorar).

**Por que encaixa:** é a alma do Lorepsum ("uma lore a partir do que você ama") **E** é a versão **conversacional com IA** da camada já decidida **"perfil = funil de entrada"** (catálogo de perguntas que cria/liga entities).

**Como funcionaria:** resposta → o **backend** chama um **LLM** (Claude, API Anthropic) que devolve **JSON estruturado** (entidades + relacionamentos no formato modelado) → o backend **cria via os endpoints CRUD** que ela construiu → constelação semeada. O "**simular**" pode ser a **animação** dos nós surgindo.

**Regra arquitetural (crítica):** a chamada do LLM fica **NO BACKEND** — a chave da API é **segredo** (`.env`, igual a senha do banco), NUNCA no frontend. A saída do LLM é **estruturada** (JSON), validada com Pydantic.

**Público-alvo = VISITANTE não cadastrado** (atrair sem invadir). Padrão **"valor primeiro, pedido depois"** (show-before-ask): entrega a lore ANTES de pedir cadastro. Fluxo (ordem invertida de propósito):
1. Pergunta o **gosto** primeiro (isca de baixa fricção — parece jogo, não formulário).
2. Gera + mostra a lore (o "wow").
3. Pergunta o **nome** depois (a pessoa já está investida) — e o nome **nomeia o NÓ-EU** (o self, centro da constelação; o gosto irradia a partir dela). Onboarding constrói o nó-eu + semeia o grafo numa tacada.
4. CTA natural: **"quer guardar essa lore?"** → cadastro "sem perceber" (ela não quer perder o que criou).

**Resolve o persistir×degustação:** pro visitante é **degustação que vira REAL no cadastro** ("reivindique sua lore"). Implicação: a lore nasce **anônima** (sessão) e é **"reivindicada"** (amarrada à conta) no cadastro → projetar o **auth** (adiado) pra suportar esse *claim*.

**FLUXO DE TELAS (UI) — refinado 2026-08-17** (mockups: `docs/home-landing.html`, `docs/home-chat.html`):
- **(0) Landing** — constelação **ambiente** (fraca, sem rótulo, só atmosfera) + frase editorial ("your lore" / "Everything you love, connected in a constellation") + **estrela roxa PULSANTE** (o convite **sem palavras** — não descreve o que faz) + **"log in"** (ghost pill) no canto sup. dir. pra quem já tem conta. **Theme-aware** (claro padrão / escuro). Minimalista, delicado.
- **(1) clica na estrela** → a **página DESCE** numa animação → 
- **(2) Chat SÓ conversa** — **SEM a constelação ainda**. É uma **moldura/card** (cabeçalho: símbolo + `lorepsum` + status `typing…`), **centralizado**. As falas do agente **entram uma a uma, com indicador "digitando…"** (três pontinhos) e **começam sozinhas** ao chegar no chat — parece IA conversando, não um form. 1ª pergunta casual ("hey." → "tell me about something you love…").
- **(3) usuário responde** → o card **desliza pra um lado** e a **constelação nasce do OUTRO lado** (lado a lado em tela larga; empilhado — constelação em cima — em tela estreita). A surpresa **nasce da resposta**, não é pré-mostrada. O agente comenta ("oh — Interstellar. there it is →") e segue ("and you — who are you?" → nomeia o **nó-eu**).
- **Detalhes técnicos do protótipo:** streaming via `setTimeout` (typing → mensagem); bloom via classe `.born` no SVG (arestas com `stroke-dashoffset`, nós com `scale`+`opacity`, `transition-delay` escalonado); card via classe `.bloomed` (anima `left`/`transform`); tema claro/escuro por `data-theme`. **No app real vira React/TS** (estado do passo, componentes) — o HTML é só a referência visual/comportamental.
- **"log in" (canto)** é literal-ok (quem volta sabe o que quer); o "sem literalidade" vale pro NOVATO. Quem já está logado idealmente nem vê a landing (cai na lore) — toca o auth (adiado).

**A decidir ainda:** **dedup / find-or-create** — não duplicar "Nolan" se já existe (o mesmo find-or-create previsto no funil).

---

## 5. Em aberto / a decidir

- **Ordem de construção (fork):** **A)** grafo visual como centro desde já (ambicioso, precisa de lib de layout) × **B)** exploração por **links** primeiro (a tela de Foco já entrega o "focar & pular"), e a constelação visual como vitrine depois. **Recomendação: B primeiro** (de dentro pra fora + YAGNI + curva de aprendizado). **NÃO decidido.**
- **Fluxo de conectar duas entidades** (criar uma aresta pela UI) — a desenhar.
- **Busca ⌘K** — a detalhar.
- **Modelo de dados da capa** (atributo direto × satélite de mídia).
- **Posicionamento dos nós:** no app real vem de um **algoritmo de layout** (force-directed) da lib de grafo — não é colocado na mão. O mock estático não representa o espaçamento final.
- Refinamentos visuais contínuos ("vamos aperfeiçoando").

---

## 6. Notas de implementação (quando construir)

- Tudo isso é **frontend** (`frontend/`, React + TS + Tailwind). O React que falta (integração com a API, rotas) se aprende **em contexto** ao construir estas telas.
- A capa/mídia exige decidir upload/armazenamento (pendente).
- O grafo visual (caminho A) provavelmente pede uma **lib** (ex.: força-dirigida) — avaliar quando chegar a hora.
