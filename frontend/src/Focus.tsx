import { useState, useEffect, useRef } from "react";
import type { EntityType, Entity, Relationship, EntityImage } from "./types";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";
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
  // quais tipos de conexão estão abertos no painel de leitura
  const [openTypes, setOpenTypes] = useState<string[]>([]);
  const [arrivalGloss, setArrivalGloss] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/entity-types`)
      .then((res) => res.json())
      .then((data) => setEntityTypes(data));

    fetch(`${API_URL}/entities`)
      .then((res) => res.json())
      .then((data) => setEntiies(data));

    fetch(`${API_URL}/relationships`)
      .then((res) => res.json())
      .then((data) => setAllRelationships(data));
  }, []);

  useEffect(() => {
    if (focusedId === null) return;
    fetch(`${API_URL}/entities/${focusedId}`)
      .then((res) => res.json())
      .then((data) => setEntity(data));

    fetch(`${API_URL}/entities/${focusedId}/relationships`)
      .then((res) => res.json())
      .then((data) => setRelationships(data));

    fetch(`${API_URL}/entities/${focusedId}/images`)
      .then((res) => res.json())
      .then((data) => setEntityImages(data));

    setOpenTypes([]);
  }, [focusedId]);
  useEffect(() => {
    // o <svg>
    const el = svgRef.current;
    if (el === null) return;
    // o que fazer quando a roda do mouse girar sobre o SVG
    const handleWheel = (e: WheelEvent) => {
      // cancela a rolagem da página, só funciona porque o ouvinte não é passivo
      e.preventDefault();
      // pra cima aproxima, pra baixo afasta; preso entre 0.4 e 2.5
      setZoom(
        Math.min(2.5, Math.max(0.4, e.deltaY < 0 ? zoom * 1.1 : zoom / 1.1)),
      );
    };
    // registra na mão, avisando que este ouvinte PODE cancelar o evento
    el.addEventListener("wheel", handleWheel, { passive: false });
    // limpeza: tira este ouvinte antes de registrar o próximo
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  useEffect(() => {
    const el = svgRef.current;
    if (el === null) return;
    // avisa toda vez que o elemento muda de tamanho (inclusive na primeira medida)
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      setBoxSize({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nodes: GraphNode[] = entities.map((e) => {
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
  }, [entities, allRelationships]);

  const type = entityTypes.find((t) => t.id === entity?.entity_type_id);
  const coverImage = entityImages.find((i) => i.cover);
  const coverUrl = `${API_URL}/media/${coverImage?.path}`;
  const gallery = entityImages.filter((g) => !g.cover);
  const thumbnailGallery = gallery.slice(0, 5);
  const remainingPhoto = gallery.length - thumbnailGallery.length;
  // cada conexão já resolvida: nome do destino e nome do tipo dele
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
  // os tipos presentes nessas conexões, sem repetir
  const connectionTypes = [...new Set(connections.map((c) => c.typeName))];
  // quem encosta na entidade em foco — decide quem mostra o nome sem hover
  const neighborIds = new Set<number>();
  graphLinks.forEach((l) => {
    if (l.source.id === focusedId) neighborIds.add(l.target.id);
    if (l.target.id === focusedId) neighborIds.add(l.source.id);
  });
  return (
    <div className="h-screen flex flex-col bg-desk">
      <div className="flex items-center justify-between gap-3 p-4">
        <Logo />
        {
          <Search
            entities={entities}
            onSelect={(id) => {
              setFocusedId(id);
              setArrivalGloss(null);
            }}
          />
        }
        <ThemeToggle />
      </div>
      <div className="flex flex-1 min-h-0 max-h-[640px] my-auto w-full max-w-[1600px] mx-auto gap-3 px-8 pb-6 items-stretch">
        <div className="relative flex-1 min-w-0 overflow-hidden rounded-xl border border-line bg-canvas">
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
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
            </g>
          </svg>
        </div>
        <div className="basis-[450px] grow-0 shrink min-w-0 overflow-y-auto scrollbar-accent rounded-xl border border-line bg-canvas px-6 py-7">
          {/* cabeçalho: capa + identificação */}
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

          {/* conexões, agrupadas por tipo */}
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

                    {/* a gaveta: 0fr → 1fr é o que dá altura animável */}
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

          {/* galeria */}
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
    </div>
  );
}
export default Focus;
