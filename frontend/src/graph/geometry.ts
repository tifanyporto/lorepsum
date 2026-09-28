import type {
  Force,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from "d3-force";

// radius of the clear zone reserved around the you-node at the origin. The
// crowd forms a ring outside it; nothing else is drawn inside it.
export const KEEPOUT_RADIUS = 90;
// radius no edge between two other nodes may enter. Smaller than the node
// radius so a node on the rim can still be reached, and an edge that has to go
// around has room to do it without touching the ring of nodes.
export const EDGE_CLEAR_RADIUS = 70;

// the you-node's zone as a rule on positions, not a force: whatever sits
// inside it is moved out to the rim along its own direction
export function keepClear(n: { x?: number; y?: number }) {
  const d = Math.hypot(n.x ?? 0, n.y ?? 0);
  if (d === 0) {
    n.x = KEEPOUT_RADIUS;
    n.y = 0;
  } else if (d < KEEPOUT_RADIUS) {
    const k = KEEPOUT_RADIUS / d;
    n.x = (n.x ?? 0) * k;
    n.y = (n.y ?? 0) * k;
  }
}

// keeps that zone clear during the simulation: any node that drifts inside the
// radius is pushed straight back out along its own direction from the origin,
// so the crowd settles as a ring around the you-node instead of on top of it.
export function forceKeepOut<N extends SimulationNodeDatum>(
  radius: number,
  strength = 1,
): Force<N, SimulationLinkDatum<N>> {
  let nodes: N[] = [];
  const force: Force<N, SimulationLinkDatum<N>> = (alpha: number) => {
    for (const n of nodes) {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const d = Math.hypot(x, y);
      if (d > 0 && d < radius) {
        const k = ((radius - d) / d) * strength * alpha;
        n.vx = (n.vx ?? 0) + x * k;
        n.vy = (n.vy ?? 0) + y * k;
      }
    }
  };
  force.initialize = (n: N[]) => {
    nodes = n;
  };
  return force;
}

// Where an edge between two crowd nodes bends. Straight - null - when it
// stays clear of the you-node's zone. Otherwise it bends around it, the way
// light bends around a mass: one smooth curve that bows out on the side the
// straight line already leans to and only grazes the zone at a single point.
// Each bent edge gets its own curve from its own ends — they never pile onto
// one shared circle. The answer is the control point of that curve.
export function bendAround(
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: number,
): { x: number; y: number } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return null;
  // the point of the straight line nearest the you-node
  const u = Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2));
  const px = a.x + u * dx;
  const py = a.y + u * dy;
  const d = Math.hypot(px, py);
  if (d >= r) return null;

  // the side to bow out on: through that nearest point, or — for a line that
  // runs through the you-node dead centre — square to the line
  const len = Math.sqrt(len2);
  const [nx, ny] = d > 1e-6 ? [px / d, py / d] : [-dy / len, dx / len];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // a quadratic whose middle sits `reach` out along that side. Widen the reach
  // until no sampled point of the curve dips inside the zone.
  let cx = 0;
  let cy = 0;
  for (let reach = r + 4; reach < r * 4; reach += 4) {
    cx = 2 * reach * nx - mx;
    cy = 2 * reach * ny - my;
    let clear = true;
    for (let i = 1; i < 48; i++) {
      const t = i / 48;
      const x = (1 - t) * (1 - t) * a.x + 2 * t * (1 - t) * cx + t * t * b.x;
      const y = (1 - t) * (1 - t) * a.y + 2 * t * (1 - t) * cy + t * t * b.y;
      if (Math.hypot(x, y) < r) {
        clear = false;
        break;
      }
    }
    if (clear) break;
  }
  return { x: cx, y: cy };
}

// the path of an edge between two crowd nodes: straight, or bent around the
// you-node's zone
export function edgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: number,
): string {
  const c = bendAround(a, b, r);
  return c === null
    ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
    : `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`;
}
