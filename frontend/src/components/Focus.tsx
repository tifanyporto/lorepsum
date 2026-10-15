import { useState, useEffect, useMemo } from "react";
import type {
  Entity,
  EntityImage,
  EntityType,
  Relationship,
} from "../types";
import { API_URL, fetchJson } from "../api";
import Logo from "./Logo";

// How long a removed connection can still be brought back. The draining
// hairline below is `--animate-drain` in index.css: the two are the same
// window said twice, and they have to agree.
const UNDO_MS = 6000;

// The Focus: the reading panel of one entity - its cover, who it is, and the
// connections it asserts, grouped by type.
function Focus({
  focusedId,
  arrivalGloss,
  selfId,
  entities,
  entityTypes,
  allRelationships,
  onSelect,
  onRemove,
  onEdit,
  onEditEntity,
  isOutside,
}: {
  focusedId: number | null;
  // the gloss of the connection that brought you here, read in place of the
  // description; null when you arrived some other way
  arrivalGloss: string | null;
  selfId: number | null | undefined;
  entities: Entity[];
  entityTypes: EntityType[];
  allRelationships: Relationship[];
  // a connection was clicked: its target, and the gloss it carries
  onSelect: (id: number, gloss: string | null) => void;
  // The cords back to the app. The panel owns none of this data - it reads
  // the list the app holds - so it cannot remove or rename anything itself.
  // It says what happened and the app does it.
  onRemove: (id: number) => Promise<void>;
  // `Partial<Pick<...>>` is the type saying "some of these two, maybe only
  // one": the label, the gloss, or both
  onEdit: (
    id: number,
    changes: Partial<Pick<Relationship, "label" | "gloss">>,
  ) => Promise<void>;
  onEditEntity: (
    id: number,
    changes: Partial<Pick<Entity, "name" | "description">>,
  ) => Promise<void>;
  // whether an entity lives outside the lore on screen; such a connection is
  // written in the colour of the horizon
  isOutside?: (id: number) => boolean;
}) {
  // Who is on the card and what it says come from what the app already
  // holds - it loads every entity and every connection at the start, and
  // passes both in. Fetching them again by id meant the panel drew its empty
  // shell until the answer arrived: on entering a lore, a whole card's worth
  // of canvas blanked and refilled, which reads as a flash.
  const entity = entities.find((e) => e.id === focusedId);
  const relationships = allRelationships.filter(
    (r) => r.source_id === focusedId,
  );
  // the images are the one thing the app does not carry, so they still come
  // per entity; the cover has a placeholder to stand in until they do
  const [entityImages, setEntityImages] = useState<EntityImage[]>([]);
  // which connection types are expanded
  const [openTypes, setOpenTypes] = useState<string[]>([]);
  // the connection whose label is open for writing, and what has been typed
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [glossDraft, setGlossDraft] = useState("");
  // which field of the card itself is open, and what is in it
  const [cardField, setCardField] = useState<"name" | "description" | null>(
    null,
  );
  const [cardDraft, setCardDraft] = useState("");
  // the field opens with the current label already inside, which is not the
  // same as you having typed something: until the first keystroke the list
  // shows everything
  const [typed, setTyped] = useState(false);
  // a connection removed on screen and not yet on the server. Nothing is sent
  // while the window lasts, so reloading the page in the middle of it removes
  // nothing at all.
  const [pending, setPending] = useState<{ id: number; timer: number } | null>(
    null,
  );

  // the labels you have used, the commonest first - what the composer offers
  const usedLabels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRelationships)
      if (r.label) counts.set(r.label, (counts.get(r.label) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);
  }, [allRelationships]);

  const closeEditor = () => {
    setEditingId(null);
    setDraft("");
    setGlossDraft("");
    setTyped(false);
  };
  // a connection may carry neither label nor gloss, and an empty field is how
  // that looks from the inside
  const openEditor = (
    id: number,
    label: string | null,
    gloss: string | null,
  ) => {
    setEditingId(id);
    setDraft(label ?? "");
    setGlossDraft(gloss ?? "");
    setTyped(false);
  };
  // Saving does not close: the row holds two fields, and leaving the first
  // to reach the second must not take the second away. Closing is Escape,
  // Enter, or choosing from the list.
  //
  // A value that did not change is a request for nothing.
  const saveLabel = (id: number, label: string, was: string | null) => {
    const next = label.trim();
    if (next === "" || next === (was ?? "")) return;
    onEdit(id, { label: next }).catch((error) => console.error(error));
  };
  // an emptied gloss is not an empty string, it is the absence of one
  const saveGloss = (id: number, gloss: string, was: string | null) => {
    const next = gloss.trim();
    if (next === (was ?? "")) return;
    onEdit(id, { gloss: next === "" ? null : next }).catch((error) =>
      console.error(error),
    );
  };
  const startRemoval = (id: number) => {
    closeEditor();
    const timer = window.setTimeout(() => {
      setPending(null);
      onRemove(id).catch((error) => console.error(error));
    }, UNDO_MS);
    setPending({ id, timer });
  };
  const openCardField = (field: "name" | "description", value: string) => {
    setCardField(field);
    setCardDraft(value);
  };
  // the name is the one field with nothing to fall back on: an entity with no
  // name is a dot nobody can read, so an emptied name is simply refused
  const saveCardField = (was: string | null) => {
    const field = cardField;
    const next = cardDraft.trim();
    setCardField(null);
    if (entity === undefined || field === null) return;
    if (field === "name" && next === "") return;
    if (next === (was ?? "")) return;
    onEditEntity(entity.id, {
      [field]: field === "description" && next === "" ? null : next,
    }).catch((error) => console.error(error));
  };

  const undoRemoval = () => {
    if (pending === null) return;
    window.clearTimeout(pending.timer);
    setPending(null);
  };

  useEffect(() => {
    if (focusedId === null) return;
    fetchJson<EntityImage[]>(`/entities/${focusedId}/images`)
      .then((data) => setEntityImages(data))
      .catch((error) => console.error(error));

    setOpenTypes([]);
    setEditingId(null);
    setCardField(null);
  }, [focusedId]);

  const type = entityTypes.find((t) => t.id === entity?.entity_type_id);
  const coverImage = entityImages.find((i) => i.cover);
  const coverUrl = `${API_URL}/media/${coverImage?.path}`;
  const gallery = entityImages.filter((g) => !g.cover);
  const thumbnailGallery = gallery.slice(0, 5);
  const remainingPhoto = gallery.length - thumbnailGallery.length;
  // each connection already resolved: the target's name and its type name
  const connections = relationships.map((r) => {
    const target = entities.find((e) => e.id === r.target_id);
    const targetType = entityTypes.find((t) => t.id === target?.entity_type_id);
    return {
      id: r.id,
      label: r.label,
      targetId: r.target_id,
      name: target?.name,
      gloss: r.gloss,
      typeName: targetType?.name ?? "others",
    };
  });
  // the types present in those connections, deduplicated
  const connectionTypes = [...new Set(connections.map((c) => c.typeName))];
  // the panel is showing you. Purple is yours in the panel as in the graph: it
  // marks you at the top of this card and the claims in your connection list.
  // It follows the entity on screen, not the focus — the focus changes on the
  // click, the card only when its data arrives, and the kicker has to change
  // together with the name beneath it.
  const isSelf = selfId != null && entity?.id === selfId;
  // on anyone else's card: what you said about them, if you said anything
  const yourEdgesHere =
    isSelf || entity == null || selfId == null
      ? []
      : allRelationships.filter(
          (r) => r.source_id === selfId && r.target_id === entity.id,
        );

  return (
    <>
      {/* on your own card the type gives way to YOU, set above the whole
          header in the grammar of the panel's section headers — mono label,
          hairline running to the edge — but in your purple and a size up,
          so it heads the card instead of tagging it */}
      {isSelf && (
        <div className="flex items-center gap-2.5 mb-3.5">
          <h2 className="font-mono text-accent text-[13px] uppercase tracking-[0.24em]">
            you
          </h2>
          <span className="flex-1 h-px bg-accent/35" />
        </div>
      )}
      {/* header: cover + identity */}
      <div className="flex gap-4.5 items-start">
        <div className="w-32 aspect-3/4 border border-line rounded-md bg-desk overflow-hidden flex shrink-0 items-center justify-center">
          {coverImage ? (
            <img
              className="w-full h-full object-cover"
              src={coverUrl}
              alt={coverImage.description ?? `${entity?.name}'s cover photo`}
            />
          ) : (
            <Logo muted className="w-12 h-12" />
          )}
        </div>
        <div>
          {!isSelf && (
            // the kicker. On a card you point at, it also names your claim,
            // in purple: purple at the top of a card always means you
            <h2 className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em] mb-1.75">
              {type?.name}
              {yourEdgesHere.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-accent">
                    {[
                      "you",
                      ...yourEdgesHere.flatMap((r) =>
                        r.label ? [r.label] : [],
                      ),
                    ].join(" · ")}
                  </span>
                </>
              )}
            </h2>
          )}
          {/* The text you read is the text you write. The field keeps the
              typeface, the size and the place of what it replaces - all it
              gains is the purple rule underneath, which is the app saying
              this is yours. */}
          {cardField === "name" ? (
            <input
              autoFocus
              value={cardDraft}
              onChange={(e) => setCardDraft(e.target.value)}
              onBlur={() => saveCardField(entity?.name ?? null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCardField(entity?.name ?? null);
                if (e.key === "Escape") setCardField(null);
              }}
              className="w-full font-serif text-[28px] leading-[1.1] tracking-tight text-ink bg-transparent border-0 border-b border-accent outline-none"
            />
          ) : (
            <h1
              onClick={() => openCardField("name", entity?.name ?? "")}
              className="font-serif text-[28px] leading-[1.1] tracking-tight text-ink cursor-text hover:underline hover:decoration-dotted hover:decoration-accent hover:underline-offset-4"
            >
              {entity?.name}
            </h1>
          )}
          {cardField === "description" ? (
            <textarea
              autoFocus
              rows={5}
              value={cardDraft}
              onChange={(e) => setCardDraft(e.target.value)}
              onBlur={() => saveCardField(entity?.description ?? null)}
              // One rule across every field on this card: Enter saves,
              // Escape discards. In a box that holds more than one line that
              // costs Shift+Enter for the line break - a smaller price than
              // a field with no way out but the mouse.
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveCardField(entity?.description ?? null);
                }
                if (e.key === "Escape") setCardField(null);
              }}
              className="w-full resize-none scrollbar-accent font-serif text-muted text-sm leading-[1.62] mt-2.75 bg-transparent border-0 border-b border-accent outline-none"
            />
          ) : (
            <p
              // Arriving through a connection, this line is the gloss and not
              // the description - someone else's sentence standing in. It is
              // edited on the connection that owns it, so here it only reads.
              onClick={
                arrivalGloss === null
                  ? () =>
                      openCardField("description", entity?.description ?? "")
                  : undefined
              }
              className={`font-serif text-muted text-sm leading-[1.62] mt-2.75 ${
                arrivalGloss === null
                  ? "cursor-text hover:underline hover:decoration-dotted hover:decoration-accent hover:underline-offset-4"
                  : ""
              }`}
            >
              {arrivalGloss ?? entity?.description}
            </p>
          )}
          {/* the size of what you built — the short version; the full
              statistics belong to a place of their own */}
          {isSelf && (
            <p className="font-mono text-muted text-[12px] opacity-70 mt-2.75">
              {entities.length}{" "}
              {entities.length === 1 ? "entity" : "entities"} ·{" "}
              {allRelationships.length}{" "}
              {allRelationships.length === 1 ? "connection" : "connections"}
            </p>
          )}
        </div>
      </div>

      {/* connections, grouped by type */}
      <section className="mt-7">
        <div className="flex items-center gap-2.5 mb-4.5">
          <span className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em]">
            connections
          </span>
          <span className="flex-1 h-px bg-line" />
          {relationships.length > 0 && (
            <button
              onClick={() =>
                setOpenTypes(
                  openTypes.length === connectionTypes.length
                    ? []
                    : connectionTypes,
                )
              }
              className="font-mono text-muted text-[9.5px] uppercase tracking-[0.14em] cursor-pointer hover:text-accent transition-colors"
            >
              {openTypes.length === connectionTypes.length
                ? "collapse all"
                : "expand all"}
            </button>
          )}
          <span className="font-mono text-muted text-[9.5px] opacity-70">
            {relationships.length}
          </span>
        </div>

        {relationships.length === 0 ? (
          <p className="font-mono text-muted text-[12px]">
            there are no connections yet.
          </p>
        ) : (
          connectionTypes.map((typeName) => {
            const rows = connections.filter((c) => c.typeName === typeName);
            const isOpen = openTypes.includes(typeName);
            return (
              <div key={typeName} className="mb-5.5 last:mb-0">
                <div
                  onClick={() =>
                    setOpenTypes(
                      isOpen
                        ? openTypes.filter((t) => t !== typeName)
                        : [...openTypes, typeName],
                    )
                  }
                  className={`flex items-baseline gap-2.5 mb-2 cursor-pointer font-mono text-[14px] transition-colors hover:text-accent ${
                    isOpen ? "text-ink" : "text-muted"
                  }`}
                >
                  <span
                    className={`inline-block w-1.75 text-[9px] opacity-50 transition-transform duration-200 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    ▶
                  </span>
                  <span>{typeName}</span>
                  <span className="text-[9.5px] opacity-55">
                    {rows.length}
                  </span>
                </div>

                {/* the drawer: 0fr -> 1fr is what makes the height animatable */}
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    {rows.map((c) => {
                      const editing = editingId === c.id;
                      const going = pending !== null && pending.id === c.id;
                      const query = draft.trim().toLowerCase();
                      const offered = usedLabels
                        .filter((l) => !typed || l.includes(query))
                        .slice(0, 5);
                      // offer to take a word only once it is a word, and only
                      // when it is not already one of yours
                      const isNewLabel =
                        typed &&
                        query !== "" &&
                        !usedLabels.some((l) => l.toLowerCase() === query);
                      return (
                        // The row is two halves and they mean two different
                        // things, so the rule on its left takes the colour of
                        // whichever one you are over: purple where the claim
                        // is yours to rewrite, gold where the name is a place
                        // to go.
                        <div
                          key={c.id}
                          className="grid grid-cols-[94px_1fr] gap-4 items-baseline pl-0.5 border-l-2 border-transparent transition-colors [&:has(.lab:hover)]:border-accent [&:has(.tgt:hover)]:border-here"
                        >
                          {going ? (
                            <>
                              {/* removed, and still here. The half that was
                                  your claim becomes the only thing left to
                                  say about it. */}
                              <button
                                onClick={undoRemoval}
                                className="font-mono text-[12px] text-accent text-right py-1.5 cursor-pointer hover:underline"
                              >
                                undo
                              </button>
                              <span className="font-serif text-[15.5px] leading-snug text-muted/40 line-through decoration-muted py-1.5">
                                {c.name}
                              </span>
                              {/* what is left of the window, said with the
                                  same hairline that separates everything */}
                              <span className="col-span-2 h-px bg-accent/50 origin-left animate-drain mb-2" />
                            </>
                          ) : editing ? (
                            <>
                              <input
                                autoFocus
                                value={draft}
                                onChange={(e) => {
                                  setDraft(e.target.value);
                                  setTyped(true);
                                }}
                                onBlur={() => saveLabel(c.id, draft, c.label)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveLabel(c.id, draft, c.label);
                                    closeEditor();
                                  }
                                  if (e.key === "Escape") closeEditor();
                                }}
                                className="w-full font-mono text-[12px] text-accent text-right bg-transparent border-0 border-b border-accent outline-none py-1"
                              />
                              <span className="font-serif text-[15.5px] leading-snug text-muted py-1.5">
                                {c.name}
                              </span>
                              {/* the list, in the grammar of the LoreCard:
                                  canvas, one hairline, no shadow. It sits in
                                  the flow rather than floating, because the
                                  drawer above it clips what overflows. */}
                              <div className="col-span-2 mt-1 mb-2 rounded-md border border-accent/50 bg-canvas px-3.5 py-3 animate-fade-in">
                                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted mb-1.5">
                                  labels you use
                                </p>
                                {offered.map((label) => (
                                  <button
                                    key={label}
                                    // mousedown, not click: the field's blur
                                    // would fire first and close the list
                                    // before a click ever landed
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      saveLabel(c.id, label, c.label);
                                      closeEditor();
                                    }}
                                    className="block w-full text-left py-0.5 pl-2 border-l-2 border-transparent hover:border-accent font-mono text-[12px] text-muted hover:text-accent cursor-pointer transition-colors truncate"
                                  >
                                    {label}
                                  </button>
                                ))}
                                {/* a word you have not used before is not an
                                    error to correct but a row to take */}
                                {isNewLabel && (
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      saveLabel(c.id, draft, c.label);
                                      closeEditor();
                                    }}
                                    className="block w-full text-left py-0.5 pl-2 border-l-2 border-transparent hover:border-accent font-mono text-[12px] text-accent cursor-pointer transition-colors truncate"
                                  >
                                    + {draft.trim()}
                                  </button>
                                )}
                                <span className="block my-2 h-px bg-line" />
                                {/* the last row is always the act that
                                    changes the world, and this one is the
                                    only act that destroys something */}
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    startRemoval(c.id);
                                  }}
                                  className="block w-full text-left py-0.5 pl-2 border-l-2 border-transparent hover:border-danger font-mono text-[12px] text-muted hover:text-danger cursor-pointer transition-colors"
                                >
                                  remove this connection
                                </button>
                              </div>
                              {/* The gloss belongs to the connection, not to
                                  either end of it, and it is only ever read on
                                  arrival - so it is only ever written where
                                  the arrival is defined. */}
                              <div className="col-span-2 mb-3">
                                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted opacity-80 mb-1">
                                  gloss — what you say when someone arrives
                                  through it
                                </p>
                                <textarea
                                  rows={2}
                                  value={glossDraft}
                                  onChange={(e) => setGlossDraft(e.target.value)}
                                  onBlur={() =>
                                    saveGloss(c.id, glossDraft, c.gloss)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      saveGloss(c.id, glossDraft, c.gloss);
                                      closeEditor();
                                    }
                                    if (e.key === "Escape") closeEditor();
                                  }}
                                  className="w-full resize-none scrollbar-accent font-serif text-[13.5px] leading-[1.55] text-muted bg-transparent border-0 border-b border-accent outline-none"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              {/* the label is a claim of yours: on your own
                                  card it already carries your colour, and on
                                  anyone's it is the half you can rewrite */}
                              <span
                                onClick={() =>
                                  openEditor(c.id, c.label, c.gloss)
                                }
                                className={`lab font-mono text-[12px] opacity-70 text-right truncate py-1.5 cursor-text transition-colors hover:opacity-100 hover:text-accent hover:underline hover:decoration-dotted hover:underline-offset-[3px] ${
                                  isSelf ? "text-accent" : "text-muted"
                                }`}
                              >
                                {c.label}
                              </span>
                              {/* the name is a place: it takes you there */}
                              <span
                                onClick={() => onSelect(c.targetId, c.gloss)}
                                className={`tgt font-serif text-[15.5px] leading-snug py-1.5 cursor-pointer transition-colors hover:text-here ${
                                  isOutside?.(c.targetId)
                                    ? "text-beyond"
                                    : "text-ink"
                                }`}
                              >
                                {c.name}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* gallery */}
      {gallery.length > 0 && (
        <section className="mt-7.5">
          <div className="flex items-center gap-2.5 mb-4.5">
            <span className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em]">
              gallery
            </span>
            <span className="flex-1 h-px bg-line" />
            <span className="font-mono text-muted text-[9.5px] opacity-70">
              {gallery.length}
            </span>
          </div>
          <div className="flex gap-2">
            {thumbnailGallery.map((i) => {
              const url = `${API_URL}/media/${i.path}`;
              return (
                <img
                  key={i.id}
                  src={url}
                  alt={i.description ?? `${entity?.name}`}
                  className="w-14.5 h-14.5 object-cover rounded-md border border-line"
                />
              );
            })}
            {remainingPhoto > 0 && (
              <div className="w-14.5 h-14.5 rounded-md border border-dashed border-line flex items-center justify-center bg-desk text-muted font-mono text-[11px]">
                +{remainingPhoto}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

export default Focus;
