import {
  forceSimulation,
  forceCollide,
  forceRadial,
  type SimulationNodeDatum,
} from "d3-force";
import type { Lore, Membership, Relationship } from "../types";
import { EMPTY_LAYOUT, type Layout } from "./layout";
import { KEEPOUT_RADIUS, bendAround } from "./geometry";

// a lore in the sky: where its miniature sits, how big it is drawn, and how
// its own constellation is scaled down to fit
export type SkyLore = {
  lore: Lore;
  x: number;
  y: number;
  // the miniature's radius, in sky units
  radius: number;
  // sky units per constellation unit: a node at p in the lore is drawn at
  // (x, y) + p * scale
  scale: number;
  layout: Layout;
  // how many of your connections point into it
  yours: number;
};

// an entity that lives in more than one lore, drawn between them: a dot, and
// an arm from the dot to its place in each lore. The arms bend around you.
export type Bridge = {
  entityId: number;
  name: string;
  loreIds: number[];
  x: number;
  y: number;
  // each arm is a quadratic from the dot, through its control point, to the
  // entity's place in that lore
  arms: { loreId: number; cx: number; cy: number; x: number; y: number }[];
};

export type Sky = { lores: SkyLore[]; bridges: Bridge[] };

// the clear zone around you: no lore comes closer than this
const SKY_CLEAR = 56;
// room around each miniature for its name
const LABEL_ROOM = 36;
// how much farther the lore that is least yours sits than the one most yours
const SPREAD = 100;
// how wide a berth a bridge gives you on its way between two lores
const BRIDGE_CLEAR = SKY_CLEAR + 20;

// The sky: every lore around you. Where a lore sits says how much of it is
// yours - the more of your connections point into it, the closer it comes -
// and lores that share entities sit side by side. Two lores are never linked:
// what brings them together is the entities they share, and each of those is
// drawn between them as a bridge.
export function layoutSky(
  lores: Lore[],
  layouts: Map<number, Layout>,
  memberships: Membership[],
  relationships: Relationship[],
  selfId: number | null | undefined,
): Sky {
  const members = new Map<number, Set<number>>();
  for (const m of memberships) {
    if (m.entity_id === selfId) continue;
    if (!members.has(m.lore_id)) members.set(m.lore_id, new Set());
    members.get(m.lore_id)?.add(m.entity_id);
  }
  const yourTargets = relationships
    .filter((r) => r.source_id === selfId)
    .map((r) => r.target_id);

  const placed = lores.map((lore) => {
    const ids = members.get(lore.id) ?? new Set<number>();
    const layout = layouts.get(lore.id) ?? EMPTY_LAYOUT;
    // the size of a lore is drawn, not written: the miniature grows with the
    // square root of its entities, so area follows the count
    const radius = 24 + 12 * Math.sqrt(ids.size);
    // the miniature is framed on the body of the lore, not on its farthest
    // node: one entity flung to the edge would shrink everything else to a
    // speck. A straggler may reach past the rim; the body fills it.
    const distances = layout.nodes
      .map((n) => Math.hypot(n.x, n.y) + 6)
      .sort((a, b) => a - b);
    const extent = Math.max(
      KEEPOUT_RADIUS + 6,
      distances[Math.floor((distances.length - 1) * 0.9)] ?? 0,
    );
    return {
      lore,
      radius,
      scale: radius / extent,
      layout,
      yours: yourTargets.filter((id) => ids.has(id)).length,
      ids,
    };
  });
  const mostYours = Math.max(0, ...placed.map((p) => p.yours));

  // the lores each entity lives in, and how many entities each pair shares
  const inLores = new Map<number, number[]>();
  for (const p of placed)
    for (const id of p.ids) inLores.set(id, [...(inLores.get(id) ?? []), p.lore.id]);
  const shared = new Map<string, number>();
  for (const loreIds of inLores.values()) {
    for (let a = 0; a < loreIds.length; a++)
      for (let b = a + 1; b < loreIds.length; b++) {
        const key = [loreIds[a], loreIds[b]].sort((x, y) => x - y).join("-");
        shared.set(key, (shared.get(key) ?? 0) + 1);
      }
  }
  const sharing = (a: number, b: number) =>
    shared.get([a, b].sort((x, y) => x - y).join("-")) ?? 0;

  // Going round the circle: first the lore most yours, then each time the
  // lore that shares most with the one before - so lores that touch sit side
  // by side and the bridges between them stay short.
  const left = [...placed].sort(
    (a, b) => b.yours - a.yours || a.lore.id - b.lore.id,
  );
  const order: typeof placed = [];
  while (left.length > 0) {
    const last = order.at(-1);
    let pick = 0;
    if (last !== undefined)
      left.forEach((p, i) => {
        if (sharing(last.lore.id, p.lore.id) > sharing(last.lore.id, left[pick].lore.id))
          pick = i;
      });
    order.push(...left.splice(pick, 1));
  }

  type Body = SimulationNodeDatum & { id: number; r: number; d: number };
  const bodies: Body[] = order.map((p) => {
    // a lore none of your connections reaches sits on the outer edge
    const share = mostYours > 0 ? p.yours / mostYours : 0;
    return {
      id: p.lore.id,
      r: p.radius,
      d:
        SKY_CLEAR + p.radius + LABEL_ROOM + (1 - share) * SPREAD +
        (p.yours ? 0 : 40),
    };
  });
  // Each lore gets the slice of the circle it needs at its distance, and what
  // is left is shared out evenly between them, so the lores go all the way
  // round instead of crowding one side. Too many to fit, and the whole ring
  // moves out until they do.
  const room = (b: Body, grow: number) =>
    2 * Math.asin(Math.min(1, (b.r + LABEL_ROOM) / (b.d * grow)));
  let grow = 1;
  while (bodies.reduce((sum, b) => sum + room(b, grow), 0) > Math.PI * 1.9)
    grow *= 1.08;
  const gap =
    (2 * Math.PI - bodies.reduce((sum, b) => sum + room(b, grow), 0)) /
    Math.max(1, bodies.length);
  let angle = -Math.PI / 2;
  for (const b of bodies) {
    b.d *= grow;
    const middle = angle + room(b, 1) / 2;
    b.x = Math.cos(middle) * b.d;
    b.y = Math.sin(middle) * b.d;
    angle += room(b, 1) + gap;
  }
  // neighbours at different distances can still graze: a short settling
  // pass keeps each one on its ring and out of the others' way
  const simulation = forceSimulation(bodies)
    .force("distance", forceRadial<Body>((b) => b.d, 0, 0).strength(0.5))
    .force("room", forceCollide<Body>((b) => b.r + LABEL_ROOM).iterations(3))
    .stop();
  simulation.tick(120);
  const byId = new Map(bodies.map((b) => [b.id, b]));

  const skyLores: SkyLore[] = placed.map((p) => {
    const body = byId.get(p.lore.id);
    return {
      lore: p.lore,
      x: body?.x ?? 0,
      y: body?.y ?? 0,
      radius: p.radius,
      scale: p.scale,
      layout: p.layout,
      yours: p.yours,
    };
  });

  // A bridge is drawn from the entity's place in one lore to its place in
  // the other, bending around you when the straight line would cross you; the
  // dot sits halfway along. An entity in three lores or more has its dot
  // between all its places, pushed out of your zone, and an arm to each.
  const placeOf = (loreId: number, entityId: number) => {
    const s = skyLores.find((l) => l.lore.id === loreId);
    const n = s?.layout.nodes.find((m) => m.id === entityId);
    if (s === undefined || n === undefined) return null;
    return { x: s.x + n.x * s.scale, y: s.y + n.y * s.scale };
  };
  const names = new Map(
    placed.flatMap((p) => p.layout.nodes.map((n) => [n.id, n.name] as const)),
  );
  const bridges: Bridge[] = [];
  for (const [entityId, loreIds] of inLores) {
    if (loreIds.length < 2) continue;
    const places = loreIds
      .map((loreId) => ({ loreId, at: placeOf(loreId, entityId) }))
      .filter((p) => p.at !== null) as {
      loreId: number;
      at: { x: number; y: number };
    }[];
    if (places.length < 2) continue;
    let dot: { x: number; y: number };
    let arms: Bridge["arms"];
    if (places.length === 2) {
      const [a, b] = places;
      // one curve from place to place, split at its middle into two arms
      const c = bendAround(a.at, b.at, BRIDGE_CLEAR) ?? {
        x: (a.at.x + b.at.x) / 2,
        y: (a.at.y + b.at.y) / 2,
      };
      dot = {
        x: 0.25 * a.at.x + 0.5 * c.x + 0.25 * b.at.x,
        y: 0.25 * a.at.y + 0.5 * c.y + 0.25 * b.at.y,
      };
      arms = [
        { loreId: a.loreId, cx: (a.at.x + c.x) / 2, cy: (a.at.y + c.y) / 2, ...a.at },
        { loreId: b.loreId, cx: (b.at.x + c.x) / 2, cy: (b.at.y + c.y) / 2, ...b.at },
      ];
    } else {
      dot = {
        x: places.reduce((sum, p) => sum + p.at.x, 0) / places.length,
        y: places.reduce((sum, p) => sum + p.at.y, 0) / places.length,
      };
      const out = Math.hypot(dot.x, dot.y);
      if (out < BRIDGE_CLEAR) {
        const [dx, dy] = out > 1e-6 ? [dot.x / out, dot.y / out] : [0, -1];
        dot = { x: dx * BRIDGE_CLEAR, y: dy * BRIDGE_CLEAR };
      }
      arms = places.map((p) => {
        const c = bendAround(dot, p.at, BRIDGE_CLEAR) ?? {
          x: (dot.x + p.at.x) / 2,
          y: (dot.y + p.at.y) / 2,
        };
        return { loreId: p.loreId, cx: c.x, cy: c.y, ...p.at };
      });
    }
    bridges.push({
      entityId,
      name: names.get(entityId) ?? "",
      loreIds,
      ...dot,
      arms,
    });
  }

  return { lores: skyLores, bridges };
}
