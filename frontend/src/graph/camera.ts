import { useEffect, useState, type RefObject } from "react";

// the reading panel floats over the right of the drawing: 420px wide, 3rem
// from the edge
const PANEL_RESERVE = 420 + 48;
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
