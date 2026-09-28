// Where names go, so that no name ever sits on another.
//
// Each name asks for a spot next to what it names. The spots are tried in a
// fixed order - below first, where names have always been, then above, to the
// sides, on the diagonals, and a step further out - and the first one that
// touches no name already placed wins, ideally touching no node either. Names
// are placed in order of importance: whoever comes first keeps the natural
// spot, and the rest move around it. A name with nowhere to go waits for the
// hover, unless it is one that must always show.

export type Anchor = "start" | "middle" | "end";

// a spot for a name: where its baseline starts, and how it is anchored there
export type Spot = { dx: number; dy: number; anchor: Anchor };

export type LabelRequest = {
  key: string;
  // what the name belongs to: a point and the radius it occupies
  x: number;
  y: number;
  r: number;
  // one line or more, all the same size; the first sets the width
  lines: { text: string; size: number; family: string }[];
  // the spots to try, in order of preference
  spots: Spot[];
  // shown even when every spot is taken, on the least crowded one
  must?: boolean;
};

export type PlacedLabel = { x: number; y: number; anchor: Anchor };

type Box = { left: number; top: number; right: number; bottom: number };

// the spots around a round thing of radius r, for text of the given size
export function spotsAround(r: number, size: number): Spot[] {
  const drop = size * 0.35;
  const near = [
    { dx: 0, dy: r + size * 1.4, anchor: "middle" as const },
    { dx: 0, dy: -r - size * 0.6, anchor: "middle" as const },
    { dx: r + 5, dy: drop, anchor: "start" as const },
    { dx: -r - 5, dy: drop, anchor: "end" as const },
    { dx: r * 0.7 + 3, dy: r * 0.7 + size * 1.1, anchor: "start" as const },
    { dx: -r * 0.7 - 3, dy: r * 0.7 + size * 1.1, anchor: "end" as const },
    { dx: r * 0.7 + 3, dy: -r * 0.7 - 3, anchor: "start" as const },
    { dx: -r * 0.7 - 3, dy: -r * 0.7 - 3, anchor: "end" as const },
  ];
  const step = size * 1.2;
  const far = [
    { dx: 0, dy: r + size * 1.4 + step, anchor: "middle" as const },
    { dx: 0, dy: -r - size * 0.6 - step, anchor: "middle" as const },
    { dx: r + 5 + step, dy: drop, anchor: "start" as const },
    { dx: -r - 5 - step, dy: drop, anchor: "end" as const },
  ];
  return [...near, ...far];
}

let canvas: CanvasRenderingContext2D | null = null;
const widths = new Map<string, number>();
// how wide a piece of text is drawn, measured once and remembered
export function textWidth(text: string, size: number, family: string) {
  const key = `${size}|${family}|${text}`;
  const known = widths.get(key);
  if (known !== undefined) return known;
  canvas ??= document.createElement("canvas").getContext("2d");
  if (canvas === null) return text.length * size * 0.55;
  canvas.font = `${size}px ${family}`;
  const width = canvas.measureText(text).width;
  widths.set(key, width);
  return width;
}

// the font the page draws text in, when a name sets none of its own
export function pageFont() {
  return getComputedStyle(document.documentElement).fontFamily;
}

function boxOf(req: LabelRequest, spot: Spot): Box {
  const width = Math.max(
    ...req.lines.map((l) => textWidth(l.text, l.size, l.family)),
  );
  const first = req.lines[0]?.size ?? 10;
  const height = req.lines.reduce((sum, l) => sum + l.size * 1.3, 0);
  const x = req.x + spot.dx;
  const baseline = req.y + spot.dy;
  const left =
    spot.anchor === "middle" ? x - width / 2 : spot.anchor === "start" ? x : x - width;
  // a little air all round: names carry a halo stroke that reaches past the
  // letters, and two halos touching already reads as a collision
  const pad = 2;
  return {
    left: left - pad,
    right: left + width + pad,
    top: baseline - first * 0.8 - pad,
    bottom: baseline - first * 0.8 + height + pad,
  };
}

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

const touchesCircle = (b: Box, c: { x: number; y: number; r: number }) => {
  const nx = Math.max(b.left, Math.min(c.x, b.right));
  const ny = Math.max(b.top, Math.min(c.y, b.bottom));
  return Math.hypot(c.x - nx, c.y - ny) < c.r;
};

// Places the names in the order given. Obstacles are the round things names
// should rather not cover - the nodes, the you-node - but a name will sit on
// a node before it sits on another name.
export function placeLabels(
  requests: LabelRequest[],
  obstacles: { key?: string; x: number; y: number; r: number }[],
): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>();
  const taken: Box[] = [];
  for (const req of requests) {
    const boxes = req.spots.map((spot) => ({ spot, box: boxOf(req, spot) }));
    const free = boxes.filter(({ box }) => taken.every((t) => overlap(box, t) === 0));
    const clear = free.find(({ box }) =>
      obstacles.every((o) => o.key === req.key || !touchesCircle(box, o)),
    );
    let choice = clear ?? free[0];
    if (choice === undefined && req.must) {
      // nowhere free: the spot that covers the least of what is there
      choice = boxes.reduce((best, c) =>
        taken.reduce((sum, t) => sum + overlap(c.box, t), 0) <
        taken.reduce((sum, t) => sum + overlap(best.box, t), 0)
          ? c
          : best,
      );
    }
    if (choice === undefined) continue;
    taken.push(choice.box);
    placed.set(req.key, {
      x: req.x + choice.spot.dx,
      y: req.y + choice.spot.dy,
      anchor: choice.spot.anchor,
    });
  }
  return placed;
}
