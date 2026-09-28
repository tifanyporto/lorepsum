import { useState, useEffect, useRef } from "react";
import { forceSimulation, forceLink, forceX, forceY } from "d3-force";
import type { Relationship } from "../types";
import { EDGE_CLEAR_RADIUS, edgePath, keepClear } from "../graph/geometry";
import { PANEL_RESERVE, useBoxSize, visibleCentre } from "../graph/camera";
import { pageFont, placeLabels, spotsAround } from "../graph/labels";
import type { GraphLink, GraphNode, Layout } from "../graph/layout";
import YouNode from "./YouNode";
import LoreCard, { type Door } from "./LoreCard";
import { useCard } from "./useCard";

type PositionedLink = { source: GraphNode; target: GraphNode };

// A pull is a gesture on springs. Every node is tied to its home, and every
// edge rests at the length it has at home, so at home nothing pulls on
// anything - the graph only moves when a hand moves it, and the motion spreads
// along the edges. Tuned on the real collection: a pulled node's direct
// connections follow about a third of the way, the next ring a sixth, the one
// after a tenth, and a node with no path to it does not move at all.
const HOME_PULL = 0.3;
const LINK_PULL = 0.7;
// letting go is not physics: every node glides straight home, easing out, and
// lands exactly there - so the place is the same place after every pull
const RETURN_MS = 700;
// how far, in screen pixels, a press on a node may travel and still count as
// a click. Past it, the press becomes a pull.
const PULL_THRESHOLD = 4;

// The constellation: the graph, drawn around the you-node at its centre.
function Constellation({
  layout,
  selfId,
  allRelationships,
  focusedId,
  onFocus,
  onCamera,
  homesOf,
  onCross,
  initialCamera,
}: {
  layout: Layout;
  selfId: number | null | undefined;
  allRelationships: Relationship[];
  focusedId: number | null;
  // a node was clicked: its id, and the gloss of the connection that led
  // there from the focus, if one did
  onFocus: (id: number, gloss: string | null) => void;
  // where the camera is, told on every change - a rise to the sky starts
  // from here
  onCamera?: (camera: { pan: { x: number; y: number }; zoom: number }) => void;
  // the other lores an entity lives in, the likeliest doors first
  homesOf: (id: number) => Door[];
  // a door was chosen on a border node's card: cross into that lore there
  onCross: (entityId: number, loreId: number) => void;
  // where the camera starts, when it does not start on you: after a crossing
  // it starts where the crossing left it, then reframes on the focus
  initialCamera?: { pan: { x: number; y: number }; zoom: number };
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(initialCamera?.zoom ?? 1);
  const [pan, setPan] = useState(initialCamera?.pan ?? { x: 0, y: 0 });
  const reframed = useRef(false);
  const cards = useCard();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragStart, setDragStart] = useState<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<PositionedLink[]>([]);
  // what a pull can do to the graph, built with the layout: each node's home,
  // and the three moments of a pull - taking hold, moving, letting go
  const liveRef = useRef<{
    home: Map<number, { x: number; y: number }>;
    grab: () => void;
    drag: (node: GraphNode, x: number, y: number) => void;
    release: (node: GraphNode) => void;
  } | null>(null);
  // a press on a node, which is a click until it travels far enough to be a
  // pull. A ref, not state: it changes on every pointer move.
  const pressRef = useRef<{
    node: GraphNode;
    startX: number;
    startY: number;
    pulling: boolean;
  } | null>(null);
  // the node being pulled, shown lit and named like a hovered one
  const [pulledId, setPulledId] = useState<number | null>(null);
  // the live simulation moves the nodes in place; this only asks for a redraw
  const [, setFrame] = useState(0);
  const boxSize = useBoxSize(svgRef);
  // where the camera aims: the middle of what the panel leaves uncovered
  const centre = visibleCentre(boxSize.width, boxSize.height);

  useEffect(() => {
    onCamera?.({ pan, zoom });
  }, [pan, zoom, onCamera]);

  // Arriving by a crossing, the anchor stays nailed where it was while the
  // world settles around it; only then does the camera reframe on it.
  useEffect(() => {
    if (initialCamera === undefined || reframed.current) return;
    const at = layout.nodes.find((n) => n.id === focusedId);
    if (at === undefined) return;
    // marked done only when it happens: a mount that is undone before the
    // frame comes must leave the reframe to the next one
    const frame = requestAnimationFrame(() => {
      reframed.current = true;
      setPan({ x: -at.x * zoom, y: -at.y * zoom });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialCamera, layout, focusedId, zoom]);

  useEffect(() => {
    // the <svg>
    const el = svgRef.current;
    if (el === null) return;
    // what to do when the mouse wheel turns over the SVG
    const handleWheel = (e: WheelEvent) => {
      // cancels the page scroll; only works because the listener is not passive
      e.preventDefault();
      // up zooms in, down zooms out; clamped between 0.4 and 2.5
      setZoom(
        Math.min(2.5, Math.max(0.4, e.deltaY < 0 ? zoom * 1.1 : zoom / 1.1)),
      );
    };
    // registered by hand, declaring that this listener MAY cancel the event
    el.addEventListener("wheel", handleWheel, { passive: false });
    // cleanup: remove this listener before the next one is registered
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  useEffect(() => {
    // fresh objects every time: a pull moves the nodes in place, and the
    // layout they came from has to stay where it is
    const nodes: GraphNode[] = [
      ...layout.nodes.map((p) => ({ ...p })),
      ...layout.border.map((p) => ({ ...p, outside: true })),
    ];
    const links: GraphLink[] = [...layout.links, ...layout.borderLinks].map(
      (l) => ({ ...l }),
    );

    // Where the layout put each node is its home. When a pull ends, every
    // node goes back here.
    const home = new Map(
      [...layout.nodes, ...layout.border].map((p) => [p.id, { x: p.x, y: p.y }]),
    );
    const homeOf = (n: GraphNode) => home.get(n.id) ?? { x: 0, y: 0 };
    // The simulation a pull runs. Each edge rests at its length at home and
    // each node is sprung to its home, so at home every force is zero and
    // nothing drifts; only the hand moves the graph. No charge and no centring:
    // the layout's forces are what placed the nodes, not what holds them now.
    const live = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((n) => n.id)
          .distance((l) => {
            const a = homeOf(l.source as GraphNode);
            const b = homeOf(l.target as GraphNode);
            return Math.hypot(a.x - b.x, a.y - b.y);
          })
          .strength(LINK_PULL),
      )
      .force("home-x", forceX<GraphNode>((n) => homeOf(n).x).strength(HOME_PULL))
      .force("home-y", forceY<GraphNode>((n) => homeOf(n).y).strength(HOME_PULL))
      .stop();
    live.on("tick", () => {
      // the pulled node is kept out by the hand's own clamp; everyone else
      // by this one, every frame
      nodes.forEach((n) => n.fx == null && keepClear(n));
      setFrame((f) => f + 1);
    });

    let returning = 0;
    liveRef.current = {
      home,
      grab: () => {
        // taking hold mid-return stops the glide where it is
        cancelAnimationFrame(returning);
        nodes.forEach((n) => {
          n.vx = 0;
          n.vy = 0;
        });
        // held at a steady warmth: the springs keep the same stiffness for
        // as long as the hand stays
        live.alpha(0.3).alphaTarget(0.3).restart();
      },
      drag: (node, x, y) => {
        // the hand is stopped by the zone too: dragged into it, the node
        // slides along its rim
        const at = { x, y };
        keepClear(at);
        node.fx = at.x;
        node.fy = at.y;
      },
      release: (node) => {
        node.fx = null;
        node.fy = null;
        live.stop();
        const from = new Map(
          nodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]),
        );
        const start = performance.now();
        const glide = (now: number) => {
          const t = Math.min(1, (now - start) / RETURN_MS);
          const eased = 1 - (1 - t) ** 3;
          nodes.forEach((n) => {
            const a = from.get(n.id) ?? homeOf(n);
            const h = homeOf(n);
            n.x = a.x + (h.x - a.x) * eased;
            n.y = a.y + (h.y - a.y) * eased;
            // a straight line home may cut across the zone; it cannot
            if (t < 1) keepClear(n);
          });
          setFrame((f) => f + 1);
          if (t < 1) returning = requestAnimationFrame(glide);
        };
        returning = requestAnimationFrame(glide);
      },
    };

    setGraphNodes(nodes);
    setGraphLinks(links as unknown as PositionedLink[]);
    return () => {
      live.stop();
      cancelAnimationFrame(returning);
      liveRef.current = null;
    };
  }, [layout]);

  // who touches the focused entity — decides who shows a name without hover
  const neighborIds = new Set<number>();
  graphLinks.forEach((l) => {
    if (l.source.id === focusedId) neighborIds.add(l.target.id);
    if (l.target.id === focusedId) neighborIds.add(l.source.id);
  });
  // the you-node's own edges, and how far the farthest one reaches. The fade
  // gradient below is centred on the origin (the you-node) and runs to this
  // radius, so a long edge dissolves before it crosses the whole drawing while
  // a short one stays solid — the connection reads near the node, not as a
  // streak across the sky.
  //
  // Only to the lore's own entities. Someone at the border is reached the way
  // the lore reaches them - through the entity of this lore they are tied to -
  // never straight from you: in Songs I Love, Sheldon hangs off Soft Kitty,
  // not off the you-node, whatever you think of him elsewhere.
  const own = new Set(layout.nodes.map((n) => n.id));
  const selfEdges =
    selfId != null
      ? allRelationships.filter(
          (r) => r.source_id === selfId && own.has(r.target_id),
        )
      : [];
  const selfEdgeReach = Math.max(
    1,
    ...selfEdges.map((r) => {
      const t = graphNodes.find((n) => n.id === r.target_id);
      return t?.x != null && t.y != null ? Math.hypot(t.x, t.y) : 0;
    }),
  );
  // with you in focus, your connections are the neighbours that show a name,
  // as any focused entity's are. Your edges live outside graphLinks, so they
  // are added here by hand.
  if (selfId != null && focusedId === selfId)
    selfEdges.forEach((r) => neighborIds.add(r.target_id));

  // The names on screen, and where each one goes. The focus is placed first
  // and keeps the spot under its node; then whatever is under the pointer;
  // then the neighbours, moving around the names already there. None ever
  // covers another: a neighbour with nowhere to go waits for the hover.
  // a border node grows when it is named - next to the focus, or with its
  // card open - and otherwise stays a small hollow ring
  const cardId = cards.card?.id ?? null;
  const nodeRadius = (n: GraphNode) =>
    n.outside
      ? neighborIds.has(n.id) || n.id === cardId
        ? 6
        : 4.5
      : n.id === focusedId
        ? 9
        : 6;
  const family = pageFont();
  const rank = (n: GraphNode) =>
    n.id === focusedId ? 0 : n.id === hoveredId || n.id === pulledId ? 1 : 2;
  const labels = placeLabels(
    graphNodes
      .filter(
        (n) =>
          // an open card carries the name itself
          n.id !== cardId &&
          (n.id === focusedId ||
            n.id === hoveredId ||
            n.id === pulledId ||
            neighborIds.has(n.id)),
      )
      .sort((a, b) => rank(a) - rank(b))
      .map((n) => ({
        key: String(n.id),
        x: n.x ?? 0,
        y: n.y ?? 0,
        r: nodeRadius(n),
        lines: [{ text: n.name, size: 10, family }],
        spots: spotsAround(nodeRadius(n), 10),
        must: rank(n) < 2,
      })),
    [
      ...graphNodes.map((n) => ({
        key: String(n.id),
        x: n.x ?? 0,
        y: n.y ?? 0,
        r: nodeRadius(n) + 1,
      })),
      // the you-node's arcs
      ...(selfId != null ? [{ x: 0, y: 0, r: 34 }] : []),
    ],
  );

  // what a click on a node does: focus it, answer for the arrival, and glide
  // the camera to it. The camera aims at the node's home, so a click during
  // a pull's return lands where the node is going, not where it passes.
  const focusNode = (n: GraphNode) => {
    const at = liveRef.current?.home.get(n.id) ?? { x: n.x ?? 0, y: n.y ?? 0 };
    const arrival = allRelationships.find(
      (r) => r.source_id === focusedId && r.target_id === n.id,
    );
    onFocus(n.id, arrival?.gloss ?? null);
    setPan({ x: -at.x * zoom, y: -at.y * zoom });
  };
  // the pointer, in the drawing's own coordinates: the camera's translate and
  // scale, undone
  const toGraph = (clientX: number, clientY: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (box === undefined) return { x: 0, y: 0 };
    return {
      x: (clientX - box.left - centre.x - pan.x) / zoom,
      y: (clientY - box.top - centre.y - pan.y) / zoom,
    };
  };
  // the end of a press on a node. A pull lets go, and the graph glides home.
  // A press that never became a pull was a click.
  const endPress = (asClick: boolean) => {
    const press = pressRef.current;
    pressRef.current = null;
    if (press === null) return;
    if (press.pulling) {
      setPulledId(null);
      liveRef.current?.release(press.node);
    } else if (asClick) {
      // a border node is a door, not a place to read: the click pins its
      // card, and the crossing starts from a line of the card
      if (press.node.outside) cards.pin(press.node.id);
      else focusNode(press.node);
    }
  };

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={(e) => {
          // pressing anywhere else closes a pinned card
          cards.close();
          setDragStart({
            pointerX: e.clientX,
            pointerY: e.clientY,
            panX: pan.x,
            panY: pan.y,
          });
        }}
        onPointerMove={(e) => {
          // a press that started on a node: a click until it travels far
          // enough, then a pull
          const press = pressRef.current;
          if (press !== null) {
            if (!press.pulling) {
              const travelled = Math.hypot(
                e.clientX - press.startX,
                e.clientY - press.startY,
              );
              if (travelled < PULL_THRESHOLD) return;
              press.pulling = true;
              setPulledId(press.node.id);
              liveRef.current?.grab();
            }
            const p = toGraph(e.clientX, e.clientY);
            liveRef.current?.drag(press.node, p.x, p.y);
            return;
          }
          if (dragStart === null) return;
          setPan({
            x: dragStart.panX + (e.clientX - dragStart.pointerX),
            y: dragStart.panY + (e.clientY - dragStart.pointerY),
          });
        }}
        onPointerUp={() => {
          endPress(true);
          setDragStart(null);
        }}
        // an interrupted press is not a click: a pull lets go, a click is
        // dropped
        onPointerCancel={() => {
          endPress(false);
          setDragStart(null);
        }}
        onPointerLeave={() => setDragStart(null)}
      >
        <g
          transform={`translate(${centre.x + pan.x}, ${centre.y + pan.y}) scale(${zoom})`}
          className={
            dragStart ? "" : "transition-transform duration-500 ease-out"
          }
        >
          {/* the you-node edges' fade. userSpaceOnUse ties (cx, cy, r) to this
              group's coordinate system, where the pinned you-node is (0, 0):
              full accent at the core, gone by the farthest edge's tip. */}
          <defs>
            <radialGradient
              id="self-edge-fade"
              gradientUnits="userSpaceOnUse"
              cx={0}
              cy={0}
              r={selfEdgeReach}
            >
              <stop
                offset="0"
                stopColor="var(--color-accent)"
                stopOpacity={0.85}
              />
              <stop
                offset="1"
                stopColor="var(--color-accent)"
                stopOpacity={0}
              />
            </radialGradient>
          </defs>
          {/* everyone else's edges. None of them enters the you-node's zone:
              edgePath bends any that would cross it around it instead. Only
              the you-node's own edges (drawn below) cross that space, because
              they are the ones that belong there. */}
          {graphLinks.map((l) => {
            const touchesFocus =
              l.source.id === focusedId || l.target.id === focusedId;
            const touchesHover =
              l.source.id === hoveredId || l.target.id === hoveredId;
            // an edge that leaves the lore is the colour of the horizon
            const leaves = l.source.outside || l.target.outside;
            return (
              <path
                d={edgePath(
                  { x: l.source.x ?? 0, y: l.source.y ?? 0 },
                  { x: l.target.x ?? 0, y: l.target.y ?? 0 },
                  EDGE_CLEAR_RADIUS,
                )}
                fill="none"
                stroke={
                  touchesFocus
                    ? "var(--color-here)"
                    : leaves
                      ? "var(--color-beyond)"
                      : "var(--color-ink)"
                }
                strokeOpacity={
                  touchesHover ? 0.9 : touchesFocus ? 0.55 : leaves ? 0.12 : 0.08
                }
                strokeWidth={touchesHover ? 1.6 : touchesFocus ? 1.3 : 1}
                key={`${l.source.id}-${l.target.id}`}
                // the stroke eases; the path itself never does, or it would
                // lag half a second behind the nodes it joins during a pull
                className="transition-[stroke,stroke-opacity,stroke-width] duration-300"
              />
            );
          })}
          {/* the you-node's own edges. They are drawn apart because the
                you-node is not in the simulation, so the link filter above
                never sees them. Each one starts at radius 27 — on the arcs —
                instead of at the centre, so it leaves through the side gaps
                rather than cutting across the shape. */}
          {selfEdges.map((r) => {
            const target = graphNodes.find((n) => n.id === r.target_id);
            if (target?.x == null || target.y == null) return null;
            // walk 31 along the direction of the target, so the line
            // leaves from the arc ring rather than from the core
            const distance = Math.hypot(target.x, target.y);
            const start = 31 / distance;
            const isFocused = focusedId === selfId;
            return (
              <line
                key={`me-${r.id}`}
                x1={target.x * start}
                y1={target.y * start}
                x2={target.x}
                y2={target.y}
                stroke="url(#self-edge-fade)"
                strokeWidth={isFocused ? 1.4 : 1.1}
                strokeOpacity={isFocused ? 1 : 0.55}
                className="transition-[stroke-opacity,stroke-width] duration-300"
              />
            );
          })}
          {graphNodes.map((n) => {
            const isFocused = n.id === focusedId;
            const isNeighbor = neighborIds.has(n.id);
            // the node in your hand reads as hovered for the whole pull, even
            // when the pointer outruns it
            const isHovered = n.id === hoveredId || n.id === pulledId;
            const r = nodeRadius(n);
            // a press on any node: not a pan, a click unless it travels, and
            // the svg takes the pointer so a pull keeps going when the pointer
            // outruns the node
            const press = (e: React.PointerEvent) => {
              e.stopPropagation();
              svgRef.current?.setPointerCapture(e.pointerId);
              pressRef.current = {
                node: n,
                startX: e.clientX,
                startY: e.clientY,
                pulling: false,
              };
            };
            if (n.outside) {
              // The border: someone who is there without belonging. A hollow
              // ring breathing slowly - 6s against the 2.6s of the focus: fast
              // says you are here, slow says something breathes far away -
              // and a few edges trailing off outwards, into what is not drawn.
              const named = isNeighbor || n.id === cardId;
              const out = Math.hypot(n.x ?? 0, n.y ?? 0) || 1;
              const ux = (n.x ?? 0) / out;
              const uy = (n.y ?? 0) / out;
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => {
                    setHoveredId(n.id);
                    cards.hover(n.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    cards.leave();
                  }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill="none"
                    stroke="var(--color-beyond)"
                    className="breathe"
                  />
                  {[-0.45, 0, 0.45].map((turn) => {
                    const c = Math.cos(turn);
                    const s = Math.sin(turn);
                    const dx = ux * c - uy * s;
                    const dy = ux * s + uy * c;
                    const at = (d: number) => ({
                      x: (n.x ?? 0) + dx * d,
                      y: (n.y ?? 0) + dy * d,
                    });
                    const [a, b, e] = [at(r + 3), at(r + 10), at(r + 18)];
                    return (
                      <g key={turn} stroke="var(--color-beyond)">
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          strokeOpacity={named ? 0.32 : 0.2}
                        />
                        <line
                          x1={b.x}
                          y1={b.y}
                          x2={e.x}
                          y2={e.y}
                          strokeOpacity={named ? 0.1 : 0.07}
                        />
                      </g>
                    );
                  })}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill="var(--color-desk)"
                    stroke="var(--color-beyond)"
                    strokeOpacity={named ? 0.95 : 0.55}
                    strokeWidth={named ? 1.6 : 1.4}
                    className="transition-[r,stroke-opacity] duration-300 cursor-pointer"
                    onPointerDown={press}
                  />
                  {/* a wider target than the ring, which is small on purpose */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={12}
                    fill="transparent"
                    className="cursor-pointer"
                    onPointerDown={press}
                  />
                </g>
              );
            }
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isFocused && (
                  <>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill="none"
                      stroke="var(--color-here)"
                      strokeWidth={1.4}
                      className="pulse-ring"
                    />
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill="none"
                      stroke="var(--color-here)"
                      strokeWidth={1.4}
                      className="pulse-ring"
                      style={{ animationDelay: "1.3s" }}
                    />
                  </>
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={
                    isFocused || isHovered
                      ? "var(--color-here)"
                      : "var(--color-ink)"
                  }
                  fillOpacity={
                    isFocused || isHovered ? 1 : isNeighbor ? 0.9 : 0.32
                  }
                  // colour, opacity and size ease; position never does, or a
                  // pulled node would trail the pointer like rubber
                  className="transition-[fill,fill-opacity,r] duration-300 cursor-pointer"
                  onPointerDown={press}
                />
              </g>
            );
          })}

          {/* the names, over every node, each where placeLabels put it */}
          <g className="pointer-events-none">
            {graphNodes.map((n) => {
              const at = labels.get(String(n.id));
              if (at === undefined) return null;
              return (
                <text
                  key={n.id}
                  x={at.x}
                  y={at.y}
                  textAnchor={at.anchor}
                  fill={
                    n.id === focusedId
                      ? "var(--color-ink)"
                      : n.outside
                        ? "var(--color-beyond)"
                        : "var(--color-muted)"
                  }
                  fontSize={10}
                  stroke="var(--color-canvas)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {n.name}
                </text>
              );
            })}
          </g>

          {/* the you-node: pinned at the origin, outside the simulation */}
          {selfId != null && (
            <YouNode
              focused={focusedId === selfId}
              onClick={() => {
                onFocus(selfId, null);
                setPan({ x: 0, y: 0 });
              }}
            />
          )}
        </g>
      </svg>
      {(() => {
        const n = graphNodes.find((m) => m.id === cardId);
        if (n === undefined) return null;
        const x = centre.x + pan.x + (n.x ?? 0) * zoom;
        const y = Math.min(
          boxSize.height - 90,
          Math.max(90, centre.y + pan.y + (n.y ?? 0) * zoom),
        );
        // the side facing out of the screen - unless the card would run under
        // the panel or off the edge there
        const uncovered = boxSize.width - PANEL_RESERVE;
        let side: "left" | "right" = x < centre.x ? "left" : "right";
        if (side === "right" && x + 250 > uncovered) side = "left";
        if (side === "left" && x - 250 < 0) side = "right";
        return (
          <LoreCard
            key={n.id}
            title={n.name}
            heading="also in"
            doors={homesOf(n.id)}
            x={x}
            y={y}
            side={side}
            onPick={(loreId) => {
              cards.close();
              onCross(n.id, loreId);
            }}
            onEnter={cards.stay}
            onLeave={cards.leave}
          />
        );
      })()}
    </div>
  );
}

export default Constellation;
