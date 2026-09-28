import { useRef } from "react";
import { EDGE_CLEAR_RADIUS, edgePath } from "../graph/geometry";
import { crossingCamera, useBoxSize, visibleCentre } from "../graph/camera";
import type { Layout, Placed } from "../graph/layout";
import YouNode from "./YouNode";

type Camera = { pan: { x: number; y: number }; zoom: number };

const clamp = (t: number) => Math.max(0, Math.min(1, t));
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

// a lore as it rests, without names: what dissolves, and what forms
function World({ layout, skip }: { layout: Layout; skip: number }) {
  const all = new Map(
    [...layout.nodes, ...layout.border].map((n) => [n.id, n] as const),
  );
  const edge = (l: { source: number; target: number }, beyond: boolean) => {
    const a = all.get(l.source);
    const b = all.get(l.target);
    if (a === undefined || b === undefined) return null;
    return (
      <path
        key={`${l.source}-${l.target}`}
        d={edgePath(a, b, EDGE_CLEAR_RADIUS)}
        fill="none"
        stroke={beyond ? "var(--color-beyond)" : "var(--color-ink)"}
        strokeOpacity={beyond ? 0.12 : 0.08}
      />
    );
  };
  const ring = (n: Placed) => (
    <circle
      key={n.id}
      cx={n.x}
      cy={n.y}
      r={4.5}
      fill="var(--color-desk)"
      stroke="var(--color-beyond)"
      strokeOpacity={0.55}
      strokeWidth={1.4}
    />
  );
  return (
    <>
      {layout.links.map((l) => edge(l, false))}
      {layout.borderLinks.map((l) => edge(l, true))}
      {layout.nodes
        .filter((n) => n.id !== skip)
        .map((n) => (
          <circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={6}
            fill="var(--color-ink)"
            fillOpacity={0.32}
          />
        ))}
      {layout.border.filter((n) => n.id !== skip).map(ring)}
      <YouNode focused={false} onClick={() => {}} />
    </>
  );
}

// The crossing. The node the door was chosen on does not move and does not
// disappear; what dissolves is the world around it. Its blue turns into the
// focus colour, the old lore loses its opacity and inflates outward from it,
// and the new lore comes in shrunk towards it and settles around it. The name
// in the header changes last, and the camera reframes only once everything
// has settled - both after this component is gone.
function Crossing({
  from,
  to,
  anchorId,
  anchorName,
  camera,
  progress,
}: {
  from: Layout;
  to: Layout;
  anchorId: number;
  anchorName: string;
  camera: Camera;
  progress: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const box = useBoxSize(svgRef);
  const centre = visibleCentre(box.width, box.height);
  const arrival = crossingCamera(from, to, anchorId, camera);
  const a = [...from.nodes, ...from.border].find((n) => n.id === anchorId);
  // the anchor on screen: the one point that holds still
  const at = {
    x: centre.x + camera.pan.x + (a?.x ?? 0) * camera.zoom,
    y: centre.y + camera.pan.y + (a?.y ?? 0) * camera.zoom,
  };
  const e = easeInOut(progress);
  const leaving = clamp(e / 0.7);
  const coming = easeOut(clamp((e - 0.3) / 0.7));
  // blue to the focus colour, first of all
  const turn = clamp(progress / 0.25);
  const around = (scale: number) =>
    `translate(${at.x} ${at.y}) scale(${scale}) translate(${-at.x} ${-at.y})`;
  const view = (c: Camera) =>
    `translate(${centre.x + c.pan.x} ${centre.y + c.pan.y}) scale(${c.zoom})`;
  const mix = (p: number) =>
    `color-mix(in srgb, var(--color-here) ${Math.round(p * 100)}%, var(--color-beyond))`;
  const r = (4.5 + (9 - 4.5) * turn) * camera.zoom;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg ref={svgRef} className="absolute inset-0 w-full h-full">
        <g transform={around(1 + 0.8 * leaving)} opacity={1 - leaving}>
          <g transform={view(camera)}>
            <World layout={from} skip={anchorId} />
          </g>
        </g>
        <g transform={around(0.25 + 0.75 * coming)} opacity={coming}>
          <g transform={view(arrival)}>
            <World layout={to} skip={anchorId} />
          </g>
        </g>
        <circle
          cx={at.x}
          cy={at.y}
          r={r}
          style={{
            fill: `color-mix(in srgb, var(--color-here) ${Math.round(turn * 100)}%, var(--color-desk))`,
            stroke: mix(turn),
          }}
          strokeWidth={1.4}
        />
        <text
          x={at.x}
          y={at.y + r + 14 * camera.zoom}
          textAnchor="middle"
          fontSize={10 * camera.zoom}
          fill="var(--color-ink)"
          stroke="var(--color-canvas)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {anchorName}
        </text>
      </svg>
    </div>
  );
}

export default Crossing;
