import { useEffect, useState, type RefObject } from "react";
import type { Layout } from "./layout";

// The reading panel floats over the right of the drawing, so its column is
// the map's loss. These are the two ends of that column: the width it wants,
// and the width below which it is no longer worth reading.
export const PANEL_MAX = 404;
export const PANEL_MIN = 320;
// the margin it floats in, which is also the room the theme toggle sits in
export const PANEL_GUTTER = 64;
// the narrowest strip of map worth aiming at: under this, moving the camera
// would only choose which half of the node is hidden
const MAP_MIN = 300;

// How much of the window the panel takes at this width - the column plus its
// margin. It keeps the width it wants while the map can still spare it, then
// gives ground; when it can no longer be both readable and beside the map,
// the answer is zero: it stops floating, and the map keeps the whole window.
// One source of truth - the panel is sized from this and the camera aims
// around it, so the drawing and the frame cannot disagree.
export function panelReserve(width: number): number {
  const fits = Math.min(PANEL_MAX, width - PANEL_GUTTER - MAP_MIN);
  return fits >= PANEL_MIN ? fits + PANEL_GUTTER : 0;
}

// The point the camera aims at: the middle of the strip the panel leaves
// uncovered, not the middle of the <svg> - the <svg> spans the whole window
// and the panel sits on top of its right side. With no panel floating the
// two are the same point again.
export function visibleCentre(width: number, height: number) {
  return { x: (width - panelReserve(width)) / 2, y: height / 2 };
}

// the band the topbar holds, measured from the top of the window
const TOPBAR = 68;
// How far from an edge a node has to sit before it counts as seen - a node
// touching the border is technically visible and practically not. The two
// are different because a name is wide and short: sideways it needs room for
// the whole name, upwards only for its own line. Keeping them equal made the
// camera slide for nodes that were perfectly readable where they stood.
const KEEP_CLEAR_X = 100;
const KEEP_CLEAR_Y = 40;

// The camera that brings a point into view, and nothing more. A point already
// inside the visible strip returns the camera untouched - reading a connection
// must not drag the sky out from under you - and one outside returns the
// shortest slide that brings it in. The same rule answers for a click on a
// node and for a click on a line in the panel, so the two stop disagreeing.
export function panToReveal(
  point: { x: number; y: number },
  camera: { pan: { x: number; y: number }; zoom: number },
  box: { width: number; height: number },
): { x: number; y: number } {
  const centre = visibleCentre(box.width, box.height);
  const uncovered = box.width - panelReserve(box.width);
  // on a small window the margins would meet and cross; never let them ask
  // for more than a third of what there is
  const mx = Math.min(KEEP_CLEAR_X, uncovered / 3);
  const my = Math.min(KEEP_CLEAR_Y, (box.height - TOPBAR) / 3);
  const at = {
    x: centre.x + camera.pan.x + point.x * camera.zoom,
    y: centre.y + camera.pan.y + point.y * camera.zoom,
  };
  const dx =
    at.x < mx ? mx - at.x : at.x > uncovered - mx ? uncovered - mx - at.x : 0;
  const dy =
    at.y < TOPBAR + my
      ? TOPBAR + my - at.y
      : at.y > box.height - my
        ? box.height - my - at.y
        : 0;
  // the same object when nothing moves, so a render that changes no camera
  // cannot schedule another one
  if (dx === 0 && dy === 0) return camera.pan;
  return { x: camera.pan.x + dx, y: camera.pan.y + dy };
}

// The size of an element, kept current. It starts at the window's size - the
// drawings fill the window - so the first frame is already framed, instead of
// sliding in from the corner when the first measurement arrives.
export function useBoxSize(ref: RefObject<Element | null>) {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    // fires whenever the element is resized, including the first measurement
    const observer = new ResizeObserver(() => {
      const box = el.getBoundingClientRect();
      setSize({ width: box.width, height: box.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

// A camera over the sky: the sky point at the centre of the view, and how
// many screen pixels one sky unit takes.
export type SkyCamera = { x: number; y: number; k: number };

// A pure zoom from one camera to another. The one point both cameras frame at
// the same place on screen stays put, and everything else moves straight
// towards it or away from it. The scale changes geometrically - by the same
// factor every moment - which reads as moving through space rather than as a
// picture being stretched.
export function zoomBetween(
  a: SkyCamera,
  b: SkyCamera,
  t: number,
): SkyCamera {
  const k = a.k * Math.pow(b.k / a.k, t);
  if (Math.abs(b.k - a.k) < 1e-9)
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, k };
  const px = (b.x * b.k - a.x * a.k) / (b.k - a.k);
  const py = (b.y * b.k - a.y * a.k) / (b.k - a.k);
  return {
    x: px + ((a.x - px) * a.k) / k,
    y: py + ((a.y - py) * a.k) / k,
    k,
  };
}

// Where the anchor sits in each lore, and the camera that keeps it on the
// same spot of the screen in the lore being entered.
export function crossingCamera(
  from: Layout,
  to: Layout,
  anchorId: number,
  camera: { pan: { x: number; y: number }; zoom: number },
): { pan: { x: number; y: number }; zoom: number } {
  const find = (l: Layout) =>
    [...l.nodes, ...l.border].find((n) => n.id === anchorId);
  const a = find(from);
  const b = find(to);
  if (a === undefined || b === undefined) return camera;
  return {
    pan: {
      x: camera.pan.x + (a.x - b.x) * camera.zoom,
      y: camera.pan.y + (a.y - b.y) * camera.zoom,
    },
    zoom: camera.zoom,
  };
}

