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

const CONSTELLATION_BOX_SIZE = 400;
const CONSTELLATION_CENTER = CONSTELLATION_BOX_SIZE / 2;

function Focus() {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entity, setEntity] = useState<Entity>();
  const [entities, setEntiies] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [focusedId, setFocusedId] = useState(16);
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
    fetch(`${API_URL}/entities/${focusedId}`)
      .then((res) => res.json())
      .then((data) => setEntity(data));

    fetch(`${API_URL}/entities/${focusedId}/relationships`)
      .then((res) => res.json())
      .then((data) => setRelationships(data));

    fetch(`${API_URL}/entities/${focusedId}/images`)
      .then((res) => res.json())
      .then((data) => setEntityImages(data));
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
    const nodes: GraphNode[] = entities.map((e) => {
      return { id: e.id, name: e.name };
    });
    const links: GraphLink[] = allRelationships.map((r) => {
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
  // quem encosta na entidade em foco — decide quem mostra o nome sem hover
  const neighborIds = new Set<number>();
  graphLinks.forEach((l) => {
    if (l.source.id === focusedId) neighborIds.add(l.target.id);
    if (l.target.id === focusedId) neighborIds.add(l.source.id);
  });
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex items-center justify-between gap-3 p-4">
        <Logo />
        <Search entities={entities} onSelect={setFocusedId} />
        <ThemeToggle />
      </div>
      <div className="max-w-xl mx-auto px-6 py-16">
        <div
          className="border border-line rounded relative"
          style={{
            width: CONSTELLATION_BOX_SIZE,
            height: CONSTELLATION_BOX_SIZE,
          }}
        >
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 cursor-grab active:cursor-grabbing"
            width={CONSTELLATION_BOX_SIZE}
            height={CONSTELLATION_BOX_SIZE}
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
              transform={`translate(${CONSTELLATION_CENTER + pan.x}, ${CONSTELLATION_CENTER + pan.y}) scale(${zoom})`}
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
                      touchesHover ? 0.9 : touchesFocus ? 0.55 : 0.12
                    }
                    strokeWidth={touchesHover ? 1.6 : 1.3}
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
                        isFocused || isNeighbor || isHovered ? 1 : 0.4
                      }
                      className="transition-all duration-300 cursor-pointer"
                      onClick={() => {
                        setFocusedId(n.id);
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
                        fontSize={11}
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
        <div className="flex gap-4 items-start">
          <div className="w-32 h-54 mb-4 border border-line rounded bg-desk overflow-hidden flex shrink-0 items-center justify-center">
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
            <h2 className="font-mono text-muted text-sm uppercase tracking-wider mb-4">
              {type?.name}
            </h2>
            <h1 className="font-serif text-4xl text-ink">{entity?.name}</h1>
            <p className="text-muted mt-3">{entity?.description}</p>
          </div>
        </div>
        <div className="border-t border-line mt-8 pt-6">
          <h3 className="font-mono text-muted text-xs uppercase tracking-wider mb-4">
            connections
          </h3>
          {relationships.map((c) => {
            const tName = entities.find((e) => e.id === c.target_id)?.name;
            return (
              <p className="mt-2 font-mono text-lg text-muted" key={c.id}>
                {c.label} →
                <a
                  onClick={() => setFocusedId(c.target_id)}
                  className="text-ink hover:text-accent cursor-pointer"
                >
                  {" "}
                  {tName}
                </a>
              </p>
            );
          })}
        </div>
        {gallery.length > 0 && (
          <div className="border-t border-line mt-8 pt-6 ">
            <div className="flex justify-between">
              <h3 className="font-mono text-muted text-xs uppercase tracking-wider mb-4">
                gallery
              </h3>
              <span className="font-mono text-muted text-xs uppercase tracking-wider mb-4">
                {gallery.length} photos
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
                    className="w-20 h-20 object-cover rounded border border-line"
                  />
                );
              })}
              {remainingPhoto > 0 && (
                <div className="w-20 h-20 rounded border border-dashed border-line flex items-center justify-center bg-desk text-muted">
                  +{remainingPhoto}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default Focus;
