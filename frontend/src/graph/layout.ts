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

// `outside`: an entity of another lore, drawn at the border of this one
export type GraphNode = SimulationNodeDatum & {
  id: number;
  name: string;
  outside?: boolean;
};
export type GraphLink = SimulationLinkDatum<GraphNode>;

// a node where the layout left it - its home
export type Placed = { id: number; name: string; x: number; y: number };

export type Layout = {
  // the lore's own entities, and the edges between them
  nodes: Placed[];
  links: { source: number; target: number }[];
  // the border: entities of other lores tied to one of these, and those ties
  border: Placed[];
  borderLinks: { source: number; target: number }[];
};

export const EMPTY_LAYOUT: Layout = {
  nodes: [],
  links: [],
  border: [],
  borderLinks: [],
};

// how much harder a border node pushes than one of the lore's own: enough to
// fall to the periphery on its own - "horizon" as a position, not a metaphor
const BORDER_PUSH = 2.4;

// Where every entity lives. Computed once, from the data alone, and never
// again: a pull is a gesture, not an edit, and when it ends every node goes
// back here. The same data always gives the same drawing - d3 starts every
// node on a fixed spiral and its jiggle comes from a seeded source - so a
// layout computed in two places lands on the same positions in both.
//
// `entities` are the lore's own. Any entity outside it that is tied to one of
// them comes along as the border; with no lore to slice by, pass them all and
// there is no border.
//
// The you-node is not here: it is drawn apart, pinned at the origin, so it
// stays out of the simulation. Edges touching it fall away on their own: only
// edges whose both ends are in the list are kept.
export function layoutConstellation(
  entities: Entity[],
  relationships: Relationship[],
  everyone: Entity[] = entities,
): Layout {
  const own = new Set(entities.map((e) => e.id));
  const ties = (id: number) =>
    relationships.some(
      (r) =>
        (r.source_id === id && own.has(r.target_id)) ||
        (r.target_id === id && own.has(r.source_id)),
    );
  const nodes: GraphNode[] = [
    ...entities.map((e) => ({ id: e.id, name: e.name })),
    ...everyone
      .filter((e) => !own.has(e.id) && ties(e.id))
      .map((e) => ({ id: e.id, name: e.name, outside: true })),
  ];
  const outside = new Set(nodes.filter((n) => n.outside).map((n) => n.id));
  const nodeIds = new Set(nodes.map((n) => n.id));
  // an edge is kept when it touches the lore: two of its own, or one of its
  // own and the border. Two border nodes are nobody's business here.
  const links = relationships
    .filter(
      (r) =>
        nodeIds.has(r.source_id) &&
        nodeIds.has(r.target_id) &&
        (own.has(r.source_id) || own.has(r.target_id)),
    )
    .map((r) => ({ source: r.source_id, target: r.target_id }));

  const simulation = forceSimulation(nodes)
    .force(
      "charge",
      forceManyBody<GraphNode>().strength((n) =>
        n.outside ? -300 * BORDER_PUSH : -300,
      ),
    )
    .force(
      "link",
      // copies: forceLink swaps the ids for the node objects themselves
      forceLink<GraphNode, GraphLink>(links.map((l) => ({ ...l })))
        .id((n) => n.id)
        .distance((l) =>
          (l.source as GraphNode).outside || (l.target as GraphNode).outside
            ? 130
            : 90,
        ),
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

  const placed = (n: GraphNode): Placed => ({
    id: n.id,
    name: n.name,
    x: n.x ?? 0,
    y: n.y ?? 0,
  });
  const crossing = (l: { source: number; target: number }) =>
    outside.has(l.source) || outside.has(l.target);
  return {
    nodes: nodes.filter((n) => !n.outside).map(placed),
    links: links.filter((l) => !crossing(l)),
    border: nodes.filter((n) => n.outside).map(placed),
    borderLinks: links.filter(crossing),
  };
}
