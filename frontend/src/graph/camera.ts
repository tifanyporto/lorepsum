import { useEffect, useState, type RefObject } from "react";
import type { Layout } from "./layout";

// the reading panel floats over the right of the drawing: 404px wide - the
// width of the search above it - and 4rem from the edge
export const PANEL_RESERVE = 404 + 64;
// below this much uncovered width no offset saves the view - the panel
// covers nearly everything, and that is a question of its own (#21)
const MIN_UNCOVERED = 320;

// The point the camera aims at: the middle of the strip the panel leaves
// uncovered, not the middle of the <svg> - the <svg> spans the whole window
// and the panel sits on top of its right side.
export function visibleCentre(width: number, height: number) {
  const uncovered = width - PANEL_RESERVE;
  return {
    x: uncovered >= MIN_UNCOVERED ? uncovered / 2 : width / 2,
    y: height / 2,
  };
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

