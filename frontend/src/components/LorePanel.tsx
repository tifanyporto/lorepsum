import type { Entity, EntityType } from "../types";
import type { Sky, SkyLore } from "../graph/sky";

// The reading panel of a lore, as the sky shows it: what it holds, how much of
// it is yours, which lores it touches - and the way in.
function LorePanel({
  skyLore,
  sky,
  entities,
  entityTypes,
  onEnter,
  onFocusLore,
}: {
  skyLore: SkyLore;
  sky: Sky;
  entities: Entity[];
  entityTypes: EntityType[];
  onEnter: () => void;
  onFocusLore: (id: number) => void;
}) {
  const { lore, layout, yours } = skyLore;
  const count = layout.nodes.length;
  const connections = layout.links.length;

  // how many of each type, the largest first
  const inside = new Set(layout.nodes.map((n) => n.id));
  const perType = new Map<string, number>();
  for (const e of entities) {
    if (!inside.has(e.id)) continue;
    const name =
      entityTypes.find((t) => t.id === e.entity_type_id)?.name ?? "others";
    perType.set(name, (perType.get(name) ?? 0) + 1);
  }
  const types = [...perType.entries()].sort((a, b) => b[1] - a[1]);

  // the lores it touches, and through which entities - the bridges that
  // leave from it, gathered by where they lead
  const touches = new Map<number, string[]>();
  for (const b of sky.bridges) {
    if (!b.loreIds.includes(lore.id)) continue;
    for (const other of b.loreIds) {
      if (other === lore.id) continue;
      touches.set(other, [...(touches.get(other) ?? []), b.name]);
    }
  }
  const touching = [...touches.entries()]
    .map(([id, names]) => ({
      id,
      name: sky.lores.find((s) => s.lore.id === id)?.lore.name ?? "",
      names,
    }))
    .sort((a, b) => b.names.length - a.names.length);

  return (
    <>
      <h2 className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em] mb-1.75">
        lore
      </h2>
      <h1 className="font-serif text-[28px] leading-[1.1] tracking-tight text-ink">
        {lore.name}
      </h1>
      {lore.description && (
        <p className="font-serif text-muted text-sm leading-[1.62] mt-2.75">
          {lore.description}
        </p>
      )}
      <p className="font-mono text-muted text-[12px] opacity-70 mt-2.75">
        {count} {count === 1 ? "entity" : "entities"} · {connections}{" "}
        {connections === 1 ? "connection" : "connections"}
      </p>
      {/* why it sits where it sits: the more of yours, the closer */}
      {yours > 0 && (
        <p className="font-mono text-accent text-[12px] mt-1">
          {yours} of your connections point here
        </p>
      )}
      <button
        onClick={onEnter}
        className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink border border-line rounded px-3 py-1.5 cursor-pointer hover:border-here hover:text-here transition-colors"
      >
        enter ↗
      </button>

      {types.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center gap-2.5 mb-4.5">
            <span className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em]">
              types
            </span>
            <span className="flex-1 h-px bg-line" />
            <span className="font-mono text-muted text-[9.5px] opacity-70">
              {types.length}
            </span>
          </div>
          {types.map(([name, n]) => (
            <div
              key={name}
              className="flex items-baseline gap-2.5 mb-2 font-mono text-[14px] text-ink"
            >
              <span>{name}</span>
              <span className="text-[9.5px] opacity-55">{n}</span>
            </div>
          ))}
        </section>
      )}

      {touching.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center gap-2.5 mb-4.5">
            <span className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em]">
              touches
            </span>
            <span className="flex-1 h-px bg-line" />
            <span className="font-mono text-muted text-[9.5px] opacity-70">
              {touching.length}
            </span>
          </div>
          {touching.map((t) => (
            <div
              key={t.id}
              onClick={() => onFocusLore(t.id)}
              className="group py-1.5 pl-0.5 mb-1 border-l-2 border-transparent hover:border-beyond transition-colors cursor-pointer"
            >
              <div className="flex items-baseline gap-2.5">
                <span className="font-serif text-beyond text-[15.5px] leading-snug">
                  {t.name}
                </span>
                <span className="font-mono text-muted text-[11px]">
                  through {t.names.length}
                </span>
              </div>
              <p className="font-mono text-muted text-[11px] opacity-70 mt-0.5">
                {t.names.join(" · ")}
              </p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export default LorePanel;
