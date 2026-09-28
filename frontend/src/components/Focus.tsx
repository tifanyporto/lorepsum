import { useState, useEffect } from "react";
import type {
  Entity,
  EntityImage,
  EntityType,
  Relationship,
} from "../types";
import { API_URL, fetchJson } from "../api";
import Logo from "./Logo";

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
}) {
  const [entity, setEntity] = useState<Entity>();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [entityImages, setEntityImages] = useState<EntityImage[]>([]);
  // which connection types are expanded
  const [openTypes, setOpenTypes] = useState<string[]>([]);

  useEffect(() => {
    if (focusedId === null) return;
    fetchJson<Entity>(`/entities/${focusedId}`)
      .then((data) => setEntity(data))
      .catch((error) => console.error(error));

    fetchJson<Relationship[]>(`/entities/${focusedId}/relationships`)
      .then((data) => setRelationships(data))
      .catch((error) => console.error(error));

    fetchJson<EntityImage[]>(`/entities/${focusedId}/images`)
      .then((data) => setEntityImages(data))
      .catch((error) => console.error(error));

    setOpenTypes([]);
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
        <div className="w-32 h-32 border border-line rounded-md bg-desk overflow-hidden flex shrink-0 items-center justify-center">
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
          <h1 className="font-serif text-[28px] leading-[1.1] tracking-tight text-ink">
            {entity?.name}
          </h1>
          <p className="font-serif text-muted text-sm leading-[1.62] mt-2.75">
            {arrivalGloss ?? entity?.description}
          </p>
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
                    {rows.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelect(c.targetId, c.gloss)}
                        className="group grid grid-cols-[94px_1fr] gap-4 items-baseline py-1.5 pl-0.5 border-l-2 border-transparent hover:border-accent transition-colors cursor-pointer"
                      >
                        {/* on your card the label is your own claim, so it
                            carries your colour */}
                        <span
                          className={`font-mono text-[12px] opacity-70 text-right truncate ${
                            isSelf ? "text-accent" : "text-muted"
                          }`}
                        >
                          {c.label}
                        </span>
                        <span className="font-serif text-ink text-[15.5px] leading-snug transition-colors group-hover:text-accent">
                          {c.name}
                        </span>
                      </div>
                    ))}
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
