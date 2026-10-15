import { useState, useEffect, useMemo, useRef } from "react";
import { forceSimulation, forceLink, forceX, forceY } from "d3-force";
import type { Relationship } from "../types";
import {
  distanceToSegment,
  EDGE_CLEAR_RADIUS,
  edgePath,
  keepClear,
} from "../graph/geometry";
import {
  panelReserve,
  panToReveal,
  useBoxSize,
  visibleCentre,
} from "../graph/camera";
import {
  pageFont,
  placeLabels,
  spotsAround,
  textWidth,
} from "../graph/labels";
import type { GraphLink, GraphNode, Layout } from "../graph/layout";
import YouNode from "./YouNode";
import LoreCard, { type Door } from "./LoreCard";
import { useCard } from "./useCard";

type PositionedLink = { source: GraphNode; target: GraphNode };

// The horizon arrives after the names. It is the furthest thing in the
// drawing and the last thing you need, so it settles last - the difference
// is small enough to feel like depth rather than like a queue.
const HORIZON_DELAY = "0.18s";

// How far the loose end rests from the node it hangs on. Two rings are
// tried: it takes the near one when there is room there, and steps out to
// the far one only when the near one is crowded.
const STUB_RADII = [92, 124];
// what the far ring has to beat to be worth the extra distance
const STEP_OUT_COST = 8;
// how close the thread's tip has to come before a node takes it
const LANDING_REACH = 30;

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
  onConnect,
  usedLabels,
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
  // a thread was pulled from the focus and landed on another entity
  onConnect: (
    sourceId: number,
    targetId: number,
    label: string,
  ) => Promise<void>;
  // the labels already in use, the commonest first
  usedLabels: string[];
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
  // The drawing's own nodes and edges, made while rendering rather than in an
  // effect. An effect runs after the browser has painted, so filling these in
  // one meant the constellation's first frame was an empty desk and the whole
  // drawing arrived on the second - the flash on entering a lore. Endpoints
  // are resolved here too, so an edge knows both its ends on the first frame
  // instead of waiting for the force layout to swap the ids for nodes.
  const { graphNodes, graphLinks } = useMemo(() => {
    // fresh objects every time: a pull moves the nodes in place, and the
    // layout they came from has to stay where it is
    const nodes: GraphNode[] = [
      ...layout.nodes.map((p) => ({ ...p })),
      ...layout.border.map((p) => ({ ...p, outside: true })),
    ];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: PositionedLink[] = [];
    for (const l of [...layout.links, ...layout.borderLinks]) {
      const source = byId.get(l.source);
      const target = byId.get(l.target);
      if (source !== undefined && target !== undefined)
        links.push({ source, target });
    }
    return { graphNodes: nodes, graphLinks: links };
  }, [layout]);
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
  // The thread out of the focus, in the drawing's own coordinates. While it
  // is being pulled it follows the pointer and `onto` is whoever is under it;
  // once let go on someone, `writing` is the sentence being written on it.
  const [thread, setThread] = useState<{
    x: number;
    y: number;
    onto: GraphNode | null;
    writing: boolean;
  } | null>(null);
  const [claim, setClaim] = useState("");
  const [claimTyped, setClaimTyped] = useState(false);
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

  // The focus can change without the camera being asked: a line in the
  // reading panel changes it, and so does arriving by a crossing. When it
  // does, the node in focus can be off screen - its pulse lighting where
  // nobody can see it. The camera answers here, and only when it must: the
  // shortest slide that brings the focus into the strip the panel leaves
  // uncovered, and nothing at all while it is already there.
  useEffect(() => {
    const at = layout.nodes.find((n) => n.id === focusedId);
    if (at === undefined || at.x == null || at.y == null) return;
    const point = { x: at.x, y: at.y };
    setPan((p) => panToReveal(point, { pan: p, zoom }, boxSize));
  }, [focusedId, layout, zoom, boxSize]);

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

  // The live simulation runs over the very objects being drawn, so a pull
  // moves what is on screen.
  useEffect(() => {
    const nodes = graphNodes;
    const links = graphLinks as unknown as GraphLink[];

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

    return () => {
      live.stop();
      cancelAnimationFrame(returning);
      liveRef.current = null;
    };
  }, [graphNodes, graphLinks, layout]);

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

  // Where the loose end hangs from: the focused node, or the origin when the
  // focus is you - you are pinned there and never enter the simulation.
  const focusedNode = graphNodes.find((n) => n.id === focusedId);
  const anchor =
    focusedId === null
      ? null
      : selfId != null && focusedId === selfId
        ? { x: 0, y: 0 }
        : focusedNode?.x != null && focusedNode.y != null
          ? { x: focusedNode.x, y: focusedNode.y }
          : null;
  // whoever the focus already reaches: a thread cannot be pulled to them
  // twice, so they are not offered as a landing
  const alreadyReached = new Set(
    allRelationships
      .filter((r) => r.source_id === focusedId)
      .map((r) => r.target_id),
  );
  const landing =
    thread?.onto != null && thread.onto.x != null && thread.onto.y != null
      ? { x: thread.onto.x, y: thread.onto.y }
      : thread !== null
        ? { x: thread.x, y: thread.y }
        : null;

  const dropThread = () => {
    setThread(null);
    setClaim("");
    setClaimTyped(false);
  };
  const commitThread = (label: string) => {
    const target = thread?.onto ?? null;
    const next = label.trim();
    dropThread();
    if (target === null || focusedId === null || next === "") return;
    onConnect(focusedId, target.id, next).catch((error) =>
      console.error(error),
    );
  };

  // The names on screen, and where each one goes. The focus is placed first
  // and keeps the spot under its node; then whatever is under the pointer;
  // then the neighbours, moving around the names already there. None ever
  // covers another: a neighbour with nowhere to go waits for the hover.
  //
  // (the loose end is placed after these, because a name is one of the things
  // it has to keep away from)
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

  // Everything the loose end has to keep away from, each written as a
  // segment so one measurement answers for all three: a node is a segment
  // with no length, an edge is the line between its ends, and a name is the
  // run its baseline draws - the end must clear the whole word, not the
  // point the word hangs from.
  const crowded: [
    { x: number; y: number },
    { x: number; y: number },
  ][] = [];
  for (const n of graphNodes) {
    if (n.x == null || n.y == null) continue;
    const at = { x: n.x, y: n.y };
    crowded.push([at, at]);
    const name = labels.get(String(n.id));
    if (name !== undefined) {
      const w = textWidth(n.name, 10, family);
      const left =
        name.anchor === "start"
          ? name.x
          : name.anchor === "middle"
            ? name.x - w / 2
            : name.x - w;
      crowded.push([
        { x: left, y: name.y },
        { x: left + w, y: name.y },
      ]);
    }
  }
  for (const l of graphLinks) {
    if (l.source.x == null || l.target.x == null) continue;
    crowded.push([
      { x: l.source.x, y: l.source.y ?? 0 },
      { x: l.target.x, y: l.target.y ?? 0 },
    ]);
  }
  // your own edges leave the origin, and they are drawn too
  for (const r of selfEdges) {
    const t = graphNodes.find((n) => n.id === r.target_id);
    if (t?.x == null || t.y == null) continue;
    crowded.push([
      { x: 0, y: 0 },
      { x: t.x, y: t.y },
    ]);
  }

  // The end goes where there is most room. Every direction is tried on two
  // rings, and the winner is the tip that sits farthest from everything
  // above - with the outer ring paying a small penalty, so the end only
  // wanders out when the near ring is genuinely crowded.
  let stub: { x: number; y: number } | null = null;
  if (anchor !== null) {
    let best = -Infinity;
    for (const reach of STUB_RADII) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const tip = {
          x: anchor.x + Math.cos(a) * reach,
          y: anchor.y + Math.sin(a) * reach,
        };
        let clear = Infinity;
        for (const [p, q] of crowded)
          clear = Math.min(clear, distanceToSegment(tip, p, q));
        const score = clear - (reach === STUB_RADII[0] ? 0 : STEP_OUT_COST);
        if (score > best) {
          best = score;
          stub = tip;
        }
      }
    }
  }

  // what a click on a node does: focus it and answer for the arrival. It does
  // not move the camera itself - a node you just clicked is a node you can
  // see, and the effect above decides for every way of changing the focus at
  // once, so clicking a line and clicking a node behave the same.
  const focusNode = (n: GraphNode) => {
    const arrival = allRelationships.find(
      (r) => r.source_id === focusedId && r.target_id === n.id,
    );
    onFocus(n.id, arrival?.gloss ?? null);
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
          // the thread has the pointer before anything else: while it is out,
          // this is not a pan and not a pull
          if (thread !== null && !thread.writing) {
            const p = toGraph(e.clientX, e.clientY);
            let onto: GraphNode | null = null;
            let nearest = LANDING_REACH;
            for (const n of graphNodes) {
              if (n.id === focusedId || n.x == null || n.y == null) continue;
              if (alreadyReached.has(n.id)) continue;
              const d = Math.hypot(n.x - p.x, n.y - p.y);
              if (d < nearest) {
                nearest = d;
                onto = n;
              }
            }
            setThread({ x: p.x, y: p.y, onto, writing: false });
            return;
          }
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
          // let go on someone: the thread stays, and the sentence is written
          // on it. Let go on empty ground: nothing was claimed.
          if (thread !== null && !thread.writing) {
            if (thread.onto === null) dropThread();
            else setThread({ ...thread, writing: true });
            setDragStart(null);
            return;
          }
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
                className={`transition-[stroke,stroke-opacity,stroke-width] duration-300${
                  leaves ? " animate-appear" : ""
                }`}
                style={leaves ? { animationDelay: HORIZON_DELAY } : undefined}
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
                  className="animate-appear"
                  style={{ animationDelay: HORIZON_DELAY }}
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
            // One of the lore's own that also lives elsewhere: the dot stays
            // full - it belongs here - and a single blue stub leaves it
            // outward, the sign the border already taught: an edge that does
            // not end leads to something not on screen. Its card opens on
            // hover; a click still focuses it, since it can be read here.
            const elsewhere = homesOf(n.id).length > 0;
            const out = Math.hypot(n.x ?? 0, n.y ?? 0) || 1;
            const stub = (d: number) => ({
              x: (n.x ?? 0) + ((n.x ?? 0) / out) * d,
              y: (n.y ?? 0) + ((n.y ?? 0) / out) * d,
            });
            return (
              <g
                key={n.id}
                onMouseEnter={() => {
                  setHoveredId(n.id);
                  if (elsewhere) cards.hover(n.id);
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  if (elsewhere) cards.leave();
                }}
              >
                {elsewhere && (
                  <g stroke="var(--color-beyond)" strokeWidth={1.3}>
                    <line
                      x1={stub(r + 2).x}
                      y1={stub(r + 2).y}
                      x2={stub(r + 10).x}
                      y2={stub(r + 10).y}
                      strokeOpacity={0.6}
                    />
                    <line
                      x1={stub(r + 10).x}
                      y1={stub(r + 10).y}
                      x2={stub(r + 19).x}
                      y2={stub(r + 19).y}
                      strokeOpacity={0.2}
                    />
                  </g>
                )}
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

          {/* The loose end, and the thread when it is out. It hangs off the
              focus carrying the same `+` that closes the lists in the panel,
              and while it is being pulled it is accent throughout - purple is
              your hand on something, and it lets go when the claim is made. */}
          {anchor !== null && stub !== null && thread === null && (
            <g
              className="cursor-grab"
              onPointerDown={(e) => {
                e.stopPropagation();
                setThread({ x: stub.x, y: stub.y, onto: null, writing: false });
                setClaim("");
                setClaimTyped(false);
              }}
            >
              <line
                x1={anchor.x}
                y1={anchor.y}
                x2={stub.x}
                y2={stub.y}
                stroke="var(--color-accent)"
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeDasharray="3 5"
              />
              <circle
                cx={stub.x}
                cy={stub.y}
                r={11}
                fill="var(--color-desk)"
                stroke="var(--color-accent)"
                strokeWidth={1.5}
              />
              <path
                d={`M ${stub.x - 5} ${stub.y} h 10 M ${stub.x} ${stub.y - 5} v 10`}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              {/* a target the hand can actually find */}
              <circle cx={stub.x} cy={stub.y} r={20} fill="transparent" />
            </g>
          )}
          {anchor !== null && landing !== null && (
            <g>
              <line
                x1={anchor.x}
                y1={anchor.y}
                x2={landing.x}
                y2={landing.y}
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                strokeOpacity={0.85}
                strokeDasharray={thread?.writing ? "0" : "4 4"}
              />
              {thread?.onto == null && (
                <circle
                  cx={landing.x}
                  cy={landing.y}
                  r={6}
                  fill="var(--color-desk)"
                  stroke="var(--color-accent)"
                  strokeWidth={1.5}
                />
              )}
              {thread?.onto != null && (
                <circle
                  cx={landing.x}
                  cy={landing.y}
                  r={13}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={1.2}
                  strokeOpacity={0.8}
                />
              )}
            </g>
          )}

          {/* the names, over every node, each where placeLabels put it.
              None of them exists in the sky, so entering a lore is where they
              are born: they arrive instead of being switched on. */}
          <g className="pointer-events-none animate-appear">
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
      {/* The sentence, written on the thread itself. It is HTML over the
          drawing, placed at the middle of the line in screen coordinates -
          the same trick the LoreCard uses to hang beside a node. */}
      {thread?.writing && thread.onto != null && anchor !== null &&
        landing !== null &&
        (() => {
          const mid = {
            x: centre.x + pan.x + ((anchor.x + landing.x) / 2) * zoom,
            y: centre.y + pan.y + ((anchor.y + landing.y) / 2) * zoom,
          };
          const query = claim.trim().toLowerCase();
          const offered = usedLabels
            .filter((l) => !claimTyped || l.includes(query))
            .slice(0, 5);
          const isNew =
            claimTyped &&
            query !== "" &&
            !usedLabels.some((l) => l.toLowerCase() === query);
          return (
            <div
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
              style={{ left: mid.x, top: mid.y }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={claim}
                onChange={(e) => {
                  setClaim(e.target.value);
                  setClaimTyped(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitThread(claim);
                  if (e.key === "Escape") dropThread();
                }}
                className="w-33 text-center font-mono text-[12px] text-accent bg-desk border-0 border-b border-accent outline-none py-0.5"
              />
              <div className="mt-2.5 w-56 rounded-md border border-accent/50 bg-canvas px-3.5 py-3 animate-fade-in">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted mb-1.5">
                  labels you use
                </p>
                {offered.map((label) => (
                  <button
                    key={label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitThread(label);
                    }}
                    className="block w-full text-left py-0.5 pl-2 border-l-2 border-transparent hover:border-accent font-mono text-[12px] text-muted hover:text-accent cursor-pointer transition-colors truncate"
                  >
                    {label}
                  </button>
                ))}
                {isNew && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitThread(claim);
                    }}
                    className="block w-full text-left py-0.5 pl-2 border-l-2 border-transparent hover:border-accent font-mono text-[12px] text-accent cursor-pointer transition-colors truncate"
                  >
                    + {claim.trim()}
                  </button>
                )}
                <p className="mt-2 pt-2 border-t border-line font-mono text-[11px] text-muted opacity-70 truncate">
                  → {thread.onto.name}
                </p>
              </div>
            </div>
          );
        })()}
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
        const uncovered = boxSize.width - panelReserve(boxSize.width);
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
