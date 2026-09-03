# Lorepsum — Roadmap

> **Princípio: fundação antes de feature.** Uma ideia só sai do backlog quando a **fundação que ela exige** já existe. Isso evita construir o telhado antes da parede.
>
> **Fundação** = tem que existir pro Lorepsum *ser* Lorepsum (entidades, conexões, navegação).
> **Feature** = enriquece, mas depende da fundação (busca, notas, descoberta indireta, grafo visual…).
>
> Documento vivo. A sequência longa (fases 1–9) está espelhada da visão em [[lorepsum-projeto]].

---

## ✅ Feito

- **Backend (núcleo):** modelos `EntityType` · `Entity` · `Relationship` (FK/cascade, weight, constraints) + schemas Pydantic + **CRUD completo**, rodando contra o **servidor soberano** (Postgres no celular via Tailscale).
- **Backend (organização):** endpoints separados em **routers por recurso** (`app/routers/`).
- ~~**Frontend (pele de aprendizado):** CRUD de entidades integrado na API~~ — **removido em 2026-09-02**, volta como feature desenhada (ver ⏭️ Próximo).
- **Frontend — conexões (núcleo):** criar `relationship` pela UI + exibir a conexão no card da entidade. **Testado end-to-end.** 🌟
- **Frontend — tela de FOCO:** o **"focar & pular"** está vivo — entidade no centro, conexões de saída como links que navegam. Vestida no sistema de design (paleta papel, Fraunces + IBM Plex Mono, claro/escuro), responsiva, com componentes extraídos (`ThemeToggle`, `Logo`, `Search`).
- **Frontend — busca:** filtra entidades por nome e navega no clique.
- **B2 — imagens (FECHADO 2026-08-25):** tabela `entity_image` com índice único parcial (no máx. 1 capa por entidade) · **upload** multipart com validação de tipo (415) e tamanho (413), nome sorteado (UUID) e arquivos em `backend/media/` · pasta servida por `StaticFiles` · **capa no Foco** com moldura fixa e fallback da marca · **prévia da galeria** (5 miniaturas, contagem e `+N`) · e os dois `DELETE` (imagem e entidade `?hard=true`) **apagando o arquivo do disco** junto com a linha.
- **Backend:** `GET /entities/{id}/relationships` — o Foco não baixa mais o grafo inteiro pra mostrar 3 conexões.
- **Painel de leitura refeito (2026-09-02):** dois painéis lado a lado sem rolagem de página · serifa pro conteúdo e mono pra etiqueta · conexão em duas colunas (`label` à direita, nome à esquerda) · **conexões agrupadas pelo tipo do destino**, fechadas por padrão, com `expand all` e barra de rolagem fina no roxo. Decisões em `design.md`.
- **Backend:** `/relationships` e `/entities/{id}/relationships` **não devolvem mais conexões de entidades arquivadas** — os dois endpoints discordavam sobre quem existe, e o grafo quebrava com `node not found`.
- **Acervo de teste:** 117 entidades e 218 relações do universo DC (6 tipos), semeadas pela API.
- **Estado vazio das conexões:** entidade sem nenhuma conexão de saída mostra "there are no connections yet." — e o `expand all` some, porque botão que não tem o que expandir não deve existir.
- **Glosa na aresta (2026-09-02):** coluna `gloss` em `relationship` (opcional) + schemas + o front escolhendo `arrivalGloss ?? entity.description`. As três portas que trocam o foco — lista de conexões, nó da constelação e busca — respondem cada uma sobre a chegada. Decisões em `design.md`.
- **`types.ts` honesto:** `label`, `gloss` e as duas `description` passaram a `string | null`, como os schemas do backend sempre disseram. O TypeScript voltou a proteger o que devia.
- **Infra:** servidor soberano (postmarketOS + Postgres 18 + Tailscale), reboot-proof.
- **Design:** marca (símbolo, wordmark, paleta, fontes) + **landing** + **fluxo de onboarding conversacional** DEFINIDOS (`docs/design/`).

## 🔨 Agora — Constelação (o grafo)

**Desenho aprovado** em [`docs/design/constellation-mockup.html`](docs/design/constellation-mockup.html) (decisões em `design.md`, bloco 2026-08-26).

- ✅ **Passo 1 — o desenho.** Tudo em SVG dentro do `Focus.tsx`: nó focado no centro com o **pulso da home**, vizinhos em bolinhas menores distribuídas num círculo (geometria própria, sem lib), arestas roxas suaves, **nome** no anel 1 (do lado de fora, nunca sobre a aresta), **hover** acendendo bolinha e aresta, e clique refocando.
- ✅ **Passo 2 — janela interativa.** Arrastar (com `onPointer*`, então já funciona no toque) e **zoom** (roda do mouse, travado entre 0,4 e 2,5). O zoom precisou de `useRef` + `addEventListener(..., { passive: false })` pra poder cancelar a rolagem da página — o `onWheel` do React é passivo e não deixa.
- ✅ **Passo 3 — o grafo inteiro** *(2026-09-01, decisões em `design.md`)*. O front busca `/entities` e `/relationships` **uma vez** e entrega tudo pro **d3-force** (`forceManyBody(-300)` + `forceLink(90)` + `forceCenter`), rodado de uma vez só com `stop()` + `tick(300)`. Os anéis morreram junto com a profundidade: desenha-se tudo, e a hierarquia é **foco · vizinhos · resto**. Clicar recentra a câmera com deslize, e as trocas de cor/tamanho amaciam com `transition`.
- ✅ **Passo 4 — layout** *(2026-09-02)*. Constelação e Foco lado a lado, página sem rolagem: `h-screen` + `flex-col`, a linha dos painéis com `flex-1 min-h-0` e o painel do Foco rolando por dentro. A Constelação passou a **medir a própria caixa** (`ResizeObserver`) em vez de assumir 400×400, e o grafo se recentra sozinho quando a janela muda.

**Falta pra fechar a Constelação:** rótulo da aresta no hover e botão de recentrar.

## ⏭️ Próximo (fundação que falta)

- **CRUD do zero, sobre design novo.** O `App.tsx` (a "pele de aprendizado": lista, cria, edita e deleta entidades) **foi removido** em 2026-09-02 — não era mais renderizado, e continuava sendo compilado e quebrando por mudanças alheias. Criar, editar e apagar entidades e conexões volta como **feature desenhada**, não como formulário de teste. A mecânica antiga (`POST`/`PATCH`/`DELETE` do front, formulário controlado) fica recuperável em `git show <commit>:frontend/src/App.tsx`.
- **Validação de `weight` na borda (Pydantic) + erros mais honestos no `create_relationship`** — hoje `weight: 0` viola o CHECK do banco e vira **409 "invalid link."**, a mesma mensagem usada pra FK inválida, `source == target` e duplicada. A faixa 1–3 devia ser recusada pelo schema (**422**, apontando o campo), e o 409 ficar só pro caso de conflito de verdade.

## 🌱 Depois (features — cada uma espera sua fundação)

- **`lore` — o recorte** *(desenho fechado 2026-09-02, `design.md`)*. Tabela `lore` + ligação `entity_lore` (uma entidade pode estar em várias). A **grade** para ver o acervo inteiro, e a **travessia** entre lores: nó de fora em `--color-beyond`, brilho proporcional ao tamanho da lore vizinha, e o clique dissolvendo o mundo em volta de uma âncora parada. Depende de auth para fazer sentido pleno (várias lores por usuário), mas a grade e a tabela de ligação já se pagam antes disso.
- **Rótulo da aresta no hover** — mostrar o `label` da relação ao passar o mouse sobre a linha. Decidido em `design.md` (2026-08-26 parte 2), único lugar do grafo onde o texto livre da conexão aparece.
- **Conexões de entrada no Foco** — hoje só as de saída aparecem (decisão de 2026-08-21). É essa mudança que reabre a questão dos **dois sentidos** da descrição de aresta.
- **Botão de recentrar** ("voltar pro foco") — hoje, depois de arrastar longe, só clicando num nó ou recarregando.
- **Home / onboarding em React** — a landing + fluxo conversacional (casca externa). **Design pronto** em `docs/design/`; retomar quando o núcleo tiver **onde deixar** o usuário.
- **⌘K na busca** (teleporte por atalho de teclado — a busca em si já existe).
- **Passada de semântica e acessibilidade no `Focus`** *(adiada por ela em 2026-08-25 — nada quebra hoje)*: `<header>`/`<main>`/`<section>` no lugar de `div` genérica, hierarquia de títulos (o `<h2>` do tipo vem antes do `<h1>` do nome, e ele é rótulo, não título), e os links de conexão viram `<button>` — hoje são `<a>` **sem `href`**, que não recebem foco nem respondem ao teclado.
- **Onboarding com IA de verdade** (LLM no backend semeia a lore a partir da 1ª resposta) — hoje é simulado no mockup.
- **Consumo / notas / memórias reificadas** (fase 4).
- **Descoberta indireta** (caminhos entre entidades — fase 5).
- **Coleções / timeline** (fase 7).
- **Auth + "reivindicar a lore" no cadastro + deploy** (fase 9).

## 🐘 Quando o acervo crescer

> Otimizações que hoje seriam trabalho sem problema correspondente.

- **`GET /entities/{id}/neighborhood?depth=`** — evita baixar o grafo inteiro pra desenhar 25 nós. Enquanto o acervo é pequeno, `/entities` + `/relationships` resolvem, e a profundidade é calculada no front.

## 🔒 Quando houver usuários que eu não conheço

> Guardas que hoje seriam desperdício (o "inimigo" é engano meu, não má-fé alheia), mas que passam a ser obrigatórios no dia do deploy público.

- **Validar imagem pela assinatura do arquivo** (*magic bytes*) — ler os primeiros bytes e conferir o carimbo do formato (`FF D8 FF` = JPEG, `%PDF` = PDF), em vez de confiar no `content_type`, que quem envia **declara** e portanto pode forjar. Lembrar do `seek(0)` depois de espiar, senão o arquivo é gravado sem o próprio cabeçalho. Provavelmente via biblioteca (a `Pillow` **abre** a imagem — se abre, é imagem de verdade, não só um cabeçalho falsificado).
- **Barrar arquivo grande antes do tráfego** — o 413 de hoje impede que ele seja **gravado**, mas o arquivo já chegou inteiro. Barrar antes é camada de servidor (deploy).

## 💡 Ideias (brain-dump — sem compromisso, sem ordem)

> Despeje tudo aqui. Depois a gente classifica cada uma (fundação? feature? algum dia?) e move pro balde certo.

- Conexão de usuário via lore's em comum
- Sugestão de conexões entre entidades:
Na tela do Lorepsum, o usuário pode visualizar um aviso de "Possível conexão" entre entidades que já cadastrou.
Possível conexão
Jogos Vorazes ↔ Can't Catch Me Now
Can't Catch Me Now, de Olivia Rodrigo. Motivo: faz parte da trilha sonora de Jogos Vorazes: A Cantiga dos Pássaros e das Serpentes.
[Conectar] [Dispensar]
Ao clicar em Conectar, a relação é criada e uma linha passa a conectar visualmente as duas entidades no mapa. Ao clicar em Dispensar, a sugestão é removida.

---

### Legenda dos baldes
`✅ Feito` · `🔨 Agora` (1 coisa por vez) · `⏭️ Próximo` (fundação imediata) · `🌱 Depois` (feature com fundação pronta) · `🔒 Deploy público` (guardas que esperam ter público) · `💡 Ideias` (captura crua).
