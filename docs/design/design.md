# Lorepsum — Direção de Design

> Documento **vivo** — referência das decisões de design da interface. Atualizar conforme a gente refina.
> Última revisão: 2026-08-26.

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

## Decisão (2026-08-21) — Foco mostra só conexões de SAÍDA

Na tela de **Foco**, listar apenas as conexões onde a entidade é o **source** (as que ela "afirma"). **Não** mostrar as de entrada (onde ela é o target).

**Por quê:** o `label` é **texto livre criado pelo usuário** — o sistema não tem como saber que "son of" é o inverso de "father of". Logo, **inverter o rótulo automaticamente é impossível**, e exibir a conexão de entrada com o rótulo cru lê de trás pra frente ("Batman son of Robin"). Mostrar os dois sentidos também vira **redundância** quando o usuário guardou a recíproca (ex.: `father of` + `son of` no mesmo par).

**A bidirecionalidade é trabalho do GRAFO** (a Constelação, ao lado do Foco): lá a conexão é uma **linha entre dois nós visíveis**, e a direção é **espacial** — o rótulo mora na aresta, não é lido do ponto de vista de quem está em foco, então o problema de gramática não existe.

Divisão: **Foco = as afirmações de saída de UMA entidade (leem certo); Grafo = a teia inteira, os dois sentidos, resolvidos pela posição.**

*(Se um dia existir um vocabulário de rótulos **pré-definidos** com inversos conhecidos, dá pra reabrir e mostrar a entrada com frase correta — mas não com texto livre.)*

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
- ~~**Wordmark (logotipo):** `lorepsum.` em IBM Plex Mono, peso 500, minúsculo, tracking apertado, com ponto roxo final.~~ — **REFEITO em 2026-09-02**, ver o bloco de rebranding no fim deste documento.
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
- ~~Modelo de dados da capa~~ — **DECIDIDO (2026-08-24):** tabela satélite `entity_image`, uma só, porque **capa é um papel** (coluna booleana), não um tipo. Upload de arquivo, nome sorteado, caminho relativo no banco.
- **Posicionamento dos nós:** no app real vem de um **algoritmo de layout** (force-directed) da lib de grafo — não é colocado na mão. O mock estático não representa o espaçamento final.
- Refinamentos visuais contínuos ("vamos aperfeiçoando").

---

## 6. Notas de implementação (quando construir)

- Tudo isso é **frontend** (`frontend/`, React + TS + Tailwind). O React que falta (integração com a API, rotas) se aprende **em contexto** ao construir estas telas.
- ~~A capa/mídia exige decidir upload/armazenamento~~ — **feito (2026-08-25):** upload multipart com validação de tipo/tamanho, arquivos em `backend/media/` servidos por `StaticFiles`.
- O grafo visual (caminho A) provavelmente pede uma **lib** (ex.: força-dirigida) — avaliar quando chegar a hora.

---

## Decisão (2026-08-25) — GALERIA: prévia no Foco + galeria maximizada

> Mockup: [`gallery-mockup.html`](./gallery-mockup.html) (abas: Foco com prévia · galeria aberta · celular).

**A prévia (construível hoje).** Depois das conexões, uma seção **`gallery`** com a mesma etiqueta de museu (kicker mono + linha fina em cima) e uma fileira de até **5 miniaturas**, com um `+N` indicando o resto e a contagem total ao lado do kicker.

- **A capa NÃO entra na fileira** — ela já está grande no topo do Foco. A galeria é "o resto".

**A galeria maximizada (espera a Constelação).** Ao clicar numa miniatura, no layout de três painéis:

- a **Constelação colapsa** numa faixa fina à esquerda, mostrando **só o símbolo** — o rótulo do painel some (nada de texto cortado). Clicar na faixa **reabre a Constelação e fecha a galeria**;
- o **Foco desliza pra esquerda** e encolhe (~1/3), continuando legível: capa, nome, conexões;
- a **galeria** ocupa o espaço restante, em grade.
- **O Foco nunca se fecha.** Ele é o centro da tela; o que abre e fecha em volta são a Constelação e a galeria.

**No celular.** Não cabem três painéis: a prévia rola na horizontal, e o toque abre a **galeria em tela cheia** (grade de 2 colunas, com fechar). Nada de depender de arrastar pro lado pra ver uma foto em evidência.

**Ordem de construção.** A prévia não depende de nada e vem primeiro. A camada sobreposta em tela cheia é o comportamento **obrigatório do celular** — então ela também não é provisória, e pode ser construída antes do layout de painéis. O colapso da Constelação só existe quando a Constelação existir.

---

## Decisão (2026-08-26) — CONSTELAÇÃO: bolinhas, magnitude e o roxo do foco

> Mockup interativo: [`constellation-mockup.html`](./constellation-mockup.html) — arrastar, zoom, e clicar num nó refaz o desenho em volta dele.

**Os nós são bolinhas.** Nada de moldura com ícone por tipo — *essa ideia sai do grafo* e fica guardada pra outro lugar da interface. Aqui a hierarquia é carregada por **magnitude**: o tamanho e a opacidade caem conforme a distância (foco 9px · anel 1 6px/90% · anel 2 4,5px/45% · anel 3 3,2px/22%). O resultado lê como céu, não como diagrama.

**Só o foco pulsa.** É a mesma bolinha da home — núcleo sólido roxo com dois anéis expandindo (2,6s, o segundo atrasado em 1,3s). Sendo **o único movimento da tela**, ela puxa o olho sem precisar ser maior nem colorida.

**Roxo = o foco e o que encosta nele.** As arestas que saem do nó focado são roxas (55%); as dos anéis 2 e 3 são tinta esmaecida (16% e 9%). A cor deixa de ser enfeite e vira **fronteira**: o que é seu × o que é contexto.
*(Revisão da regra antiga "roxo reservado, só hover": reservado demais fez o primário sumir da tela. A regra nova mantém a economia — três usos: foco, vizinhança direta, hover.)*

**Hover** pinta a bolinha de roxo, revela o nome e **acende as arestas daquele nó** — distinguindo-se do anel 1 (que já é roxo) por **peso**: opacidade cheia e traço mais grosso.

**Rótulo segue a hierarquia:** nome fixo no foco e no anel 1; nos anéis 2 e 3, só no hover.

**Três anéis**, e a janela é **interativa**: arrastar (mouse e dedo), zoom (roda e pinça), clicar em qualquer nó — inclusive apagado — refoca.

### O que isso cobra

- **Backend:** a API devolve as conexões de *uma* entidade. Três anéis pedem a vizinhança por **profundidade** — endpoint novo, ou cascata de requisições no front.
- **Layout:** o mockup distribui por **setores** (cada nó divide sua fatia de ângulo entre os filhos), o que impede sobreposição mas trata o grafo como **árvore**. Os cruzamentos (Arkham vizinha de Gotham *e* do Coringa) são desenhados, mas a posição vem do primeiro caminho. **É aqui que o force-directed passa a se pagar** — e não antes.

---

## Decisão (2026-08-26, parte 2) — OS DOIS MODOS e o papel do pulso

> Mockup: [`constellation-modes-mockup.html`](./constellation-modes-mockup.html) — alterna os modos e testa os dois comportamentos de clique.

**A Constelação tem dois modos, e eles são do mesmo painel — não são duas telas.**

| modo | o que desenha | quando busca |
|---|---|---|
| **vizinhança** | a região em volta do foco, limitada por profundidade | a cada troca de foco |
| **tudo** | o cofre inteiro | uma vez, ao abrir |

**Clicar num nó nunca abre janela.** Constelação e Foco convivem lado a lado, então o clique no mapa **troca o conteúdo do painel do Foco** — o mesmo movimento de clicar numa conexão da lista, só que pelo desenho.

**No modo "tudo", o mapa fica quieto.** Clicar seleciona sem refazer o desenho: quem está explorando o cofre não pode perder o enquadramento que construiu arrastando. Recentrar vira **ação explícita** (um "centrar aqui"). No modo "vizinhança" o clique sempre recentra — é o que a vizinhança significa.

**O pulso é o cursor.** Ele marca **a entidade que o Foco está mostrando**, nunca o centro do desenho. Nos dois modos isso coincide em vizinhança, mas se separa em "tudo" — e ter dois sinais de "você está aqui" (pulso num nó, anel em outro) confunde. O nó em foco também é o maior, independente do anel em que caiu.

**Rótulo da aresta no hover.** Passar o mouse sobre uma aresta mostra o `label` da relação. É o único lugar onde o texto livre da conexão aparece no grafo.

### Consequência pro backend — nenhuma, por enquanto (revisto em 2026-08-26)

A primeira versão desta decisão previa um endpoint `GET /entities/{id}/neighborhood?depth=`. **Descartado por ora**, e o motivo é bom de guardar:

> Os dois modos precisam **dos mesmos dados** — todas as entidades e todas as relações — que os endpoints `GET /entities` e `GET /relationships` **já entregam**. O que separa "vizinhança" de "tudo" não é o que se busca: é **até onde se desenha**.

Então a profundidade vira **decisão de desenho**, calculada no front a partir do grafo que ele já tem em memória. Os dois modos passam a ser **um número** (desenhe até 3 anéis × desenhe todos), não dois caminhos de dados.

O endpoint de vizinhança continua sendo a saída certa **quando o acervo crescer** — aí ele evita baixar milhares de linhas pra mostrar 25. É otimização pra quando doer, no mesmo balde dos *magic bytes* e da coluna `position`.

---

## Decisão (2026-09-01) — O GRAFO INTEIRO, e a câmera que viaja

**A Constelação desenha tudo, e desenha uma vez só.** As arestas vêm de `GET /relationships` (todas), buscadas junto com as entidades na abertura da tela. A simulação de forças roda **uma vez** e as posições nunca mais mudam: o grafo deixa de ser um desenho que se refaz e vira **um lugar**. É isso que torna o resto possível — o enquadramento que você constrói arrastando sobrevive ao clique.

**Some o modo "vizinhança", e some a profundidade junto.** Não existem mais anéis 2 e 3: existe o grafo, e a hierarquia é carregada por **quem está aceso**. O foco é maior (9px) e pulsa; quem encosta nele fica opaco e com nome; o resto fica em 40% de tinta, com as arestas em 12%. Ninguém é escondido — a navegação (arrastar e zoom) é que resolve o tamanho do acervo, conforme a decisão de 26/08.

**Clicar num nó recentra, e a câmera viaja até ele.** *Revisão da decisão de 26/08 parte 2*, que previa clique **sem** recentrar no modo "tudo", com um "centrar aqui" explícito. O medo era perder o enquadramento — mas ele nascia de um grafo que se rearranjava a cada clique. Com o layout fixo, recentrar não desorienta: o mapa é o mesmo, só a janela andou, e o movimento contínuo mostra **de onde pra onde** você pulou. O "focar & pular" ganha o pulo.

**Duas transições, e a segunda tem interruptor.** Cor, opacidade e tamanho dos nós e arestas amaciam em 300ms — é o que faz a troca de foco parar de piscar. A câmera desliza em 500ms com `ease-out` (chegada, não freada). A da câmera é **desligada durante o arrasto**: como cada movimento do mouse define um `pan` novo, o mapa ficaria meio segundo atrás do cursor.

### O que isso resolveu (e o que cobrou)

O bug que revelou tudo isso: clicar num nó afastado o mandava pra fora da tela. A conta da câmera estava certa — o chão é que se mexia. O state `relationships` (só as do foco, vindas de `/entities/{id}/relationships`) estava fazendo **dois trabalhos**: alimentar a lista *connections* e alimentar o desenho. Como ele estava nas dependências do efeito da simulação, cada troca de foco redistribuía o grafo inteiro. Um state, um trabalho: nasceu o `allRelationships`.

- **Layout por setores: cancelado.** O `forceLink`/`forceManyBody` já resolve cruzamentos sem tratar o grafo como árvore.
- **Rótulo de aresta no hover** (decidido em 26/08) continua **não feito**.
- O endpoint de vizinhança segue no balde "quando o acervo crescer" — com uma razão a mais: agora o desenho **depende** de ter o grafo todo em memória.

---

## Decisão (2026-09-02) — O PAINEL DE LEITURA: dois painéis, e conexões agrupadas por tipo

> Mockup: [`connections-mockup.html`](./connections-mockup.html) — três rondas de alternativas, com botão de estresse (4 tipos × 7 tipos, 20 conexões).

**Constelação e Foco lado a lado, e a página não rola.** A página tem a altura da tela; a linha dos dois painéis toma o que sobra da topbar e é a **coluna do Foco** que rola por dentro. O teto de largura era da coluna de leitura, nunca da página — então ele desceu pra ela, e a linha ganhou um teto folgado (1600px).

**A largura extra vai pro grafo, não pro texto.** O painel do Foco tem largura fixa de leitura (`basis-[420px]`, não cresce); a Constelação fica com o resto. Num monitor largo cresce quem se beneficia — texto corrido com 700px de largura é ilegível, grafo com 700px é melhor. *(Revisão do 58/42 do mockup da constelação, que fazia os dois crescerem juntos.)*

**Respiro em vez de tela cheia.** A linha tem teto de altura (640px) e margem automática, então os painéis ficam centrados na vertical com ar em volta. A Constelação é um **objeto na página**, não um plano de fundo.

### O painel de leitura, refeito

**Duas famílias, dois papéis.** Serifa é **conteúdo** — nome da entidade, descrição, e o nome de cada conexão. Mono é **etiqueta** — rótulos de seção, tipos, contagens e o `label` da relação. A hierarquia passa a vir da *letra*, não de empilhar tamanhos de fonte, que era o que cansava a vista.

**A conexão é uma linha de duas colunas:** o `label` em mono, alinhado **à direita** de uma coluna fixa; o nome em serifa, começando sempre no mesmo x. O olho desce por uma margem só, em vez de ler frases que começam diferente. A seta `→` saiu — a coluna faz o trabalho dela.

**As conexões são agrupadas pelo tipo da entidade de destino**, e cada grupo **começa fechado**. A ficha abre como um **índice** — `characters 13 · movies 4 · places 5 · objects 4` — e cabe inteira sem rolagem, galeria incluída: você vê a forma do acervo daquela entidade antes de ler um nome. Clicar num tipo abre só ele (vários podem ficar abertos); um `expand all` no canto abre todos e vira `collapse all`.

*(Descartado: pastilhas de filtro. Elas duplicavam o nome do tipo — no filtro e no rótulo — e viravam poluição com 7 tipos. O rótulo do grupo já era o filtro.)*

**Roxo continua reservado.** Grupo aberto fica em **tinta**, não em roxo, pra não diluir o que o roxo já significa (foco e hover). E a barra de rolagem do painel é fina e roxa.

---

## Decisão (2026-09-02) — A ENTIDADE DESCREVE A SI MESMA

Descoberto olhando o acervo: a descrição de `Fear` dizia *"The weapon **he** chose…"*. Esse "he" não tem antecedente na tela — só existia na cabeça de quem escreveu a ficha do Batman. Chegando pelo Sinestro ou pelo Scarecrow, a frase fala de um sujeito ausente.

> **A entidade descreve a si mesma. A relação descreve o vínculo.**
>
> Teste: se a descrição deixa de fazer sentido quando você chega por outro vizinho, ela está no lugar errado.

Isso pesa mais nos `Concept` do que em qualquer outro tipo, porque conceito é justamente o que **muita gente compartilha** — é o `Fear` que costura Batman, Scarecrow e Sinestro, que nunca se encontraram. Conceito com dono deixa de ser conceito e vira anotação.

Não vale para quando a posse **é** a coisa: `LexCorp` é a empresa do Lex, `Apokolips` é o mundo do Darkseid, o `Lasso of Truth` é o laço da Diana. Aí o dono é propriedade do objeto, não ponto de vista.

### A saída (dela): descrição na aresta

A forma como o Batman lida com o medo **é** diferente da do Sinestro — e isso não é defeito da descrição genérica, é informação que hoje não tem onde morar. O lugar dela é a **aresta**: uma coluna de texto em `relationship`, ao lado do `label` curto. A entidade guarda a descrição genérica; a aresta guarda a contextual; a tela escolhe com `descrição da aresta ?? descrição da entidade`.

Pra isso o front precisa saber **por onde se entrou** — um state novo, `número | null`, com a aresta atravessada. E aí a verificação que fecha o desenho:

- a **busca** não atravessa aresta (teletransporte);
- a **constelação** também não — clica-se num nó, não numa linha, mesmo quando o nó é vizinho;
- só a lista `connections` atravessa, e sempre no sentido **saída** (o Foco só mostra conexões de saída, decisão de 2026-08-21).

Logo, **uma coluna basta**: o sentido contrário não é alcançável hoje. O problema dos dois textos (ida × volta) volta no dia em que o Foco mostrar conexões de **entrada**, ou no dia em que a aresta da constelação virar clicável. Guardado com o gatilho anotado, não ignorado.

---

## Decisão (2026-09-02) — LORE: o recorte, e a travessia entre lores

> Mockups: [`atlas-mockup.html`](./atlas-mockup.html) (ver o acervo inteiro) e [`lore-crossing-mockup.html`](./lore-crossing-mockup.html) (a travessia).

**`lore` é o nome do que une** um conjunto de entidades — e é um **recorte**, não um recipiente. "Constelação" passa a ser o *modo de ver*, não a coisa vista: a lore da DC tem grade, constelação e painel de leitura, três janelas para o mesmo recorte.

**Uma entidade pode estar em várias lores.** O vínculo é tabela de ligação (entidade ↔ lore), a mesma forma do `relationship`. `Vengeance` está na DC **e** na lore pessoal, sem escolher — e isso não é caso especial, é o esperado: `Concept` é justamente o tipo que reaparece. Forçar uma lore só seria o mesmo erro da descrição com dono.

> **Nunca se ligam duas lores. Ligam-se entidades. As lores se tocam sozinhas quando compartilham alguma.**

A HQ *Batman/Spider-Man* é uma entidade que pertence às duas lores e se conecta ao Batman e ao Homem-Aranha como qualquer outra conexão. Não existe vínculo "DC ↔ Marvel" no banco: existe uma HQ bem colocada. É a frase fundadora — *tudo é uma entidade, e tudo pode se conectar* — aplicada um nível acima.

### O que aparece na borda

Desenhando a lore da DC, uma aresta sai da HQ em direção ao Homem-Aranha, que **não pertence** a esse recorte. Ele **aparece**, e aparece marcado.

- **Cor `--color-beyond`.** `#4c6e94` no claro, `#8bafd4` no escuro. Não é "um azul": é o roxo (`267°, 32%, 44%`) com o **matiz girado para 210°**, mantendo saturação e luminosidade. Por isso parecem irmãos. Token nomeado pelo **papel**, como os outros (`desk`, `canvas`, `ink`) — no dia em que o azul não servir, o nome continua verdadeiro.
- **Repulsão maior na simulação**, para o nó de fora cair naturalmente na periferia. Assim "horizonte" deixa de ser metáfora e vira posição.
- **Arestas que se perdem:** dois ou três tocos saindo dele e desbotando até sumir. Na gramática do grafo, aresta que não termina só pode significar um nó que você não está vendo.
- **Respiração lenta:** um anel expandindo em ~6s, contra os 2,6s do pulso roxo. O ritmo é que carrega o sentido — o rápido diz *"você está aqui"*, o lento diz *"algo respira lá longe"*.
- **Brilho** *(escolhido)*: um gradiente radial difuso vazando de fora do quadro, com raio proporcional ao tamanho da lore vizinha. **Anuncia a escala sem dizer o número** — Marvel com 874 entidades e a lore pessoal com 38 têm nuvens visivelmente diferentes.
  *(Descartados: **poeira** — pontinhos espalhados leem como sujeira, porque não têm estrutura; **nós-fantasma** — informativo demais, entrega o que devia ser descoberto; **horizonte** — arcos bonitos, mas fáceis de não notar.)*
- **No hover, palavra e não número:** `marvel ↗`. O nome de um lugar é porta; "874 entities" é planilha. A contagem, se aparecer, aparece no painel de leitura.

### A travessia

> **O nó clicado não se move e não desaparece. Quem se dissolve é o mundo em volta dele.**

É esse ponto fixo que separa **travessia** de troca de página. A sequência:

1. o azul vira roxo;
2. a lore antiga perde opacidade e **infla para fora**, a partir da âncora;
3. a lore nova entra **encolhida em direção à âncora** e assenta em volta dela;
4. o pulso nasce no nó ancorado;
5. o nome da lore no cabeçalho troca **por último** (~480ms), confirmando o que já aconteceu;
6. só **depois** de tudo assentar, a câmera desliza para reenquadrar a lore nova — durante a dissolução a âncora fica cravada; o reenquadramento é o assentamento.

E chegando na Marvel, **o Batman vira o azul do horizonte**. A porta funciona nos dois sentidos sem nenhum mecanismo novo: ele é só uma entidade que não pertence à lore que você está olhando.

### Ver o acervo inteiro

A exploração continua sendo o padrão, mas existe saída para quem cansou de descobrir de um em um: um botão discreto na topbar, ao lado da busca, com a **contagem** (`all · 117`) — que já é informação. Abre uma camada sobre os dois painéis, sai com `Esc`.

**Modo grade** *(escolhido)*: fichas com capa, tipo e nome, com filtro por tipo e ordenação (a–z, mais ligadas, por tipo). Usa as capas do B2 — vira vitrine, boa para **reconhecer**. *(A lista densa em três colunas continua sendo melhor para **procurar**; fica como possível segundo modo.)*

### O que isto cobra, quando chegar a vez

- Tabela `lore` + tabela de ligação `entity_lore`; toda leitura do grafo passa a ter um recorte.
- Uma entidade **sem lore** precisa de resposta: fica órfã, ou existe uma lore padrão?
- A busca é teletransporte (você sabe o nome); a camada é inventário (você não sabe). As duas têm campo de texto e o usuário não sabe disso — talvez a busca deva terminar com "ver todas as 117".

---

## Decisão (2026-09-02, parte 2) — A GLOSA, construída

A coluna se chama **`gloss`** — em edição de texto, uma *glosa* é a explicação de **uma passagem**, não da obra inteira, que é exatamente a diferença entre isto e a `description` da entidade. *(Descartado `note`: a palavra está reservada pela fase 4, "consumo / notas / memórias reificadas". **Nome de coluna é reserva** — gastar uma palavra que o roadmap já prometeu deixa a feature futura sem ela.)*

Opcional por decisão dela, e é isso que faz a feature funcionar: obrigatória, toda conexão criada exigiria um parágrafo escrito à mão e a glosa viraria pedágio. Sem ela, o painel cai na descrição genérica — `arrivalGloss ?? entity.description`.

**Correção da parte 1:** ali estava escrito que *"só a lista `connections` atravessa aresta"*. É forte demais. O certo:

> A constelação **não** atravessa quando o nó clicado não tem ligação com o foco — aí é teletransporte, como a busca. Mas quando o nó clicado **é vizinho**, existe aresta entre os dois e você veio por ela.

Daí a regra que organiza o front:

> **Todo lugar que troca o foco deve uma resposta sobre a chegada** — ou "vim por esta aresta", ou "vim de lugar nenhum".

São três portas: a lista `connections` (sempre tem aresta), o nó da constelação (tem se for vizinho, `null` se não) e a busca (sempre `null`). Deixar qualquer uma calada faz a glosa anterior grudar numa entidade que não tem nada a ver com ela — foi o bug que apareceu no teste.

Continua valendo o limite do sentido: a busca no grafo só encontra glosa quando a aresta **sai** do foco. Quando as conexões de **entrada** aparecerem no Foco, isso volta à mesa junto com a questão dos dois sentidos.

---

## Decisão (2026-09-02, parte 3) — REBRANDING do wordmark

> Mockup: [`wordmark-mockup.html`](./wordmark-mockup.html) — doze tratamentos, cada um em 18px / 34px / 64px, mais a topbar real no fim (que é onde a decisão se toma, porque é onde a marca vive 99% do tempo).

**O wordmark passa a destacar `lore`.** A palavra `lorepsum` é `lore` + `ipsum`: uma metade é a coisa de verdade, a outra é o texto de encher. Até aqui a marca tratava as duas igual.

```
lore  →  Fraunces, display (SOFT 60, WONK 1), peso 600, roxo
psum  →  Fraunces, mesmo corte, tinta
.     →  roxo
```

**Sai o IBM Plex Mono.** Ele é, no sistema, a fonte de **etiqueta** — a marca estava vestida de *chrome de interface* em vez de nome próprio. Em Fraunces ela passa a falar com a mesma voz dos nomes de entidade.

**Modo display, não texto.** A Fraunces é variável: `SOFT` arredonda os cantos e `WONK` solta as formas mais características. Isso rende em tamanho grande (landing) e some em 18px — e é aceitável: na topbar o que identifica é o símbolo ao lado, não o *wonk*.

**O ponto continua roxo, e agora ele tem companhia.** Com `lore` roxo e o ponto roxo, o acento **abre e fecha** a palavra, e a tinta fica no meio. Isso parece contrariar a regra do *"roxo é um acento só"* — e a distinção que a mantém válida é: a regra existe pra impedir **roxo espalhado pela tela**. Dois acentos emoldurando a mesma palavra funcionam como um par, não como dois pontos soltos. Fora do wordmark, a regra segue intacta.

### Descartados (e por quê, pra não voltarem por engano)

- **`lore` roxo com o ponto em tinta** — respeitava a regra ao pé da letra, mas o roxo sozinho na frente desequilibra: a palavra fica pesada à esquerda.
- **`psum` no cinza apagado** — mais leve e bonito no claro, mas o `--color-muted` foi calibrado pra texto pequeno de apoio; num display de 64px ele lava, principalmente no escuro. Se um dia for retomado, precisa de um cinza próprio, com token e nome.
- **Só peso, sem cor** — funcionava, mas não resolvia o pedido: `lore` não chegava a existir como palavra.
- **Tudo em Fraunces sem distinção** — ganhava voz e perdia a piada; o `psum` deixava de parecer placeholder.

### O símbolo — correção de fidelidade

Auditoria do mesmo dia: **os mockups vinham desenhando o símbolo com 3 arestas**, e a marca tem **4** (`brand-logo.html` e o `Logo.tsx` do app sempre estiveram certos). O núcleo também aparecia com `r=5`, quando o canônico é `5.6`. Corrigido em cinco arquivos. **O `Logo.tsx` é a referência viva** — mockup que divergir dele está errado, não o contrário.