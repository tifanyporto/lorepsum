# Design

Interface and product decisions. A living document.

Organised by **subject**, not by date. Sections 1–6 are what is **in force**; section 7 is what was **rejected**, with the reason, so it does not come back by accident; section 8 keeps decisions that were **superseded**, because the reasoning still teaches something even when the conclusion lost.

> The HTML mockups that produced several of these decisions were removed from the repo in September 2026. What they proved is written here; the living reference for the drawing is the code.

---

## 1. The principle

The value of lorepsum is not in **storing** things — that is a notes app or a catalogue. It is in **exploring the connections**. The interface has to make you feel like you are wandering through your own identity, pulling threads.

- The hero is the **graph** and the **act of exploring**. Not a form, not a list.
- **Form follows function:** every visual decision serves navigation or discovery. Nothing is ornament.
- The central loop is **focus & jump**: land on an entity, read it, leap to a connected one.

**Founding sentence:** *everything is an entity, and everything can connect.*

---

## 2. Visual identity

### Mode

**Paper (light) is the default; night is the alternate.** Same drawing in both — the switch is only a **palette swap**. Structure, typography and layout do not change.

### Palette

Tokens are named after their **role**, never after the colour. The day blue stops being the right answer, the name stays true.

| Role | Light | Dark |
|---|---|---|
| `desk` — outer background | `#e6dfce` | `#080706` |
| `canvas` — the sheet | `#f6f2e9` | `#0e0d0c` |
| `ink` — text | `#26231d` | `#ece7dd` |
| `muted` — support text | `#8a8072` | `#8b857a` |
| `line` — hairline | `#d7cebc` | `#332f29` |
| `accent` — the purple | `#6b4e96` | `#ad8bd4` |
| `beyond` — outside the current lore | `#4c6e94` | `#8bafd4` |

`beyond` is not "some blue": it is the purple (`267°, 32%, 44%`) with the **hue rotated to 210°**, keeping saturation and lightness. That is why the two read as siblings.

### Typography

- **Fraunces** (editorial serif) → entity names, descriptions, titles. It is the **voice**.
- **IBM Plex Mono** → section kickers, types, counts, relationship labels. It is the **tag**.

> **Serif is content, mono is chrome.**

Hierarchy comes from the **typeface**, not from stacking font sizes. That is what stopped the reading panel from tiring the eye.

### The accent rule

**Purple is reserved.** Three uses, and only three:

1. the **focused** node;
2. what **touches** it — direct neighbours;
3. **hover**.

Everything else is `ink` and `muted`. This is why an expanded connection group is rendered in ink, not purple: opening a group is not focusing anything.

> **Colour means something. Shape means type.**

### General constraints

No gradients, no shadows, no stacked cards. Plenty of air. Stay away from the look of an AI-generated template.

### The mark

**Symbol:** a solid centre node in `ink` — it inverts with the mode — radiating **four** connections to smaller nodes, **one of them in `accent`**: the strong connection. It is the you-node, consistent with what the screens show. It doubles as favicon and app icon.

⚠️ **Four edges, and the core is `r=5.6`.** This has been drawn wrong — three edges, `r=5` — in five different places. The living reference is [`Logo.tsx`](../frontend/src/components/Logo.tsx). Copy from there, never from memory.

**Wordmark:** `lorepsum.` in Fraunces, weight 600, display mode (`SOFT 60`, `WONK 1`).

```
lore  →  accent
psum  →  ink
.     →  accent
```

The word is `lore` + `ipsum`: one half is the real thing, the other is filler. The mark highlights the half that matters. The accent **opens and closes** the word with ink in the middle — two accents framing one word work as a pair, not as two loose dots, so the reserve rule above stays intact everywhere else.

`WONK` pays off at display sizes and disappears at 18px. That is acceptable: in the topbar, the symbol beside it does the identifying.

**Lockup:** symbol and wordmark side by side, symbol matching the height of the text box.

**The name** was reaffirmed in September 2026 after a debate about switching to something stellar. It stayed because `lorepsum` names **what the thing is** — the lore — while a stellar name would name **what it looks like**, and the constellation is one UI choice that coexists with the grid and the timeline.

---

## 3. The constellation

### The whole graph, drawn once

The constellation draws **everything**, not a neighbourhood. Entities and relationships are fetched **once** on open, the force simulation runs **once**, and the positions never change again.

That is what makes the rest possible: the graph stops being a drawing that redraws itself and becomes a **place**. The framing you build by dragging survives your clicks.

### Hierarchy by magnitude, not by ring

Nobody is hidden. What changes is who is **lit**:

| | size | opacity |
|---|---|---|
| focus | 9px, pulsing | full |
| direct neighbour | smaller | full, name visible |
| everyone else | smaller still | 40% ink, edges at 12% |

The size of the collection is handled by **navigation** — drag and zoom — not by hiding nodes.

### The pulse is the cursor

The pulse marks **the entity the reading panel is showing**, never the centre of the drawing. Two "you are here" signals confuse. Being the only movement on screen, it pulls the eye without needing to be bigger or more colourful.

### The camera travels

Clicking a node changes the focus **and** recentres, with the camera gliding to it (500ms, `ease-out` — an arrival, not a brake). The continuous movement shows you **where you came from**; it is the *jump* in focus & jump.

Two transitions, and the second one has a switch:

- colour, opacity and size ease over **300ms** — this is what stops a focus change from flickering;
- the camera glides over **500ms**, and that one is **disabled while dragging**. Every mouse move sets a new pan; with the transition on, the map trails half a second behind the cursor like rubber.

### The nodes are dots

No frames, no per-type icons. The result reads as **sky**, not as a diagram. The icon vocabulary is still reserved for somewhere else in the interface — just not here.

---

## 4. The reading panel

### Two panels, and the page does not scroll

Constellation and Focus sit side by side. The page is the height of the screen; the row of panels takes what the topbar leaves, and it is the **Focus column** that scrolls internally.

**The extra width goes to the graph, not to the text.** The Focus has a fixed reading width (`basis-[420px]`, it does not grow); the constellation takes the rest. Running text at 700px is unreadable; a graph at 700px is better.

**Breathing room instead of full bleed.** The row has a height cap (640px) and automatic margins, so the panels sit centred vertically with air around them. The constellation is an **object on the page**, not a background.

### The card opens as an index

Connections are **grouped by the type of the target entity**, and every group **starts collapsed**. The card opens showing `characters 13 · movies 4 · places 5 · objects 4` and fits without scrolling, gallery included: you see the **shape** of that entity's world before reading a single name.

Clicking a type opens just that one; several can be open at once. An `expand all` in the corner opens everything and becomes `collapse all` — and it **disappears** when there is nothing to expand, because a button with no job should not exist.

### A connection is a two-column line

The label in mono, right-aligned in a fixed column; the name in serif, always starting at the same x. The eye travels down a single margin instead of reading sentences that begin in different places. The `→` arrow was dropped — the column already does that work.

### Outgoing connections only

The Focus lists only connections where the entity is the **source** — the ones it *asserts*.

**Why:** the label is free text written by the user. Nothing can know that "son of" inverts to "father of", so **automatic inversion is impossible**, and showing an incoming connection with its raw label reads backwards: *"Batman son of Robin"*. Showing both directions is also redundant whenever the user stored the reciprocal.

**Bidirectionality is the graph's job.** There, a connection is a line between two visible nodes and direction is **spatial** — the grammar problem does not arise.

> **Focus = one entity's outgoing assertions, which read correctly. Graph = the whole web, both directions, resolved by position.**

*(This reopens the day a vocabulary of predefined labels with known inverses exists. With free text, it does not.)*

---

## 5. Where the text lives

### An entity describes itself

Found while reading the collection: the description of `Fear` said *"The weapon **he** chose…"*. That "he" has no antecedent on screen — it only existed in the head of whoever wrote Batman's card. Arriving from Sinestro, the sentence talks about an absent stranger.

> **The entity describes itself. The relationship describes the bond.**
>
> **Test:** if a description stops making sense when you arrive from a different neighbour, it is in the wrong place.

This weighs heaviest on `Concept`, because a concept is precisely the thing **many people share** — `Fear` is what stitches together Batman, Scarecrow and Sinestro, who never met. A concept with an owner stops being a concept and becomes a note.

It does not apply when the ownership **is** the thing: `LexCorp` is Lex's company, `Apokolips` is Darkseid's world. There the owner is a property of the object, not a point of view.

### The gloss

The way Batman deals with fear genuinely **is** different from the way Sinestro does, and that is not a flaw in the generic description — it is information with nowhere to live. Its home is the **edge**: a `gloss` column on `relationships`, beside the short `label`.

- the entity holds the **generic** description;
- the edge holds the **contextual** one;
- the screen picks: `gloss of arrival ?? entity description`.

**The name.** In textual scholarship, a *gloss* explains **one passage**, not the whole work — exactly the difference between this and `description`. *(`note` was rejected: that word is reserved for a later phase about consumption and memories. **A column name is a reservation** — spending a word the roadmap already promised leaves the future feature without it.)*

**Optional by design**, and that is what makes the feature work. If it were mandatory, every new connection would demand a hand-written paragraph and the gloss would become a toll.

### The rule that organises the front end

> **Every place that changes the focus owes an answer about the arrival** — either "I came through this edge" or "I came from nowhere".

There are three doors:

| door | crosses an edge? |
|---|---|
| connection list | **always** — the edge is the line you clicked |
| constellation node | **only if it neighbours** the focus; `null` otherwise |
| search | **never** — it is teleportation |

Leaving any of them silent makes the previous gloss **stick** to an entity it has nothing to do with. That is exactly the bug that showed up in testing.

**Known limit:** the graph only finds a gloss when the edge **leaves** the focus. This returns to the table alongside incoming connections.

---

## 6. Designed, not yet built

### The maximised gallery

The **preview** in the Focus exists: up to five thumbnails with a `+N` and the count. The cover does **not** appear in that row — it is already large at the top.

The open gallery is a three-panel layout: the constellation **collapses** into a thin strip showing only the symbol (clicking reopens it), the Focus slides over and shrinks to about a third while staying readable, and the gallery takes the rest as a grid.

> **The Focus never closes.** It is the centre of the screen; what opens and closes around it are the constellation and the gallery.

On a phone three panels do not fit: the preview scrolls horizontally and a tap opens the gallery **full screen**. That layer is mandatory phone behaviour, so it is not provisional — it can be built before the panel layout.

### `lore` — the slice

A `lore` is the name of what unites a set of entities, and it is a **slice**, not a container. "Constellation" becomes the *way of looking*, not the thing looked at: the DC lore has a grid, a constellation and a reading panel — three windows onto the same slice.

**An entity can belong to several lores.** The link is a join table (`entity_lore`), the same shape as `relationship`. `Vengeance` is in DC **and** in the personal lore without choosing — and that is expected, not a special case.

> **Two lores are never linked. Entities are. Lores touch on their own when they share one.**

The *Batman/Spider-Man* crossover is an entity belonging to both, connecting to each hero like any other connection. There is no "DC ↔ Marvel" link in the database: there is one well-placed comic. It is the founding sentence applied one level up.

**What shows at the border.** Drawing the DC lore, an edge leaves the crossover comic heading for Spider-Man, who does not belong to this slice. He **appears, and appears marked**:

- colour `beyond`;
- **higher repulsion** in the simulation, so the outside node naturally falls to the periphery — "horizon" stops being a metaphor and becomes a position;
- **edges that trail off**: two or three stubs leaving him, fading to nothing. In the grammar of a graph, an edge that does not end can only mean a node you are not seeing;
- **slow breathing**: a ring expanding over ~6s against the 2.6s of the purple pulse. The rhythm carries the meaning — fast says *"you are here"*, slow says *"something breathes far away"*;
- **glow**: a diffuse radial gradient bleeding in from off-frame, with a radius proportional to the size of the neighbouring lore. It announces scale **without stating a number**;
- **on hover, a word and not a number:** `marvel ↗`. The name of a place is a door; "874 entities" is a spreadsheet.

**The crossing.**

> **The clicked node does not move and does not disappear. What dissolves is the world around it.**

That fixed point is what separates a crossing from a page change:

1. the blue turns purple;
2. the old lore loses opacity and **inflates outward** from the anchor;
3. the new lore enters **shrunk toward the anchor** and settles around it;
4. the pulse is born on the anchored node;
5. the lore name in the header changes **last** (~480ms), confirming what already happened;
6. only **after** everything settles does the camera reframe. During the dissolve the anchor stays nailed down.

Arriving in Marvel, **Batman becomes the blue of the horizon**. The door works both ways with no new mechanism: he is simply an entity that does not belong to the lore you are looking at.

**What this will require:** a `lore` table and an `entity_lore` table; every read of the graph gains a slice; and an entity **with no lore** needs an answer — is it orphaned, or is there a default lore?

### The atlas — seeing the whole collection

Exploration stays the default, but there is an exit for anyone tired of discovering one at a time: a discreet button in the topbar beside the search, carrying the **count** (`all · 134`), which is already information. It opens a layer over both panels and closes with `Esc`.

**Grid mode:** cards with cover, type and name, filterable by type and sortable (a–z, most connected, by type). It uses the cover images — a display case, good for **recognising**. *(A dense three-column list is better for **searching**; it stays as a possible second mode.)*

⚠️ Search and atlas both have a text field and the user does not know the difference. Search is **teleportation** — you know the name. The layer is **inventory** — you do not. Perhaps search should end with "see all 134".

### Conversational onboarding

An AI agent asks a visitor about something they love and **seeds a lore** from the answer — entities and connections created automatically. It solves the **cold start**: an empty graph has nothing to explore.

**Deliberately inverted order** — value first, ask later:

1. ask about the **taste** first: low-friction bait that feels like a game, not a form;
2. generate and show the lore: the *wow*;
3. ask for the **name** afterwards, once the person is invested — and the name **names the you-node**;
4. natural call to action: *"want to keep this lore?"*

The lore is born **anonymous**, tied to a session, and is **claimed** at sign-up. Implication: auth has to support that claim.

**Screen flow:** a landing with an ambient constellation and a pulsing purple star — the invitation **without words** → click → the page descends → a chat card **alone**, no constellation, lines arriving one at a time with a typing indicator → the visitor answers → the card slides aside and **the constellation is born on the other side**. The surprise grows out of the answer; it is not pre-shown.

> ⚠️ **Architectural rule:** the LLM call lives **in the backend**. The API key is a secret — in `.env`, like the database password — and **never** in the frontend. The model's output is structured JSON, validated with Pydantic.

**Open question:** *find-or-create* — do not duplicate "Nolan" if he already exists.

---

## 7. Rejected, and why

Kept here so none of it returns by accident.

| Rejected | Reason |
|---|---|
| **Edge labels** — text on the graph's lines | Decided in August 2026 and **reversed in September**: it clutters. The `label` lives in the connection list, and only there. |
| **Per-type icons on graph nodes** | Turns it into a diagram. Dots with magnitude read as sky. The idea is kept for elsewhere in the UI. |
| **Cover thumbnails on nodes** | Would pollute the canvas, and not every entity has an image. **Calm beats richness.** |
| **Filter pills for connections** | They duplicated the type name — once in the filter, once in the group label — and became clutter with seven types. The group heading **already was** the filter. |
| **Sector-based graph layout** | It prevented overlap but treated the graph as a **tree**: position came from the first path found, so real cross-links resolved badly. Force-directed handles it without that. |
| **A `/neighborhood?depth=` endpoint** | Both modes needed **the same data**, which `/entities` + `/relationships` already return. Depth was a **drawing** decision, not a fetching one. It comes back when the collection hurts. |
| **"Dust" at the lore horizon** | Scattered specks read as **dirt**, because they have no structure. |
| **Ghost nodes at the horizon** | Too informative — it gives away what should be discovered. |
| **A "horizon" of arcs** | Pretty, but easy to miss entirely. |
| **`note` as the column name** | Reserved by the later notes-and-memories phase. It became `gloss`. |
| **The wordmark in IBM Plex Mono** | Mono is the **tag** typeface in this system — the mark was dressed as interface chrome instead of a proper name. |
| **Purple `lore` with an ink dot** | Followed the rule literally, but purple alone at the front unbalances the word: it goes heavy on the left. |
| **`psum` in muted grey** | `muted` was calibrated for small support text; at 64px it washes out, especially in dark mode. It would need a grey of its own, with a token and a name. |
| **Wordmark by weight alone, no colour** | It worked, but `lore` never came to exist as a word. |
| **Renaming the project** (`stellore`/`stelore`) | Would name the **appearance**, not the thing; and it hides the seam that `lorepsum` shows. See §2. |

---

## 8. Superseded decisions

The conclusions lost, but the reasoning still teaches.

### Three rings and depth *(August 2026 → superseded in September)*

The constellation drew a neighbourhood in three rings, size and opacity falling with distance: focus 9px · ring 1 6px/90% · ring 2 4.5px/45% · ring 3 3.2px/22%.

**Why it fell:** the rings existed because the drawing was rebuilt on every focus change. With the whole graph drawn once, "distance from the focus" stops being structure and becomes simply **who is lit**.

### Two modes, and the click that did not recentre *(August 2026 → superseded in September)*

The constellation was to have two modes — "neighbourhood", redrawn on every focus change, and "everything", fetched once. In "everything", clicking would **select without recentring**, and recentring would be an explicit action.

**Why it fell:** the fear was losing the framing built by dragging — but that fear came from a graph that **rearranged itself** on every click. With a fixed layout, recentring does not disorient: the map is the same, only the window moved. Focus & jump gained its jump.

### The bug that revealed all of it

Clicking a distant node sent it off-screen. The camera arithmetic was right — **the floor was moving**. The `relationships` state, holding only the focus's own edges, was doing **two jobs**: feeding the connection list and feeding the drawing. Because it sat in the simulation effect's dependency list, every focus change redistributed the entire graph.

> **One state, one job.** That is where `allRelationships` came from.

### "Purple reserved, hover only" *(August 2026 → revised)*

The original rule reserved purple for hover and strong connections alone. Too reserved: the primary colour vanished from the screen and became folklore. The current rule keeps the economy with **three** uses — see §2.

### The you-node as an inverted solid box *(August 2026 → open)*

The you-node was to be distinguished by **inversion**, filled with the ink colour rather than purple. With nodes becoming dots, there is no box shape any more. **How the you-node is distinguished in the graph is undecided**, and it returns when the you-node is built.
