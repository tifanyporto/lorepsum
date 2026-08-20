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
- **Frontend (pele de aprendizado):** CRUD de entidades integrado na API (lista / cria / edita / deleta).
- **Frontend — conexões (núcleo):** criar `relationship` pela UI (2 selects + label, com guard `source≠target` e `Number()` nos ids) + exibir a conexão no card da entidade (dois saltos: entidade → rel → entidade-alvo). **Testado end-to-end.** 🌟
- **Infra:** servidor soberano (postmarketOS + Postgres 18 + Tailscale), reboot-proof.
- **Design:** marca (símbolo, wordmark, paleta, fontes) + **landing** + **fluxo de onboarding conversacional** DEFINIDOS (`docs/design/`).

## 🔨 Agora

- **Persistir as conexões no load** — o `useEffect` busca `entities` e `types`, mas ainda **não busca `relationships`**; adicionar o `fetch` (gêmeo do de entities) pra elas sobreviverem ao refresh. *(peça pequena e imediata)*
- **Focar & pular** — navegar por uma conexão: clicar num vizinho e ir pra ele. O **coração** do produto.

## ⏭️ Próximo (fundação que falta)

- **Backend (ponta):** `GET /entities/{id}/relationships` — buscar as conexões de UMA entidade (em vez de todas de uma vez).
- **Refino de exibição** da conexão no card (formatação "origem —label→ destino", múltiplas conexões por entidade — hoje o `.find` mostra só a primeira).

## 🌱 Depois (features — cada uma espera sua fundação)

- **Home / onboarding em React** — a landing + fluxo conversacional (casca externa). **Design pronto** em `docs/design/`; retomar quando o núcleo tiver **onde deixar** o usuário.
- **Busca ⌘K** (teleporte pra qualquer entidade).
- **Onboarding com IA de verdade** (LLM no backend semeia a lore a partir da 1ª resposta) — hoje é simulado no mockup.
- **Consumo / notas / memórias reificadas** (fase 4).
- **Descoberta indireta** (caminhos entre entidades — fase 5).
- **Grafo visual** (a constelação navegável de verdade, com lib de layout — fase 6).
- **Coleções / timeline** (fase 7).
- **Auth + "reivindicar a lore" no cadastro + deploy** (fase 9).

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
`✅ Feito` · `🔨 Agora` (1 coisa por vez) · `⏭️ Próximo` (fundação imediata) · `🌱 Depois` (feature com fundação pronta) · `💡 Ideias` (captura crua).
