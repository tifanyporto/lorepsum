import { useState, useEffect, useRef } from "react";
import type {
  User,
  EntityType,
  Entity,
  Relationship,
  EntityImage,
} from "./types";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";
import Wordmark from "./components/Wordmark";
import Search from "./components/Search";
import { API_URL } from "./api";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
  type Force,
} from "d3-force";

type GraphNode = SimulationNodeDatum & { id: number; name: string };
type GraphLink = SimulationLinkDatum<GraphNode>;
type PositionedLink = { source: GraphNode; target: GraphNode };

// radius of the clear zone reserved around the you-node at the origin. The
// crowd forms a ring outside it; nothing else is drawn inside it.
const KEEPOUT_RADIUS = 90;
// radius no edge between two other nodes may enter. Smaller than the node
// radius so a node on the rim can still be reached, and an edge that has to go
// around has room to do it without touching the ring of nodes.
const EDGE_CLEAR_RADIUS = 70;
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

// the you-node's zone as a rule on positions, not a force: whatever sits
// inside it is moved out to the rim along its own direction
function keepClear(n: { x?: number; y?: number }) {
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
function forceKeepOut(
  radius: number,
  strength = 1,
): Force<GraphNode, GraphLink> {
  let nodes: GraphNode[] = [];
  const force: Force<GraphNode, GraphLink> = (alpha: number) => {
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
  force.initialize = (n: GraphNode[]) => {
    nodes = n;
  };
  return force;
}

// the path of an edge between two crowd nodes. Straight when it stays clear of
// the you-node's zone. Otherwise it bends around it, the way light bends around
// a mass: one smooth curve that bows out on the side the straight line already
// leans to and only grazes the zone at a single point. Each bent edge gets its
// own curve from its own ends — they never pile onto one shared circle.
function edgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: number,
): string {
  const straight = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return straight;
  // the point of the straight line nearest the you-node
  const u = Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2));
  const px = a.x + u * dx;
  const py = a.y + u * dy;
  const d = Math.hypot(px, py);
  if (d >= r) return straight;

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
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

function Focus() {
  const [user, setUser] = useState<User>();
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entity, setEntity] = useState<Entity>();
  const [entities, setEntiies] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [entityImages, setEntityImages] = useState<EntityImage[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  // which connection types are expanded in the reading panel
  const [openTypes, setOpenTypes] = useState<string[]>([]);
  const [arrivalGloss, setArrivalGloss] = useState<string | null>(null);

  const fetchJson = async (url: string) => {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  };
  useEffect(() => {
    fetchJson(`${API_URL}/users/me`)
      .then((data) => {
        setUser(data);
        setFocusedId(data.self_entity_id);
      })
      .catch((error) => console.error(error));
    fetchJson(`${API_URL}/entity-types`)
      .then((data) => setEntityTypes(data))
      .catch((error) => console.error(error));

    fetchJson(`${API_URL}/entities`)
      .then((data) => setEntiies(data))
      .catch((error) => console.error(error));

    fetchJson(`${API_URL}/relationships`)
      .then((data) => setAllRelationships(data))
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    if (focusedId === null) return;
    fetchJson(`${API_URL}/entities/${focusedId}`)
      .then((data) => setEntity(data))
      .catch((error) => console.error(error));

    fetchJson(`${API_URL}/entities/${focusedId}/relationships`)
      .then((data) => setRelationships(data))
      .catch((error) => console.error(error));

    fetchJson(`${API_URL}/entities/${focusedId}/images`)
      .then((data) => setEntityImages(data))
      .catch((error) => console.error(error));

    setOpenTypes([]);
  }, [focusedId]);
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
    const el = svgRef.current;
    if (el === null) return;
    // fires whenever the element is resized, including the first measurement
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      setBoxSize({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // the you-node is drawn apart, pinned at the origin, so it stays out of
    // the simulation. Edges touching it fall away on their own: the link
    // filter below only keeps edges whose both ends are in this list.
    const nodes: GraphNode[] = entities
      .filter((e) => e.id !== user?.self_entity_id)
      .map((e) => {
        return { id: e.id, name: e.name };
      });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const links: GraphLink[] = allRelationships
      .filter((r) => nodeIds.has(r.source_id) && nodeIds.has(r.target_id))
      .map((r) => {
        return { source: r.source_id, target: r.target_id };
      });

    const simulation = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-300))
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((n) => n.id)
          .distance(90),
      )
      // the you-node is pinned at the origin, the centre of the drawing, and
      // the crowd is centred there too — but the keep-out force hollows a clear
      // zone around it, so the rest settles as a ring and never on top of it
      .force("center", forceCenter(0, 0))
      .force("keepout", forceKeepOut(KEEPOUT_RADIUS));
    simulation.stop();
    simulation.tick(300);
    // guarantee the clearing: the force leaves it nearly empty, and any
    // straggler still inside is moved out to the rim
    nodes.forEach(keepClear);

    // Where the layout put each node is its home. The layout above is still
    // computed once and never again: a pull is a gesture, not an edit, and
    // when it ends every node goes back here.
    const home = new Map(
      nodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]),
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
  }, [entities, allRelationships, user]);

  const type = entityTypes.find((t) => t.id === entity?.entity_type_id);
  const coverImage = entityImages.find((i) => i.cover);
  const coverUrl = `${API_URL}/media/${coverImage?.path}`;
  const gallery = entityImages.filter((g) => !g.cover);
  const thumbnailGallery = gallery.slice(0, 5);
  const remainingPhoto = gallery.length - thumbnailGallery.length;
  // each connection already resolved: the target's name and its type name
  const connections = relationships.map((r) => {
    const target = entities.find((e) => e.id === r.target_id);
    const targetType = entityTypes.find((t) => t.id === target?.entity_type_id);
    return {
      id: r.id,
      label: r.label,
      targetId: r.target_id,
      name: target?.name,
      gloss: r.gloss,
      typeName: targetType?.name ?? "others",
    };
  });
  // the types present in those connections, deduplicated
  const connectionTypes = [...new Set(connections.map((c) => c.typeName))];
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
  const selfEdges =
    user?.self_entity_id != null
      ? allRelationships.filter((r) => r.source_id === user.self_entity_id)
      : [];
  const selfEdgeReach = Math.max(
    1,
    ...selfEdges.map((r) => {
      const t = graphNodes.find((n) => n.id === r.target_id);
      return t?.x != null && t.y != null ? Math.hypot(t.x, t.y) : 0;
    }),
  );
  const selfId = user?.self_entity_id;
  // with you in focus, your connections are the neighbours that show a name,
  // as any focused entity's are. Your edges live outside graphLinks, so they
  // are added here by hand.
  if (selfId != null && focusedId === selfId)
    selfEdges.forEach((r) => neighborIds.add(r.target_id));
  // the panel is showing you. Purple is yours in the panel as in the graph: it
  // marks you at the top of this card and the claims in your connection list.
  // It follows the entity on screen, not the focus — the focus changes on the
  // click, the card only when its data arrives, and the kicker has to change
  // together with the name beneath it.
  const isSelf = selfId != null && entity?.id === selfId;
  // on anyone else's card: what you said about them, if you said anything
  const yourEdgesHere =
    isSelf || entity == null
      ? []
      : selfEdges.filter((r) => r.target_id === entity.id);

  // what a click on a node does: focus it, answer for the arrival, and glide
  // the camera to it. The camera aims at the node's home, so a click during
  // a pull's return lands where the node is going, not where it passes.
  const focusNode = (n: GraphNode) => {
    const at = liveRef.current?.home.get(n.id) ?? { x: n.x ?? 0, y: n.y ?? 0 };
    setFocusedId(n.id);
    setArrivalGloss(
      connections.find((c) => c.targetId === n.id)?.gloss ?? null,
    );
    setPan({ x: -at.x * zoom, y: -at.y * zoom });
  };
  // the pointer, in the drawing's own coordinates: the camera's translate and
  // scale, undone
  const toGraph = (clientX: number, clientY: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (box === undefined) return { x: 0, y: 0 };
    return {
      x: (clientX - box.left - box.width / 2 - pan.x) / zoom,
      y: (clientY - box.top - box.height / 2 - pan.y) / zoom,
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
      focusNode(press.node);
    }
  };
  return (
    <div className="h-screen relative overflow-hidden bg-desk">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 p-4 pointer-events-none *:pointer-events-auto">
        {/* lockup: symbol + wordmark, the symbol matching the text box height */}
        <a
          href="/"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="lorepsum"
        >
          <Logo className="w-10 h-10" />
          <Wordmark />
        </a>
        <div className="w-full">
          {
            <Search
              entities={entities}
              onSelect={(id) => {
                setFocusedId(id);
                setArrivalGloss(null);
              }}
            />
          }
        </div>
        <ThemeToggle />
      </div>
      <div className="absolute inset-0">
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={(e) =>
            setDragStart({
              pointerX: e.clientX,
              pointerY: e.clientY,
              panX: pan.x,
              panY: pan.y,
            })
          }
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
            transform={`translate(${boxSize.width / 2 + pan.x}, ${boxSize.height / 2 + pan.y}) scale(${zoom})`}
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
              return (
                <path
                  d={edgePath(
                    { x: l.source.x ?? 0, y: l.source.y ?? 0 },
                    { x: l.target.x ?? 0, y: l.target.y ?? 0 },
                    EDGE_CLEAR_RADIUS,
                  )}
                  fill="none"
                  stroke={
                    touchesFocus ? "var(--color-here)" : "var(--color-ink)"
                  }
                  strokeOpacity={
                    touchesHover ? 0.9 : touchesFocus ? 0.55 : 0.08
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
            {user?.self_entity_id != null &&
              allRelationships
                .filter((r) => r.source_id === user.self_entity_id)
                .map((r) => {
                  const target = graphNodes.find((n) => n.id === r.target_id);
                  if (target?.x == null || target.y == null) return null;
                  // walk 31 along the direction of the target, so the line
                  // leaves from the arc ring rather than from the core
                  const distance = Math.hypot(target.x, target.y);
                  const start = 31 / distance;
                  const isFocused = focusedId === user.self_entity_id;
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
              const showName = isFocused || isNeighbor || isHovered;
              const r = isFocused ? 9 : 6;
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
                    // a press here is not a pan. It stays a click unless it
                    // travels, and the svg takes the pointer so the pull keeps
                    // going when the pointer outruns the node
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      svgRef.current?.setPointerCapture(e.pointerId);
                      pressRef.current = {
                        node: n,
                        startX: e.clientX,
                        startY: e.clientY,
                        pulling: false,
                      };
                    }}
                  />
                  {showName && (
                    <text
                      x={n.x}
                      y={(n.y ?? 0) + r + 14}
                      textAnchor="middle"
                      fill={
                        isFocused ? "var(--color-ink)" : "var(--color-muted)"
                      }
                      fontSize={10}
                      stroke="var(--color-canvas)"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {n.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* the you-node: pinned at the origin, outside the simulation.
                  Placeholder shape until #6 decides what it looks like. */}
            {user?.self_entity_id != null && (
              <g
                onClick={() => {
                  setFocusedId(user.self_entity_id);
                  setArrivalGloss(null);
                  setPan({ x: 0, y: 0 });
                }}
                className="cursor-pointer"
              >
                {focusedId === user.self_entity_id && (
                  <circle
                    r={14}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={1.4}
                    className="pulse-ring"
                  />
                )}
                {/* two open arcs instead of a closed ring: the gaps let the
                      real edges pass through, so the shape never strangles a
                      connection the way a full circle would. Enlarged from r=27
                      to r=31 with a heavier stroke so the you-node holds its own
                      mass beside a lit focus — weight, not brightness. */}
                <g
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeOpacity={focusedId === user.self_entity_id ? 0.9 : 0.62}
                  className="transition-all duration-300"
                >
                  <path d="M -28 -14 A 31 31 0 0 1 28 -14" />
                  <path d="M 28 14 A 31 31 0 0 1 -28 14" />
                </g>
                {/* the core is a diamond, never a dot — it must not read as
                      one more node among the others */}
                <rect
                  x={-7}
                  y={-7}
                  width={14}
                  height={14}
                  transform="rotate(45)"
                  fill="var(--color-accent)"
                  fillOpacity={focusedId === user.self_entity_id ? 1 : 0.7}
                  className="transition-all duration-300"
                />
              </g>
            )}
          </g>
        </svg>
      </div>
      <div className="absolute top-17 right-12 bottom-5 z-10 w-105 overflow-y-auto scrollbar-accent rounded-xl border border-line bg-canvas px-6 py-7">
        {/* on your own card the type gives way to YOU, set above the whole
            header in the grammar of the panel's section headers — mono label,
            hairline running to the edge — but in your purple and a size up,
            so it heads the card instead of tagging it */}
        {isSelf && (
          <div className="flex items-center gap-2.5 mb-3.5">
            <h2 className="font-mono text-accent text-[13px] uppercase tracking-[0.24em]">
              you
            </h2>
            <span className="flex-1 h-px bg-accent/35" />
          </div>
        )}
        {/* header: cover + identity */}
        <div className="flex gap-4.5 items-start">
          <div className="w-32 h-32 border border-line rounded-md bg-desk overflow-hidden flex shrink-0 items-center justify-center">
            {coverImage ? (
              <img
                className="w-full h-full object-cover"
                src={coverUrl}
                alt={coverImage.description ?? `${entity?.name}'s cover photo`}
              />
            ) : (
              <Logo muted className="w-12 h-12" />
            )}
          </div>
          <div>
            {!isSelf && (
              // the kicker. On a card you point at, it also names your claim,
              // in purple: purple at the top of a card always means you
              <h2 className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em] mb-1.75">
                {type?.name}
                {yourEdgesHere.length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-accent">
                      {[
                        "you",
                        ...yourEdgesHere.flatMap((r) =>
                          r.label ? [r.label] : [],
                        ),
                      ].join(" · ")}
                    </span>
                  </>
                )}
              </h2>
            )}
            <h1 className="font-serif text-[28px] leading-[1.1] tracking-tight text-ink">
              {entity?.name}
            </h1>
            <p className="font-serif text-muted text-sm leading-[1.62] mt-2.75">
              {arrivalGloss ?? entity?.description}
            </p>
            {/* the size of what you built — the short version; the full
                statistics belong to a place of their own */}
            {isSelf && (
              <p className="font-mono text-muted text-[12px] opacity-70 mt-2.75">
                {entities.length}{" "}
                {entities.length === 1 ? "entity" : "entities"} ·{" "}
                {allRelationships.length}{" "}
                {allRelationships.length === 1 ? "connection" : "connections"}
              </p>
            )}
          </div>
        </div>

        {/* connections, grouped by type */}
        <section className="mt-7">
          <div className="flex items-center gap-2.5 mb-4.5">
            <span className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em]">
              connections
            </span>
            <span className="flex-1 h-px bg-line" />
            {relationships.length > 0 && (
              <button
                onClick={() =>
                  setOpenTypes(
                    openTypes.length === connectionTypes.length
                      ? []
                      : connectionTypes,
                  )
                }
                className="font-mono text-muted text-[9.5px] uppercase tracking-[0.14em] cursor-pointer hover:text-accent transition-colors"
              >
                {openTypes.length === connectionTypes.length
                  ? "collapse all"
                  : "expand all"}
              </button>
            )}
            <span className="font-mono text-muted text-[9.5px] opacity-70">
              {relationships.length}
            </span>
          </div>

          {relationships.length === 0 ? (
            <p className="font-mono text-muted text-[12px]">
              there are no connections yet.
            </p>
          ) : (
            connectionTypes.map((typeName) => {
              const rows = connections.filter((c) => c.typeName === typeName);
              const isOpen = openTypes.includes(typeName);
              return (
                <div key={typeName} className="mb-5.5 last:mb-0">
                  <div
                    onClick={() =>
                      setOpenTypes(
                        isOpen
                          ? openTypes.filter((t) => t !== typeName)
                          : [...openTypes, typeName],
                      )
                    }
                    className={`flex items-baseline gap-2.5 mb-2 cursor-pointer font-mono text-[14px] transition-colors hover:text-accent ${
                      isOpen ? "text-ink" : "text-muted"
                    }`}
                  >
                    <span
                      className={`inline-block w-1.75 text-[9px] opacity-50 transition-transform duration-200 ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                    <span>{typeName}</span>
                    <span className="text-[9.5px] opacity-55">
                      {rows.length}
                    </span>
                  </div>

                  {/* the drawer: 0fr -> 1fr is what makes the height animatable */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      {rows.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setFocusedId(c.targetId);
                            setArrivalGloss(c.gloss);
                          }}
                          className="group grid grid-cols-[94px_1fr] gap-4 items-baseline py-1.5 pl-0.5 border-l-2 border-transparent hover:border-accent transition-colors cursor-pointer"
                        >
                          {/* on your card the label is your own claim, so it
                              carries your colour */}
                          <span
                            className={`font-mono text-[12px] opacity-70 text-right truncate ${
                              isSelf ? "text-accent" : "text-muted"
                            }`}
                          >
                            {c.label}
                          </span>
                          <span className="font-serif text-ink text-[15.5px] leading-snug transition-colors group-hover:text-accent">
                            {c.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* gallery */}
        {gallery.length > 0 && (
          <section className="mt-7.5">
            <div className="flex items-center gap-2.5 mb-4.5">
              <span className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em]">
                gallery
              </span>
              <span className="flex-1 h-px bg-line" />
              <span className="font-mono text-muted text-[9.5px] opacity-70">
                {gallery.length}
              </span>
            </div>
            <div className="flex gap-2">
              {thumbnailGallery.map((i) => {
                const url = `${API_URL}/media/${i.path}`;
                return (
                  <img
                    key={i.id}
                    src={url}
                    alt={i.description ?? `${entity?.name}`}
                    className="w-14.5 h-14.5 object-cover rounded-md border border-line"
                  />
                );
              })}
              {remainingPhoto > 0 && (
                <div className="w-14.5 h-14.5 rounded-md border border-dashed border-line flex items-center justify-center bg-desk text-muted font-mono text-[11px]">
                  +{remainingPhoto}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
export default Focus;
