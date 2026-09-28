import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { Entity, Relationship } from "../types";
import { KEEPOUT_RADIUS, forceKeepOut, keepClear } from "./geometry";

export type GraphNode = SimulationNodeDatum & { id: number; name: string };
export type GraphLink = SimulationLinkDatum<GraphNode>;

// a node where the layout left it - its home
export type Placed = { id: number; name: string; x: number; y: number };

export type Layout = {
  nodes: Placed[];
  links: { source: number; target: number }[];
};

// Where every entity lives. Computed once, from the data alone, and never
// again: a pull is a gesture, not an edit, and when it ends every node goes
// back here. The same data always gives the same drawing - d3 starts every
// node on a fixed spiral and its jiggle comes from a seeded source - so a
// layout computed in two places lands on the same positions in both.
//
// The you-node is not here: it is drawn apart, pinned at the origin, so it
// stays out of the simulation. Edges touching it fall away on their own: only
// edges whose both ends are in the list are kept.
export function layoutConstellation(
  entities: Entity[],
  relationships: Relationship[],
): Layout {
  const nodes: GraphNode[] = entities.map((e) => ({ id: e.id, name: e.name }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const links = relationships
    .filter((r) => nodeIds.has(r.source_id) && nodeIds.has(r.target_id))
    .map((r) => ({ source: r.source_id, target: r.target_id }));

  const simulation = forceSimulation(nodes)
    .force("charge", forceManyBody().strength(-300))
    .force(
      "link",
      // copies: forceLink swaps the ids for the node objects themselves
      forceLink<GraphNode, GraphLink>(links.map((l) => ({ ...l })))
        .id((n) => n.id)
        .distance(90),
    )
    // the you-node is pinned at the origin, the centre of the drawing, and
    // the crowd is centred there too — but the keep-out force hollows a clear
    // zone around it, so the rest settles as a ring and never on top of it
    .force("center", forceCenter(0, 0))
    .force("keepout", forceKeepOut<GraphNode>(KEEPOUT_RADIUS));
  simulation.stop();
  simulation.tick(300);
  // guarantee the clearing: the force leaves it nearly empty, and any
  // straggler still inside is moved out to the rim
  nodes.forEach(keepClear);

  return {
    nodes: nodes.map((n) => ({ id: n.id, name: n.name, x: n.x ?? 0, y: n.y ?? 0 })),
    links,
  };
}
