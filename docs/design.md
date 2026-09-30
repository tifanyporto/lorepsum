# Design

Interface and product decisions. A living document.

Organised by **subject**, not by date. Sections 1–6 are what is **in force**, and built; section 7 is **designed but not yet built**; section 8 is what was **rejected**, with the reason, so it does not come back by accident; section 9 keeps decisions that were **superseded**, because the reasoning still teaches something even when the conclusion lost.

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
| `accent` — the purple: you | `#6b4e96` | `#ad8bd4` |
| `here` — where you are now | `#94824c` | `#d4c28c` |
| `beyond` — outside the current lore | `#4c6e94` | `#8bafd4` |

`beyond` is not "some blue": it is the purple (`267°, 32%, 44%`) with the **hue rotated to 210°**, keeping saturation and lightness. That is why the two read as siblings.

### Typography

- **Fraunces** (editorial serif) → entity names, descriptions, titles. It is the **voice**.
- **IBM Plex Mono** → section kickers, types, counts, relationship labels. It is the **tag**.

> **Serif is content, mono is chrome.**

Hierarchy comes from the **typeface**, not from stacking font sizes. That is what stopped the reading panel from tiring the eye.

### Three colours that mean something

Each of the three colours answers one question, and never another:

1. **Purple (`accent`) is you.** The you-node, its edges, and your claims in the panel — the `YOU` over your own card, the labels of your connections there, and on anyone else's card the kicker naming what you said about them. Nothing else is purple, so purple anywhere means you.
2. **Gold (`here`) is where you are now.** The focus and its pulse, the edges that touch it, hover, the lore in focus in the sky, the anchor of a crossing.
3. **Blue (`beyond`) is outside.** Whatever does not belong to the lore on screen: the border, a connection in the panel that leads elsewhere, the doors on a card.

Everything else is `ink` and `muted`. This is why an expanded connection group is rendered in ink: opening a group is not focusing anything.

> **Colour says who. Shape says belonging** — a dot belongs here, a hollow ring is from elsewhere, the diamond is you.

⚠️ The hovers in the reading panel — connection rows, type headings, `expand all` — are still purple, from before this rule. They belong in `here`.

### General constraints

No gradients, no shadows, no stacked cards. Plenty of air. Stay away from the look of an AI-generated template.

**One gradient, on purpose:** the you-node's edges fade with distance (§3). A line from you that stayed solid across the whole drawing would read as a streak, not as a connection.

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

### A whole lore, drawn once

The constellation draws **a whole lore** — every entity in it, and its border (§6) — not a neighbourhood. Entities, relationships and lore memberships are fetched **once** on open; each lore's layout is computed **once**, from the data alone, and the positions never change again. The same data always draws the same positions, which is also what lets the sky's miniature of a lore and the lore's own constellation share one layout.

That is what makes the rest possible: the graph stops being a drawing that redraws itself and becomes a **place**. The framing you build by dragging survives your clicks.

### Hierarchy by magnitude, not by ring

Nobody is hidden. What changes is who is **lit**:

| | size | opacity |
|---|---|---|
| focus | 9px, pulsing, `here` | full |
| direct neighbour | 6px | 90%, name visible |
| everyone else | 6px | 32% ink, edges at 8% |

The size of the collection is handled by **navigation** — drag and zoom — not by hiding nodes.

### The pulse is the cursor

The pulse marks **the entity the reading panel is showing**, never the centre of the drawing. Two "you are here" signals confuse. Being the only movement on screen, it pulls the eye without needing to be bigger or more colourful.

### The you-node

Pinned at the centre of every lore, outside the simulation. **Two open arcs around a diamond** — never a dot, so it never reads as one more node; the gaps in the arcs let its edges out instead of strangling them.

**A clear zone** surrounds it. No other node settles inside, and an edge between two other nodes that would cross it **bends around it**, the way light bends around a mass — one smooth curve per edge, grazing the zone at a single point. Only your own edges cross that space, because they are the ones that belong there.

**Your edges fade with distance**, solid near you and gone by the farthest one's tip, so a connection reads near you and not as a streak across the sky. Inside a lore they reach **only the lore's own entities**: someone at the border is reached the way the lore reaches them, through the entity of this lore they are tied to. In a music lore, Sheldon hangs off *Soft Kitty*, not off you.

### The camera travels

Clicking a node changes the focus **and** recentres, with the camera gliding to it (500ms, `ease-out` — an arrival, not a brake). The continuous movement shows you **where you came from**; it is the *jump* in focus & jump.

Two transitions, and the second one has a switch:

- colour, opacity and size ease over **300ms** — this is what stops a focus change from flickering;
- the camera glides over **500ms**, and that one is **disabled while dragging**. Every mouse move sets a new pan; with the transition on, the map trails half a second behind the cursor like rubber.

The camera aims at the middle of **what the panel leaves uncovered**, not at the middle of the window — the drawing spans the whole window and the panel floats over its right side. When the panel stops floating (below), the two are the same point again, and the camera needs no special case to know it.

### Pulling a node

A press on a node that **travels** — more than 4px — is a pull, not a pan and not a click. The node follows the hand, and its connections follow it **on springs**: every node is tied to its home and every edge rests at its length at home, so at home nothing pulls on anything. The motion spreads along the edges — direct connections about a third of the way, the next ring a sixth, the one after a tenth — and a node with no path to the pulled one does not move at all.

**Letting go is not physics.** Every node glides straight home over 700ms, easing out, and lands exactly there: the place is the same place after every pull. Nothing, pulled or not, enters the you-node's zone.

### The nodes are dots

No frames, no per-type icons. The result reads as **sky**, not as a diagram. The icon vocabulary is still reserved for somewhere else in the interface — just not here.

### No name covers another

Each name looks for a free spot around what it names — below first, where names have always been, then above, to the sides, on the diagonals, a step further out — in order of importance: the focus, then what is under the pointer, then the neighbours. A neighbour with nowhere free waits for the hover. The same rule places the names of the lores in the sky.

---

## 4. The reading panel

### The panel floats over the drawing

The drawing fills the window; the reading panel — the **Focus** — floats over its right side, at the height the topbar leaves, and it is the panel that scrolls internally, never the page.

**The extra width goes to the graph, not to the text.** The Focus has a reading width of 404px — the width of the search above it — and the drawing takes the rest. Running text at 700px is unreadable; a graph at 700px is better.

**What the panel takes is one number, and both halves read it.** `panelReserve(width)` returns the column plus its margin; the panel is sized from it and the camera aims around it, so the drawing and the frame cannot fall out of step. It answers in three bands:

- **wide** — the panel keeps its 404px and the map takes everything else;
- **tight** — the map is down to its 300px minimum, so the panel gives ground, down to 320px, the narrowest width still worth reading;
- **narrow** (under ~684px) — the two no longer fit. The reserve is zero: the panel stops floating, the map keeps the whole window, and reading becomes an act — a `read` button opens the panel over the map, and closing it gives the map back. Choosing which half of a node to hide is not a layout; admitting there is no room is.

In the narrow band the wordmark also steps aside, leaving the symbol: of the two things in the left column, the one that changes is where you are standing.

**Two columns, two jobs, up to the topbar.** The left column is the map and where you are on it: the lockup, then the trail — `lores / The Big Bang Theory`, where `lores` is the way back up. The right column is finding and reading: the search sits over the panel, in its width, because a search ends in a card to read. Each column carries its own, so at no width do the two fight for the same strip.

### The card opens as an index

Connections are **grouped by the type of the target entity**, and every group **starts collapsed**. The card opens showing `characters 13 · movies 4 · places 5 · objects 4` and fits without scrolling, gallery included: you see the **shape** of that entity's world before reading a single name.

Clicking a type opens just that one; several can be open at once. An `expand all` in the corner opens everything and becomes `collapse all` — and it **disappears** when there is nothing to expand, because a button with no job should not exist.

The **cover** is a 3:4 portrait, 128px wide, beside the name; the mark stands in when there is none.

### A connection is a two-column line

The label in mono, right-aligned in a fixed column; the name in serif, always starting at the same x. The eye travels down a single margin instead of reading sentences that begin in different places. The `→` arrow was dropped — the column already does that work.

A connection that leads **out of the lore on screen** keeps its line and writes the name in `beyond`: the list says where the edge goes before you follow it.

### Your card

The you-node's card is the only one whose subject is also its reader, and it says so:

- **`YOU`** heads it, in purple mono with a hairline running to the edge — the grammar of the panel's section headers, a size up. It takes the place of the type: you are not a `Person` among others;
- a short line with **the size of what you built** — entities and connections. The full statistics belong to a place of their own;
- the labels of your connections are **your claims**, so they are written in purple.

On **anyone else's card**, the kicker names what you said about them, in purple: `CHARACTER · YOU · LOVES`. Purple at the top of a card always means you.

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

There are four doors:

| door | crosses an edge? |
|---|---|
| connection list | **always** — the edge is the line you clicked |
| constellation node | **only if it neighbours** the focus; `null` otherwise |
| search | **never** — it is teleportation |
| a door on a card | **never** — it crosses into a lore, not along an edge |

Leaving any of them silent makes the previous gloss **stick** to an entity it has nothing to do with. That is exactly the bug that showed up in testing.

**Known limit:** the graph only finds a gloss when the edge **leaves** the focus. This returns to the table alongside incoming connections.

---

## 6. Lores

### `lore` — the slice

A `lore` is the name of what unites a set of entities, and it is a **slice**, not a container. "Constellation" becomes the *way of looking*, not the thing looked at: the DC lore has a grid, a constellation and a reading panel — three windows onto the same slice.

**An entity can belong to several lores.** The link is a join table (`entity_lores`), the same shape as `relationships`. `Vengeance` is in DC **and** in the personal lore without choosing — and that is expected, not a special case.

> **Two lores are never linked. Entities are. Lores touch on their own when they share one.**

The *Batman/Spider-Man* crossover is an entity belonging to both, connecting to each hero like any other connection. There is no "DC ↔ Marvel" link in the database: there is one well-placed comic. It is the founding sentence applied one level up.

The screen shows **one lore at a time**. The you-node belongs to none of them — it is the frame, not the content — so it sits at the centre of every one.

### What shows at the border

Drawing the DC lore, an edge leaves the crossover comic heading for Spider-Man, who does not belong to this slice. He **appears, and appears marked** — but quietly. The border says *there is more out there*; it does not compete with the slice for attention:

- colour `beyond`, drawn as a **hollow ring**, not a filled dot: someone who is there without belonging;
- **no name at rest**. The ring and its stubs are enough to say that something is there;
- **higher repulsion** in the simulation, so the outside node naturally falls to the periphery — "horizon" stops being a metaphor and becomes a position;
- **edges that trail off**: three stubs leaving him outward, fading to nothing. In the grammar of a graph, an edge that does not end can only mean a node you are not seeing;
- **slow breathing**: a ring expanding over ~6s against the 2.6s of the focus pulse. The rhythm carries the meaning — fast says *"you are here"*, slow says *"something breathes far away"*.

**A border node next to the focus** follows the rule every neighbour follows: it is **named**. It keeps its colour — the name is written in `beyond` and the ring grows stronger — so a neighbour from elsewhere never passes for one from here.

**An entity of the lore that also lives elsewhere** keeps its full dot — it belongs here — and a single blue stub leaves it outward: the border's own sign, an edge that does not end, saying that a way out starts here. Hovering opens the same card, and its doors cross with it as the anchor; a click still focuses it, since it can be read here. Exploring is exactly this: noticing that a thing you are looking at also lives somewhere else.

*(Designed and not built: a **glow** — a diffuse radial gradient bleeding in from off-frame, with a radius proportional to the size of the neighbouring lore, announcing scale without stating a number. The look chosen for the border has no glow, and it would be a second exception to "no gradients". Open.)*

### The card: where else it lives

Hovering a border node opens a small card anchored to it, on the side facing out of the screen, joined to the node by a hairline. Flat like everything else: the canvas, a hairline in `beyond`, no shadow.

- the title is the **entity's name** — the node's own label steps aside while the card is open;
- under `ALSO IN`, **the other lores it belongs to, each one a door**. The name of a place is a door; "874 entities" is a spreadsheet;
- **at most five**, the lores that share the most with the one open coming first — the likeliest doors on top. Past five, `+ N more` **expands the card in place**, with its own scroll. The card never sends you out of the constellation;
- a **click or a tap pins the card open**; it closes by choosing a door or pressing elsewhere. One rule for the mouse and for touch, where there is no hover;
- **an entity with a single other home still gets the card.** Nobody crosses by accident: a crossing always starts from a line in a card.

Rejected on the way: naming the other lores as floating words at the tips of the stubs — one stub per lore reads well with three homes and becomes a hedgehog with twenty; and listing them only in the reading panel — opening the card to choose a door breaks the immersion the crossing exists to keep.

### The crossing

> **The clicked node does not move and does not disappear. What dissolves is the world around it.**

That fixed point is what separates a crossing from a page change:

1. the blue turns into the focus colour (`here`) — purple is reserved for you;
2. the old lore loses opacity and **inflates outward** from the anchor;
3. the new lore enters **shrunk toward the anchor** and settles around it;
4. the pulse is born on the anchored node;
5. the lore name in the trail changes **last**, once the new lore has settled, confirming what already happened;
6. only **after** everything settles does the camera reframe. During the dissolve the anchor stays nailed down.

Arriving in Marvel, **Batman becomes the blue of the horizon**. The door works both ways with no new mechanism: he is simply an entity that does not belong to the lore you are looking at.

### The Nebula

**The default lore is the Nebula**, the home of every entity that has no other. The account points at it (`users.nebula_lore_id`), so renaming it changes nothing; new entities arrive in it; and it can never be deleted.

*(What happens to the entities of an archived lore, when it was their only home, is open: #26.)*

### Where the app opens

The first visit opens on the **Nebula** — for a new account it is everything there is. After that, the app opens on **the sky of lores**. *(The first visit is remembered by the browser until accounts have sessions, #14; then it belongs to the account.)*

### The sky of lores

Not a list: nobody browses their lores, they wander among them. The you-node sits in the centre, as it does inside every lore, and the lores float around it, each one drawn as its own constellation in miniature.

- **the miniature is the lore's own layout** — the same positions its constellation uses, only smaller, framed on the body of the lore rather than on its farthest straggler. Its size follows the number of entities without writing it.
- **distance says how much of the lore is yours.** The more of your connections point into a lore, the closer it sits. The purple lines are exactly those connections, reaching into the miniatures — calm at rest, lit for the lore under the pointer or in focus. A lore none of them touches sits on the outer edge.
- **each lore gets its slice of the circle**, and the lores that share the most sit side by side, so the bridges between them stay short. A lore just created, still empty, shows as a dashed ring.
- **bridges.** An entity that lives in two lores appears between them as a small dot, joined to its place in each, bending around you. Unnamed at rest — the rule of the border; hovering opens the border's own card: its name and, under `IN`, the lores it lives in, each a door that dives into that lore with it in focus. The lores are still never linked: the bridge is an entity.
- **the lore in focus lights in the focus colour**, its dots and edges both — the way a focused node's edges do. No ring around it.
- **a click focuses, it does not enter.** As with an entity in the graph, the first click focuses the lore and the reading panel shows it: its types and how many of each, how many of your connections point into it, and which lores it touches and through which entities. Entering is the `enter ↗` in the panel, or a second click.
- **with nothing focused, the panel shows you** — you are what sits in the centre.
- **entering is a dive.** One continuous zoom: the miniature grows until it is the constellation and the other lores leave by the edges. The you-node never moves; the lore comes to settle around it. Leaving is the same zoom run backwards, from wherever the camera stood.

**Search is teleportation, lores included.** From the sky, it dives into the lore that is most yours among those holding the entity, and lands on it. From inside a lore, an entity of that lore is simply focused; one from elsewhere switches lore without a crossing — a crossing belongs to a door, and search is not one.

Rejected on the way: **cards with the lore's constellation as a cover** — a display case, which is the atlas's job; and **a typographic index** — the fastest to read and the one that most turns the collection into a spreadsheet. Its content survived: it is what the panel shows for a focused lore.

---

## 7. Designed, not yet built

### The maximised gallery

The **preview** in the Focus exists: up to five thumbnails with a `+N` and the count. The cover does **not** appear in that row — it is already large at the top.

The open gallery is a three-panel layout: the constellation **collapses** into a thin strip showing only the symbol (clicking reopens it), the Focus slides over and shrinks to about a third while staying readable, and the gallery takes the rest as a grid.

> **The Focus never closes.** It is the centre of the screen; what opens and closes around it are the constellation and the gallery.

On a phone three panels do not fit: the preview scrolls horizontally and a tap opens the gallery **full screen**. That layer is mandatory phone behaviour, so it is not provisional — it can be built before the panel layout.

### The atlas — seeing the whole collection

Exploration stays the default, but there is an exit for anyone tired of discovering one at a time: a discreet button beside the search, carrying the **count** (`all · 134`), which is already information. It opens a layer over both panels and closes with `Esc`.

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

## 8. Rejected, and why

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
| **Only fading the edges that cross the you-node's zone** | The lines still crossed it, only paler. The zone had to be **empty**, so the edges bend around it instead. |
| **`note` as the column name** | Reserved by the later notes-and-memories phase. It became `gloss`. |
| **The wordmark in IBM Plex Mono** | Mono is the **tag** typeface in this system — the mark was dressed as interface chrome instead of a proper name. |
| **Purple `lore` with an ink dot** | Followed the rule literally, but purple alone at the front unbalances the word: it goes heavy on the left. |
| **`psum` in muted grey** | `muted` was calibrated for small support text; at 64px it washes out, especially in dark mode. It would need a grey of its own, with a token and a name. |
| **Wordmark by weight alone, no colour** | It worked, but `lore` never came to exist as a word. |
| **Renaming the project** (`stellore`/`stelore`) | Would name the **appearance**, not the thing; and it hides the seam that `lorepsum` shows. See §2. |
| **A ring around the lore in focus in the sky** | A large empty circle, worst on a sparse lore like the Nebula, where it drew more than the lore did. The lore itself lights up instead. |
| **A floating label on the sky's bridges** | The same entity said "I live elsewhere" in two different ways, in the sky and at a border. It opens the border's card. |
| **The trail in a strip of its own above the panel** | It read loose, belonging to nothing. It went beside the lockup, and the search took the panel's column. |
| **The border's hollow ring on an entity of the lore that also lives elsewhere** | The ring means *not belonging here*. The same look would put an entity of the lore beside one that only hangs off it, and one gesture would do two things — the click pins a border node's card, and focuses one of the lore's own. |
| **A ring, a satellite or a blue name** for an entity that also lives elsewhere | A ring reads, at a distance, as the rings of the focus; a satellite is a sign nobody has learned yet; a blue name breaks the rule that only the focus and its neighbours are named at rest. The stub reuses what the border already taught. |
| **Leaving an entity that also lives elsewhere unmarked** | It hid the door. The card existed, and nothing on screen said to look for it. |

---

## 9. Superseded decisions

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

The original rule reserved purple for hover and strong connections alone. Too reserved: the primary colour vanished from the screen and became folklore. It grew to three uses — the focused node, what touches it, and hover.

### Purple for the focus, its neighbours and hover *(September 2026 → superseded)*

**Why it fell:** once the you-node took purple as its own, purple on the focus meant two things at once — *you* and *here*. The focus moved to a colour of its own, `here`, and purple narrowed to one meaning. See §2.

### Breathing room: panels in a capped row *(August 2026 → superseded in September)*

Constellation and Focus sat side by side in a row with a height cap (640px) and automatic margins, so the constellation was an **object on the page**, not a background.

**Why it fell:** a graph wants all the room it can get, and a sky of lores wants more. The drawing now fills the window and the panel floats over it; the camera aims at the uncovered strip, so nothing is born behind the panel.

### The you-node as an inverted solid box *(August 2026 → superseded)*

The you-node was to be distinguished by **inversion**, filled with the ink colour rather than purple.

**Why it fell:** with nodes becoming dots, there was no box shape left to invert. It became two open arcs around a diamond, in purple, with a clear zone of its own — see §3.
