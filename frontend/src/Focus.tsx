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
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

type GraphNode = SimulationNodeDatum & { id: number; name: string };
type GraphLink = SimulationLinkDatum<GraphNode>;
type PositionedLink = { source: GraphNode; target: GraphNode };

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
      .force("center", forceCenter(0, 0));
    simulation.stop();
    simulation.tick(300);
    setGraphNodes(nodes);
    setGraphLinks(links as unknown as PositionedLink[]);
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
  return (
    <div className="h-screen relative overflow-hidden bg-desk">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 p-4 pointer-events-none [&>*]:pointer-events-auto">
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
              if (dragStart === null) return;
              setPan({
                x: dragStart.panX + (e.clientX - dragStart.pointerX),
                y: dragStart.panY + (e.clientY - dragStart.pointerY),
              });
            }}
            onPointerUp={() => setDragStart(null)}
            onPointerLeave={() => setDragStart(null)}
          >
            <g
              transform={`translate(${boxSize.width / 2 + pan.x}, ${boxSize.height / 2 + pan.y}) scale(${zoom})`}
              className={
                dragStart ? "" : "transition-transform duration-500 ease-out"
              }
            >
              {graphLinks.map((l) => {
                const touchesFocus =
                  l.source.id === focusedId || l.target.id === focusedId;
                const touchesHover =
                  l.source.id === hoveredId || l.target.id === hoveredId;
                return (
                  <line
                    x1={l.source.x}
                    y1={l.source.y}
                    x2={l.target.x}
                    y2={l.target.y}
                    stroke={
                      touchesFocus ? "var(--color-accent)" : "var(--color-ink)"
                    }
                    strokeOpacity={
                      touchesHover ? 0.9 : touchesFocus ? 0.55 : 0.16
                    }
                    strokeWidth={touchesHover ? 1.6 : touchesFocus ? 1.3 : 1}
                    key={`${l.source.id}-${l.target.id}`}
                    className="transition-all duration-300"
                  />
                );
              })}
              {graphNodes.map((n) => {
                const isFocused = n.id === focusedId;
                const isNeighbor = neighborIds.has(n.id);
                const isHovered = n.id === hoveredId;
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
                          stroke="var(--color-accent)"
                          strokeWidth={1.4}
                          className="pulse-ring"
                        />
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r}
                          fill="none"
                          stroke="var(--color-accent)"
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
                          ? "var(--color-accent)"
                          : "var(--color-ink)"
                      }
                      fillOpacity={
                        isFocused || isHovered ? 1 : isNeighbor ? 0.9 : 0.45
                      }
                      className="transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        setFocusedId(n.id);
                        setArrivalGloss(
                          connections.find((c) => c.targetId === n.id)?.gloss ??
                            null,
                        );
                        setPan({
                          x: -(n.x ?? 0) * zoom,
                          y: -(n.y ?? 0) * zoom,
                        });
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
                      r={12}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.4}
                      className="pulse-ring"
                    />
                  )}
                  {/* two open arcs instead of a closed ring: the gaps let the
                      real edges pass through, so the shape never strangles a
                      connection the way a full circle would */}
                  <g
                    fill="none"
                    stroke={
                      focusedId === user.self_entity_id
                        ? "var(--color-accent)"
                        : "var(--color-line)"
                    }
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeOpacity={0.8}
                    className="transition-all duration-300"
                  >
                    <path d="M -24 -12 A 27 27 0 0 1 24 -12" />
                    <path d="M 24 12 A 27 27 0 0 1 -24 12" />
                  </g>
                  {/* the core is a diamond, never a dot — it must not read as
                      one more node among the others */}
                  <rect
                    x={-6}
                    y={-6}
                    width={12}
                    height={12}
                    transform="rotate(45)"
                    fill={
                      focusedId === user.self_entity_id
                        ? "var(--color-accent)"
                        : "var(--color-ink)"
                    }
                    fillOpacity={focusedId === user.self_entity_id ? 1 : 0.8}
                    className="transition-all duration-300"
                  />
                </g>
              )}
            </g>
          </svg>
      </div>
      <div className="absolute top-[68px] right-5 bottom-5 z-10 w-[420px] overflow-y-auto scrollbar-accent rounded-xl border border-line bg-canvas px-6 py-7">
          {/* header: cover + identity */}
          <div className="flex gap-[18px] items-start">
            <div className="w-32 h-32 border border-line rounded-md bg-desk overflow-hidden flex shrink-0 items-center justify-center">
              {coverImage ? (
                <img
                  className="w-full h-full object-cover"
                  src={coverUrl}
                  alt={
                    coverImage.description ?? `${entity?.name}'s cover photo`
                  }
                />
              ) : (
                <Logo muted className="w-12 h-12" />
              )}
            </div>
            <div>
              <h2 className="font-mono text-muted text-[9.5px] uppercase tracking-[0.22em] mb-[7px]">
                {type?.name}
              </h2>
              <h1 className="font-serif text-[28px] leading-[1.1] tracking-tight text-ink">
                {entity?.name}
              </h1>
              <p className="font-serif text-muted text-sm leading-[1.62] mt-[11px]">
                {arrivalGloss ?? entity?.description}
              </p>
            </div>
          </div>

          {/* connections, grouped by type */}
          <section className="mt-7">
            <div className="flex items-center gap-2.5 mb-[18px]">
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
                  <div key={typeName} className="mb-[22px] last:mb-0">
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
                        className={`inline-block w-[7px] text-[9px] opacity-50 transition-transform duration-200 ${
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
                            <span className="font-mono text-muted text-[12px] opacity-70 text-right truncate">
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
            <section className="mt-[30px]">
              <div className="flex items-center gap-2.5 mb-[18px]">
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
                      className="w-[58px] h-[58px] object-cover rounded-md border border-line"
                    />
                  );
                })}
                {remainingPhoto > 0 && (
                  <div className="w-[58px] h-[58px] rounded-md border border-dashed border-line flex items-center justify-center bg-desk text-muted font-mono text-[11px]">
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
