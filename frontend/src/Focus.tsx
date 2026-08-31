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

const CONSTELLATION_BOX_SIZE = 400;
const CONSTELLATION_CENTER = CONSTELLATION_BOX_SIZE / 2;
const CONSTELLATION_RADIUS = 140;

function Focus() {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [entity, setEntity] = useState<Entity>();
  const [entities, setEntiies] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
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
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/entity-types`)
      .then((res) => res.json())
      .then((data) => setEntityTypes(data));

    fetch(`${API_URL}/entities`)
      .then((res) => res.json())
      .then((data) => setEntiies(data));
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
    const links: GraphLink[] = relationships.map((r) => {
      return { source: r.source_id, target: r.target_id };
    });

    const simulation = forceSimulation(nodes)
      .force("charge", forceManyBody())
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links).id((n) => n.id),
      )
      .force("center", forceCenter(0, 0));
    simulation.stop();
    simulation.tick(300);
    setGraphNodes(nodes);
    setGraphLinks(links);
  }, [entities, relationships]);

  const type = entityTypes.find((t) => t.id === entity?.entity_type_id);
  const coverImage = entityImages.find((i) => i.cover);
  const coverUrl = `${API_URL}/media/${coverImage?.path}`;
  const gallery = entityImages.filter((g) => !g.cover);
  const thumbnailGallery = gallery.slice(0, 5);
  const remainingPhoto = gallery.length - thumbnailGallery.length;
  const step = (2 * Math.PI) / relationships.length;
  const connections = relationships.map((r, i) => {
    const angle = i * step;
    const entityName = entities.find((e) => e.id === r.target_id)?.name;
    return {
      id: r.id,
      x: Math.cos(angle) * CONSTELLATION_RADIUS,
      y: Math.sin(angle) * CONSTELLATION_RADIUS,
      target: r.target_id,
      entity_name: entityName,
    };
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
            >
              {connections.map((c) => {
                return (
                  <line
                    x1={0}
                    y1={0}
                    x2={c.x}
                    y2={c.y}
                    stroke="var(--color-accent)"
                    key={c.id}
                    strokeOpacity={hoveredId === c.id ? 0.9 : 0.55}
                    strokeWidth={hoveredId === c.id ? 1.6 : 1.3}
                  />
                );
              })}
              <circle
                cx={0}
                cy={0}
                r={9}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1.4}
                className="pulse-ring"
              ></circle>
              <circle
                cx={0}
                cy={0}
                r={9}
                fill="none"
                stroke="var(--color-accent)"
                className="pulse-ring"
                strokeWidth={1.4}
                style={{ animationDelay: "1.3s" }}
              ></circle>
              <circle cx={0} cy={0} r={9} fill="var(--color-accent)"></circle>
              {connections.map((c) => {
                return (
                  <g
                    key={c.id}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={6}
                      fill={
                        hoveredId === c.id
                          ? "var(--color-accent)"
                          : "var(--color-ink)"
                      }
                      className="cursor-pointer"
                      onClick={() => setFocusedId(c.target)}
                    ></circle>
                    <text
                      x={c.x}
                      y={c.y < 0 ? c.y - 15 : c.y + 20}
                      textAnchor="middle"
                      fill="var(--color-ink)"
                      fontSize={11}
                    >
                      {c.entity_name}
                    </text>
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
