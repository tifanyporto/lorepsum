# lorepsum

> **Everything is an entity, and everything can connect.**

A personal knowledge graph for the things you love.

Not a notes app and not a catalogue. The value is not in *storing* things — it is in **exploring the connections** between them. You land on an entity, read it, and jump to a connected one. That loop is the product.

The name is `lore` + `ipsum`. Lorem ipsum is filler text that means nothing. This is your lore, which means everything.

---

## The idea

Everything you care about is the same kind of thing: a movie, a person, a place, an object, a feeling. Calling them all **entities** is what lets any of them connect to any other — and the connections are where the meaning lives. Batman connects to Gotham, Gotham connects to Arkham, Arkham connects to fear, and fear connects back to a dozen people who never met.

You do not browse a list. You wander.

## The screen

Two panels that never leave each other.

**The constellation** is the whole graph — every entity a dot, every relationship a line. The layout is computed **once**, when the app opens, and never again. That is what turns it from a drawing that redraws itself into a **place**: you drag it, you zoom it, and the framing you built survives your clicks. Click a node and the camera glides to it, so you see *where you came from* on the way.

**The reading panel** is the museum label — cover, type, name, description, and the entity's connections grouped by what they point at, collapsed by default. A card opens as an *index*:

```
characters 13 · movies 4 · places 5 · objects 4
```

You see the shape of an entity's world before reading a single name.

## The gloss

Batman's relationship to fear is not Sinestro's relationship to fear, and that difference belongs to neither of them.

An early description of *Fear* read "the weapon **he** chose" — a sentence that only made sense if you had arrived from Batman. Coming from Scarecrow, it talks about a stranger. So the rule became:

> **The entity describes itself. The relationship describes the bond.**

Context lives on the **edge**. Arrive at an entity *through* a connection and you read what that connection says; teleport there by search and you read the entity's own words. Same destination, different door, different text.

## Design

Paper by default, night as the alternate — same drawing, only the palette swaps. **Fraunces** carries content, **IBM Plex Mono** carries labels: serif is content, mono is chrome.

The accent purple is **reserved** — the focused node, what touches it, and hover. Nothing else. Colour means something here; it is never decoration. No gradients, no shadows, no stacked cards.

The mark is a solid centre node radiating four connections, one of them in the accent. It is the you-node, which is also where the app lands.

Full reasoning — including everything that was rejected and why — in [`docs/design.md`](docs/design.md).

## Built on

Python · FastAPI · SQLAlchemy · Pydantic · Alembic
React · TypeScript · Vite · Tailwind CSS · d3-force
PostgreSQL

**The database runs on a phone.** A POCO F3 running [postmarketOS](https://postmarketos.org/) — real Linux on the handset, not a container. An always-on ARM machine with a battery for a UPS, drawing a few watts on a shelf, reachable from anywhere over [Tailscale](https://tailscale.com/) and exposed to nothing else. The data lives on hardware its owner holds. How it was built: [`docs/server.md`](docs/server.md).

## Status

Working software, single user, in active development. Not deployed.

Next up: the you-node — your profile is not a settings screen, it is the Focus of yourself, and it is where the app opens. After that, **lores**: a slice of the graph rather than a container, so an entity can belong to several at once. Lores are never linked to each other; they touch when they share an entity. A Batman/Spider-Man crossover is one comic in two lores, and that is the whole mechanism.

Native Windows, Android and iOS clients are planned after the web app. No Electron.

---

© 2026 Tifany Porto. All rights reserved. See [LICENSE](LICENSE).
