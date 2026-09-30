import { useState, useEffect, useMemo, useRef } from "react";
import type { Relationship } from "../types";
import { EDGE_CLEAR_RADIUS, edgePath } from "../graph/geometry";
import {
  panelReserve,
  useBoxSize,
  visibleCentre,
  zoomBetween,
  type SkyCamera,
} from "../graph/camera";
import type { Sky as SkyData } from "../graph/sky";
import { placeLabels } from "../graph/labels";
import YouNode from "./YouNode";
import LoreCard, { type Door } from "./LoreCard";
import { useCard } from "./useCard";

// the camera the person moves: the sky point at the centre, and a zoom on top
// of the one that fits the whole sky in view
export type SkyView = { x: number; y: number; zoom: number };

// A passage between the sky and a lore. `inside` is the constellation's own
// camera at the lore end: where a dive lands, or where a rise leaves from.
export type Passage = {
  kind: "dive" | "rise";
  loreId: number;
  inside: { pan: { x: number; y: number }; zoom: number };
};

// how far, in screen pixels, a press may travel and still count as a click
const CLICK_SLOP = 4;
// a node in a miniature, in screen pixels
const MINI_NODE = 1.9;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// ink, carrying `amount` of the focus colour
const tint = (amount: number) =>
  amount <= 0
    ? "var(--color-ink)"
    : `color-mix(in srgb, var(--color-here) ${Math.round(amount * 100)}%, var(--color-ink))`;

// The sky of lores: you in the centre, and every lore around you as its own
// constellation in miniature.
function Sky({
  sky,
  selfId,
  allRelationships,
  focusedLoreId,
  view,
  onView,
  onFocusLore,
  onEnter,
  homesOf,
  onOpen,
  passage,
  progress,
}: {
  sky: SkyData;
  selfId: number | null | undefined;
  allRelationships: Relationship[];
  // the lore in focus; null when the focus is you
  focusedLoreId: number | null;
  view: SkyView;
  onView: (view: SkyView) => void;
  onFocusLore: (id: number | null) => void;
  onEnter: (id: number) => void;
  // the lores an entity lives in, most yours first
  homesOf: (id: number) => Door[];
  // a door on a bridge's card: dive into that lore, with the entity in focus
  onOpen: (entityId: number, loreId: number) => void;
  passage: Passage | null;
  // how far the passage has gone, from 0 to 1
  progress: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useBoxSize(svgRef);
  const centre = visibleCentre(box.width, box.height);
  const [hoveredLoreId, setHoveredLoreId] = useState<number | null>(null);
  // the bridge whose card is open is the one lit
  const cards = useCard();
  const hoveredBridge = cards.card?.id ?? null;
  // a press on the sky: a pan once it travels, a click until then. The click
  // handlers read `moved` to tell the two apart.
  const pressRef = useRef<{
    startX: number;
    startY: number;
    from: SkyView;
  } | null>(null);
  const movedRef = useRef(false);
  // each lore's nodes by id, to find an edge's ends without a search
  const nodesById = useMemo(
    () =>
      new Map(
        sky.lores.map((s) => [
          s.lore.id,
          new Map(s.layout.nodes.map((n) => [n.id, n])),
        ]),
      ),
    [sky],
  );

  // the zoom that fits every lore, with its name, inside the uncovered strip -
  // and fills it when the sky is small
  const reach = Math.max(
    120,
    ...sky.lores.map((s) => Math.hypot(s.x, s.y) + s.radius + 60),
  );
  const fit = Math.min(1.5, Math.min(centre.x, box.height / 2 - 50) / reach);
  const skyCamera: SkyCamera = { x: view.x, y: view.y, k: fit * view.zoom };

  useEffect(() => {
    const el = svgRef.current;
    if (el === null) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (passage !== null) return;
      // up zooms in, down zooms out; clamped like the constellation's
      const zoom = e.deltaY < 0 ? view.zoom * 1.1 : view.zoom / 1.1;
      onView({ ...view, zoom: Math.min(2.5, Math.max(0.4, zoom)) });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [view, onView, passage]);

  // --- the passage -------------------------------------------------------
  // `inside` runs from 0, the sky as it rests, to 1, the lore's constellation
  // exactly as it is drawn once entered: same place, same size, same colours.
  // The last frame of a dive is the first frame of the constellation, and a
  // rise starts from wherever the constellation's camera was.
  const target = sky.lores.find((s) => s.lore.id === passage?.loreId);
  const eased = easeInOut(progress);
  const inside =
    passage === null || target === undefined
      ? 0
      : passage.kind === "dive"
        ? eased
        : 1 - eased;
  const insideZoom = passage?.inside.zoom ?? 1;
  const insidePan = passage?.inside.pan ?? { x: 0, y: 0 };
  let camera = skyCamera;
  if (passage !== null && target !== undefined) {
    // the camera that frames the lore the way its constellation does
    const lore: SkyCamera = {
      x: target.x - (insidePan.x * target.scale) / insideZoom,
      y: target.y - (insidePan.y * target.scale) / insideZoom,
      k: insideZoom / target.scale,
    };
    camera =
      passage.kind === "dive"
        ? zoomBetween(skyCamera, lore, eased)
        : zoomBetween(lore, skyCamera, eased);
  }
  const toScreen = (x: number, y: number) => ({
    x: (x - camera.x) * camera.k + centre.x,
    y: (y - camera.y) * camera.k + centre.y,
  });
  // the other lores leave by the edges, and fade on the way
  const away = (1 - inside) ** 2;

  // The you-node never moves with the camera. It sits at the centre of the
  // sky, and the lore comes to settle around it: at the end of a dive it is
  // exactly where the constellation draws it.
  const youAtRest = {
    x: -skyCamera.x * skyCamera.k + centre.x,
    y: -skyCamera.y * skyCamera.k + centre.y,
  };
  const you = {
    x: lerp(youAtRest.x, centre.x + insidePan.x, inside),
    y: lerp(youAtRest.y, centre.y + insidePan.y, inside),
  };
  const youScale = lerp(1, insideZoom, inside);

  // where each entity is drawn in each lore it belongs to
  const copies = new Map<number, { loreId: number; x: number; y: number }[]>();
  for (const s of sky.lores) {
    const o = toScreen(s.x, s.y);
    const sigma = s.scale * camera.k;
    for (const n of s.layout.nodes) {
      const list = copies.get(n.id) ?? [];
      list.push({ loreId: s.lore.id, x: o.x + n.x * sigma, y: o.y + n.y * sigma });
      copies.set(n.id, list);
    }
  }

  // your connections, reaching into every lore that holds their target. The
  // fade is the constellation's: solid near you, gone by the farthest tip -
  // so the lores that are least yours get the faintest lines.
  const yourEdges =
    selfId == null
      ? []
      : allRelationships
          .filter((r) => r.source_id === selfId)
          .flatMap((r) =>
            (copies.get(r.target_id) ?? []).map((c) => ({ id: r.id, ...c })),
          );
  const farthest = (edges: typeof yourEdges) =>
    Math.max(1, ...edges.map((e) => Math.hypot(e.x - you.x, e.y - you.y)));
  const fadeReach = lerp(
    farthest(yourEdges),
    farthest(yourEdges.filter((e) => e.loreId === passage?.loreId)),
    inside,
  );
  // the targets of your connections: the neighbours the constellation lights
  // when it opens with you in focus
  const yourTargetIds = new Set(
    allRelationships
      .filter((r) => r.source_id === selfId)
      .map((r) => r.target_id),
  );
  const youFocused = focusedLoreId === null;
  // names shrink a little with a sky zoomed out to fit, never below legible
  const nameSize = Math.max(12, Math.min(15, 15 * skyCamera.k));

  const hovered = sky.bridges.find((b) => b.entityId === hoveredBridge);

  // Where every name goes, so that none covers another. Each lore's name
  // prefers the side away from you - bridges run between lores, so what lies
  // outward is free - then the other side, then beside the miniature. The
  // lore in focus is placed first, then the one under the pointer, then the
  // largest.
  const serif = '"Fraunces", Georgia, serif';
  const mono = '"IBM Plex Mono", monospace';
  const loreRank = (id: number) =>
    id === focusedLoreId ? 0 : id === hoveredLoreId ? 1 : 2;
  const labels = placeLabels(
    [
      ...[...sky.lores]
        .sort(
          (a, b) =>
            loreRank(a.lore.id) - loreRank(b.lore.id) ||
            b.layout.nodes.length - a.layout.nodes.length,
        )
        .map((s) => {
          const o = toScreen(s.x, s.y);
          const sigma = s.scale * camera.k;
          const radius = s.radius * camera.k;
          // clear of the rim and of any straggler reaching past it
          const xs = s.layout.nodes.map((n) => n.x * sigma);
          const ys = s.layout.nodes.map((n) => n.y * sigma);
          const top = Math.min(-radius, ...ys);
          const bottom = Math.max(radius, ...ys);
          const left = Math.min(-radius, ...xs);
          const right = Math.max(radius, ...xs);
          const over = { dx: 0, dy: top - 32, anchor: "middle" as const };
          const under = { dx: 0, dy: bottom + 24, anchor: "middle" as const };
          const sides = [
            { dx: right + 12, dy: 5, anchor: "start" as const },
            { dx: left - 12, dy: 5, anchor: "end" as const },
          ];
          const count = s.layout.nodes.length;
          return {
            key: `lore-${s.lore.id}`,
            x: o.x,
            y: o.y,
            r: radius,
            // room for the line that appears under the name on hover, so a
            // hover never moves a name
            lines: [
              { text: s.lore.name, size: nameSize, family: serif },
              {
                text: `${count} ${count === 1 ? "entity" : "entities"} · enter ↗`,
                size: Math.max(10, nameSize - 4),
                family: mono,
              },
            ],
            spots:
              o.y < youAtRest.y - radius * 0.5
                ? [over, under, ...sides]
                : [under, over, ...sides],
            must: true,
          };
        }),
    ],
    [
      { x: you.x, y: you.y, r: 36 * youScale },
      ...sky.lores.map((s) => {
        const o = toScreen(s.x, s.y);
        return { key: `lore-${s.lore.id}`, x: o.x, y: o.y, r: s.radius * camera.k };
      }),
    ],
  );

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className={`absolute inset-0 w-full h-full touch-none select-none ${
          passage ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
        onPointerDown={(e) => {
          // pressing anywhere else closes a pinned card
          cards.close();
          pressRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            from: view,
          };
          movedRef.current = false;
        }}
        onPointerMove={(e) => {
          const press = pressRef.current;
          if (press === null) return;
          const dx = e.clientX - press.startX;
          const dy = e.clientY - press.startY;
          if (!movedRef.current && Math.hypot(dx, dy) < CLICK_SLOP) return;
          movedRef.current = true;
          onView({
            ...press.from,
            x: press.from.x - dx / skyCamera.k,
            y: press.from.y - dy / skyCamera.k,
          });
        }}
        onPointerUp={() => (pressRef.current = null)}
        onPointerCancel={() => (pressRef.current = null)}
        onPointerLeave={() => (pressRef.current = null)}
      >
        <defs>
          <radialGradient
            id="sky-self-fade"
            gradientUnits="userSpaceOnUse"
            cx={you.x}
            cy={you.y}
            r={fadeReach}
          >
            <stop
              offset="0"
              stopColor="var(--color-accent)"
              stopOpacity={0.85}
            />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* bridges: an arm from each shared entity to its place in every
            lore that holds it, bending around you. Under everything else. */}
        <g opacity={away} fill="none">
          {sky.bridges.map((b) => {
            const at = toScreen(b.x, b.y);
            const lit = b.entityId === hoveredBridge;
            return b.arms.map((arm) => {
              const c = toScreen(arm.cx, arm.cy);
              const to = toScreen(arm.x, arm.y);
              return (
                <path
                  key={`${b.entityId}-${arm.loreId}`}
                  d={`M ${at.x} ${at.y} Q ${c.x} ${c.y} ${to.x} ${to.y}`}
                  stroke={lit ? "var(--color-here)" : "var(--color-ink)"}
                  strokeOpacity={lit ? 0.6 : 0.1}
                />
              );
            });
          })}
        </g>

        {/* your connections */}
        {yourEdges.map((e) => {
          const d = Math.hypot(e.x - you.x, e.y - you.y);
          if (d < 32 * youScale) return null;
          const start = (31 * youScale) / d;
          const entering = e.loreId === passage?.loreId;
          // calm at rest; the lines into a lore light up when that lore is
          // hovered or in focus - how much of it is yours, shown on demand
          const lit = e.loreId === focusedLoreId || e.loreId === hoveredLoreId;
          const restOpacity = lit ? 0.9 : 0.3;
          const restWidth = lit ? 1.3 : 1;
          return (
            <line
              key={`me-${e.id}-${e.loreId}`}
              x1={you.x + (e.x - you.x) * start}
              y1={you.y + (e.y - you.y) * start}
              x2={e.x}
              y2={e.y}
              stroke="url(#sky-self-fade)"
              strokeOpacity={
                entering ? lerp(restOpacity, 1, inside) : restOpacity * away
              }
              strokeWidth={
                entering ? lerp(restWidth, 1.4 * insideZoom, inside) : restWidth
              }
            />
          );
        })}

        {/* the lores */}
        {sky.lores.map((s) => {
          const id = s.lore.id;
          const o = toScreen(s.x, s.y);
          const sigma = s.scale * camera.k;
          const radius = s.radius * camera.k;
          const entering = id === passage?.loreId;
          const focused = id === focusedLoreId;
          const lit = focused || id === hoveredLoreId;
          const count = s.layout.nodes.length;
          // the lore being entered turns into its constellation; the rest
          // simply goes
          // a lore in focus carries a little more weight as well as colour
          const restRadius = focused ? MINI_NODE * 1.4 : MINI_NODE;
          const nodeRadius = entering
            ? lerp(restRadius, 6 * insideZoom, inside)
            : restRadius;
          const edgeWidth = entering ? lerp(1, insideZoom, inside) : 1;
          const edgeOpacity = lerp(lit ? 0.35 : 0.14, 0.08, entering ? inside : 0);
          // the lore in focus lights in the focus colour, the way a focused
          // node's edges do. It fades back to ink as a dive enters it, so the
          // constellation it becomes is the one drawn inside.
          const ink = tint(focused ? 1 - inside : 0);
          const label = labels.get(`lore-${id}`) ?? {
            x: o.x,
            y: o.y + radius + 24,
            anchor: "middle" as const,
          };
          return (
            <g
              key={id}
              opacity={entering ? 1 : away}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredLoreId(id)}
              onMouseLeave={() => setHoveredLoreId(null)}
              onClick={() => {
                if (movedRef.current) return;
                // the first click focuses, a second one enters
                if (focused) onEnter(id);
                else onFocusLore(id);
              }}
            >
              <circle cx={o.x} cy={o.y} r={radius + 12} fill="transparent" />
              {count === 0 && (
                <circle
                  cx={o.x}
                  cy={o.y}
                  r={radius}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeOpacity={0.2}
                  strokeDasharray="2 4"
                />
              )}
              <g transform={`translate(${o.x} ${o.y})`}>
                {s.layout.links.map((l) => {
                  const a = nodesById.get(id)?.get(l.source);
                  const b = nodesById.get(id)?.get(l.target);
                  if (a === undefined || b === undefined) return null;
                  return (
                    <path
                      key={`${l.source}-${l.target}`}
                      d={edgePath(
                        { x: a.x * sigma, y: a.y * sigma },
                        { x: b.x * sigma, y: b.y * sigma },
                        EDGE_CLEAR_RADIUS * sigma,
                      )}
                      fill="none"
                      style={{ stroke: ink }}
                      strokeOpacity={edgeOpacity}
                      strokeWidth={edgeWidth}
                    />
                  );
                })}
                {s.layout.nodes.map((n) => {
                  const restOpacity = lit ? 0.95 : 0.5;
                  const insideOpacity = yourTargetIds.has(n.id) ? 0.9 : 0.32;
                  return (
                    <circle
                      key={n.id}
                      cx={n.x * sigma}
                      cy={n.y * sigma}
                      r={nodeRadius}
                      style={{
                        fill:
                          hovered?.entityId === n.id
                            ? "var(--color-here)"
                            : ink,
                      }}
                      fillOpacity={
                        entering
                          ? lerp(restOpacity, insideOpacity, inside)
                          : restOpacity
                      }
                    />
                  );
                })}
              </g>
              <g opacity={1 - inside}>
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  className="font-serif"
                  fontSize={nameSize}
                  fill="var(--color-ink)"
                  fillOpacity={lit ? 1 : 0.8}
                >
                  {s.lore.name}
                </text>
                {lit && (
                  <text
                    x={label.x}
                    y={label.y + 16}
                    textAnchor={label.anchor}
                    className="font-mono"
                    fontSize={Math.max(10, nameSize - 4)}
                    fill="var(--color-muted)"
                  >
                    {count} {count === 1 ? "entity" : "entities"}
                    {focused ? " · enter ↗" : ""}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* the bridge dots, over the lores so a hover always reaches them */}
        <g opacity={away}>
          {sky.bridges.map((b) => {
            const at = toScreen(b.x, b.y);
            const lit = b.entityId === hoveredBridge;
            return (
              <g
                key={b.entityId}
                className="cursor-pointer"
                onMouseEnter={() => cards.hover(b.entityId)}
                onMouseLeave={cards.leave}
                // a click pins the card open, as at the border of a lore
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => cards.pin(b.entityId)}
              >
                <circle cx={at.x} cy={at.y} r={9} fill="transparent" />
                <circle
                  cx={at.x}
                  cy={at.y}
                  r={lit ? 3.6 : 2.6}
                  fill={lit ? "var(--color-here)" : "var(--color-ink)"}
                  fillOpacity={lit ? 1 : 0.75}
                />
              </g>
            );
          })}
        </g>

        {/* you: fixed at the centre of the sky, and at the centre of the lore
            once inside it */}
        {selfId != null && (
          <g transform={`translate(${you.x} ${you.y}) scale(${youScale})`}>
            <YouNode
              focused={youFocused || inside > 0}
              onClick={() => {
                if (!movedRef.current) onFocusLore(null);
              }}
            />
          </g>
        )}

      </svg>
      {/* a bridge is an entity that lives in several lores: its card lists
          them, and each one is a door into that lore, with it in focus */}
      {hovered !== undefined &&
        inside === 0 &&
        (() => {
          const at = toScreen(hovered.x, hovered.y);
          const uncovered = box.width - panelReserve(box.width);
          let side: "left" | "right" = at.x < youAtRest.x ? "left" : "right";
          if (side === "right" && at.x + 250 > uncovered) side = "left";
          if (side === "left" && at.x - 250 < 0) side = "right";
          return (
            <LoreCard
              key={hovered.entityId}
              title={hovered.name}
              heading="in"
              doors={homesOf(hovered.entityId)}
              x={at.x}
              y={Math.min(box.height - 90, Math.max(90, at.y))}
              side={side}
              onPick={(loreId) => {
                cards.close();
                onOpen(hovered.entityId, loreId);
              }}
              onEnter={cards.stay}
              onLeave={cards.leave}
            />
          );
        })()}
    </div>
  );
}

export default Sky;
