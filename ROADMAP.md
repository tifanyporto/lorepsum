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
- **Frontend (pele de aprendizado):** CRUD de entidades integrado na API (lista / cria / edita / deleta).
- **Frontend — conexões (núcleo):** criar `relationship` pela UI + exibir a conexão no card da entidade. **Testado end-to-end.** 🌟
- **Frontend — tela de FOCO:** o **"focar & pular"** está vivo — entidade no centro, conexões de saída como links que navegam. Vestida no sistema de design (paleta papel, Fraunces + IBM Plex Mono, claro/escuro), responsiva, com componentes extraídos (`ThemeToggle`, `Logo`, `Search`).
- **Frontend — busca:** filtra entidades por nome e navega no clique.
- **B2 — imagens (FECHADO 2026-08-25):** tabela `entity_image` com índice único parcial (no máx. 1 capa por entidade) · **upload** multipart com validação de tipo (415) e tamanho (413), nome sorteado (UUID) e arquivos em `backend/media/` · pasta servida por `StaticFiles` · **capa no Foco** com moldura fixa e fallback da marca · **prévia da galeria** (5 miniaturas, contagem e `+N`) · e os dois `DELETE` (imagem e entidade `?hard=true`) **apagando o arquivo do disco** junto com a linha.
- **Backend:** `GET /entities/{id}/relationships` — o Foco não baixa mais o grafo inteiro pra mostrar 3 conexões.
- **Infra:** servidor soberano (postmarketOS + Postgres 18 + Tailscale), reboot-proof.
- **Design:** marca (símbolo, wordmark, paleta, fontes) + **landing** + **fluxo de onboarding conversacional** DEFINIDOS (`docs/design/`).

## 🔨 Agora — *a definir*

O B2 fechou. Candidatos, em ordem de peso: **Constelação (o grafo)** · **galeria maximizada** (a camada em tela cheia, já desenhada no mockup) · **refino de exibição das conexões**.

## ⏭️ Próximo (fundação que falta)

- **`GET /entities/{id}/relationships`** — as conexões de UMA entidade (em vez de todas de uma vez). O padrão de endereço já está definido pelo B2: **coleção aninhada, item plano**.
- **Refino de exibição** das conexões no Foco (formatação "origem —label→ destino", múltiplas conexões).

## 🌱 Depois (features — cada uma espera sua fundação)

- **Grafo visual / Constelação** (a antiga "pista B1") — o herói do design: nós e arestas navegáveis, onde a exploração **bidirecional** finalmente vive. Passo grande, provável lib de layout; começar desenhando os nós **estáticos** a partir dos dados.
- **Home / onboarding em React** — a landing + fluxo conversacional (casca externa). **Design pronto** em `docs/design/`; retomar quando o núcleo tiver **onde deixar** o usuário.
- **⌘K na busca** (teleporte por atalho de teclado — a busca em si já existe).
- **Passada de semântica e acessibilidade no `Focus`** *(adiada por ela em 2026-08-25 — nada quebra hoje)*: `<header>`/`<main>`/`<section>` no lugar de `div` genérica, hierarquia de títulos (o `<h2>` do tipo vem antes do `<h1>` do nome, e ele é rótulo, não título), e os links de conexão viram `<button>` — hoje são `<a>` **sem `href`**, que não recebem foco nem respondem ao teclado.
- **Onboarding com IA de verdade** (LLM no backend semeia a lore a partir da 1ª resposta) — hoje é simulado no mockup.
- **Consumo / notas / memórias reificadas** (fase 4).
- **Descoberta indireta** (caminhos entre entidades — fase 5).
- **Coleções / timeline** (fase 7).
- **Auth + "reivindicar a lore" no cadastro + deploy** (fase 9).

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
