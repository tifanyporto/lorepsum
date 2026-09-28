import {
  forceSimulation,
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { Lore, Membership, Relationship } from "../types";
import type { Layout } from "./layout";
import { KEEPOUT_RADIUS } from "./geometry";

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

// an entity that lives in more than one lore, drawn between them
export type Bridge = {
  entityId: number;
  name: string;
  loreIds: number[];
  x: number;
  y: number;
};

export type Sky = { lores: SkyLore[]; bridges: Bridge[] };

// the clear zone around you: no lore comes closer than this
const SKY_CLEAR = 80;
// room below each miniature for its name
const LABEL_ROOM = 34;
// how much farther the lore that is least yours sits than the one most yours
const SPREAD = 200;

// The sky: every lore around you. Where a lore sits says how much of it is
// yours - the more of your connections point into it, the closer it comes -
// and lores that share entities are drawn towards each other. Two lores are
// never linked: what pulls them together is the entities they share, and each
// of those is drawn between them as a bridge.
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

  type Body = SimulationNodeDatum & { id: number; r: number; d: number };
  const placed = lores.map((lore) => {
    const ids = members.get(lore.id) ?? new Set<number>();
    const layout = layouts.get(lore.id) ?? { nodes: [], links: [] };
    // the size of a lore is drawn, not written: the miniature grows with the
    // square root of its entities, so area follows the count
    const radius = 24 + 13 * Math.sqrt(ids.size);
    // the miniature is framed on the body of the lore, not on its farthest
    // node: one entity flung to the edge would shrink everything else to a
    // speck. A straggler may reach past the rim; the body fills it.
    const distances = layout.nodes
      .map((n) => Math.hypot(n.x, n.y) + 6)
      .sort((a, b) => a - b);
    const extent = Math.max(
      KEEPOUT_RADIUS + 6,
      distances[Math.floor((distances.length - 1) * 0.85)] ?? 0,
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

  const bodies: Body[] = placed.map((p, i) => {
    // a lore none of your connections reaches sits on the outer edge
    const share = mostYours > 0 ? p.yours / mostYours : 0;
    const d =
      SKY_CLEAR + p.radius + 30 + (1 - share) * SPREAD + (p.yours ? 0 : 60);
    // a fixed start, so the same collection always draws the same sky
    const angle = -Math.PI / 2 + i * 2.39996;
    return {
      id: p.lore.id,
      r: p.radius,
      d,
      x: Math.cos(angle) * d,
      y: Math.sin(angle) * d,
    };
  });

  // the entities each pair of lores shares
  const inLores = new Map<number, number[]>();
  for (const p of placed)
    for (const id of p.ids) inLores.set(id, [...(inLores.get(id) ?? []), p.lore.id]);
  const shared = new Map<string, number>();
  for (const loreIds of inLores.values()) {
    for (let a = 0; a < loreIds.length; a++)
      for (let b = a + 1; b < loreIds.length; b++) {
        const key = `${loreIds[a]}-${loreIds[b]}`;
        shared.set(key, (shared.get(key) ?? 0) + 1);
      }
  }
  const byId = new Map(bodies.map((b) => [b.id, b]));
  type Tie = SimulationLinkDatum<Body> & { count: number };
  const ties: Tie[] = [...shared.entries()].map(([key, count]) => {
    const [a, b] = key.split("-").map(Number);
    return { source: a, target: b, count };
  });

  const simulation = forceSimulation(bodies)
    .force(
      "distance",
      forceRadial<Body>((b) => b.d, 0, 0).strength(0.8),
    )
    .force(
      "room",
      forceCollide<Body>((b) => b.r + LABEL_ROOM),
    )
    .force("spread", forceManyBody<Body>().strength(-150).distanceMax(600))
    .force(
      "shared",
      forceLink<Body, Tie>(ties)
        .id((b) => b.id)
        // once the force starts, each end is the body itself
        .distance((t) => (t.source as Body).r + (t.target as Body).r + 60)
        .strength((t) => 0.3 * Math.min(1, t.count / 3)),
    );
  simulation.stop();
  simulation.tick(300);

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

  // Each bridge sits in the gap between the lores it joins; several bridges
  // between the same lores line up across that gap instead of piling up.
  const centreOf = new Map(skyLores.map((s) => [s.lore.id, s]));
  const groups = new Map<string, number[]>();
  for (const [entityId, loreIds] of inLores) {
    if (loreIds.length < 2) continue;
    const key = loreIds.join("-");
    groups.set(key, [...(groups.get(key) ?? []), entityId]);
  }
  const names = new Map(
    placed.flatMap((p) => p.layout.nodes.map((n) => [n.id, n.name] as const)),
  );
  const bridges: Bridge[] = [];
  for (const [key, entityIds] of groups) {
    const loreIds = key.split("-").map(Number);
    const ends = loreIds.map((id) => centreOf.get(id)).filter((s) => s != null);
    let bx = ends.reduce((sum, s) => sum + s.x, 0) / ends.length;
    let by = ends.reduce((sum, s) => sum + s.y, 0) / ends.length;
    let across = { x: 1, y: 0 };
    if (ends.length === 2) {
      const [a, b] = ends;
      const gap = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const u = { x: (b.x - a.x) / gap, y: (b.y - a.y) / gap };
      const mid = a.radius + (gap - a.radius - b.radius) / 2;
      bx = a.x + u.x * mid;
      by = a.y + u.y * mid;
      across = { x: -u.y, y: u.x };
    }
    entityIds.forEach((entityId, i) => {
      const offset = (i - (entityIds.length - 1) / 2) * 14;
      bridges.push({
        entityId,
        name: names.get(entityId) ?? "",
        loreIds,
        x: bx + across.x * offset,
        y: by + across.y * offset,
      });
    });
  }

  return { lores: skyLores, bridges };
}
