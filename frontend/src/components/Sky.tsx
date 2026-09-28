import { useState, useEffect, useMemo, useRef } from "react";
import type { Relationship } from "../types";
import { EDGE_CLEAR_RADIUS, edgePath } from "../graph/geometry";
import {
  useBoxSize,
  visibleCentre,
  zoomBetween,
  type SkyCamera,
} from "../graph/camera";
import type { Sky as SkyData } from "../graph/sky";
import YouNode from "./YouNode";

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
  passage: Passage | null;
  // how far the passage has gone, from 0 to 1
  progress: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useBoxSize(svgRef);
  const centre = visibleCentre(box.width, box.height);
  const [hoveredLoreId, setHoveredLoreId] = useState<number | null>(null);
  const [hoveredBridge, setHoveredBridge] = useState<number | null>(null);
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

  const hovered = sky.bridges.find((b) => b.entityId === hoveredBridge);
  const loreName = (id: number) =>
    sky.lores.find((s) => s.lore.id === id)?.lore.name ?? "";

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className={`absolute inset-0 w-full h-full touch-none select-none ${
          passage ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
        onPointerDown={(e) => {
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

        {/* bridges: a line from each shared entity to its place in every
            lore that holds it. Under everything else. */}
        <g opacity={away}>
          {sky.bridges.map((b) => {
            const at = toScreen(b.x, b.y);
            const lit = b.entityId === hoveredBridge;
            return (copies.get(b.entityId) ?? []).map((c) => (
              <line
                key={`${b.entityId}-${c.loreId}`}
                x1={at.x}
                y1={at.y}
                x2={c.x}
                y2={c.y}
                stroke={lit ? "var(--color-here)" : "var(--color-ink)"}
                strokeOpacity={lit ? 0.6 : 0.1}
              />
            ));
          })}
        </g>

        {/* your connections */}
        {yourEdges.map((e) => {
          const d = Math.hypot(e.x - you.x, e.y - you.y);
          if (d < 32 * youScale) return null;
          const start = (31 * youScale) / d;
          const entering = e.loreId === passage?.loreId;
          const restOpacity = youFocused ? 1 : 0.55;
          const restWidth = youFocused ? 1.4 : 1.1;
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
          const nodeRadius = entering
            ? lerp(MINI_NODE, 6 * insideZoom, inside)
            : MINI_NODE;
          const edgeWidth = entering ? lerp(1, insideZoom, inside) : 1;
          const edgeOpacity = lerp(lit ? 0.35 : 0.14, 0.08, entering ? inside : 0);
          // the name sits above or below, on the side away from you: bridges
          // run between lores, so what lies outward is free. Never to the
          // side, where a long name would run under the panel.
          // Clear of the rim and of any straggler reaching past it.
          const above = o.y < youAtRest.y - radius * 0.5;
          const ys = s.layout.nodes.map((n) => n.y * sigma);
          const top = Math.min(-radius, ...ys);
          const bottom = Math.max(radius, ...ys);
          const label = {
            x: o.x,
            y: above ? o.y + top - 32 : o.y + bottom + 24,
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
              {focused && (
                <circle
                  cx={o.x}
                  cy={o.y}
                  r={radius + 10}
                  fill="none"
                  stroke="var(--color-here)"
                  strokeOpacity={0.55 * (1 - inside)}
                />
              )}
              {count === 0 && (
                <circle
                  cx={o.x}
                  cy={o.y}
                  r={radius * 0.6}
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
                      stroke="var(--color-ink)"
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
                      fill={
                        hovered?.entityId === n.id
                          ? "var(--color-here)"
                          : "var(--color-ink)"
                      }
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
                  fontSize={15}
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
                    fontSize={11}
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
                onMouseEnter={() => setHoveredBridge(b.entityId)}
                onMouseLeave={() => setHoveredBridge(null)}
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

        {/* a hovered bridge names itself and the lores it joins */}
        {hovered !== undefined && inside === 0 && (
          <g className="pointer-events-none">
            <text
              x={toScreen(hovered.x, hovered.y).x}
              y={toScreen(hovered.x, hovered.y).y - 26}
              textAnchor="middle"
              className="font-serif"
              fontSize={13}
              fill="var(--color-ink)"
              stroke="var(--color-desk)"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {hovered.name}
            </text>
            <text
              x={toScreen(hovered.x, hovered.y).x}
              y={toScreen(hovered.x, hovered.y).y - 11}
              textAnchor="middle"
              className="font-mono"
              fontSize={11}
              fill="var(--color-muted)"
              stroke="var(--color-desk)"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {hovered.loreIds.map(loreName).join(" · ")}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default Sky;
