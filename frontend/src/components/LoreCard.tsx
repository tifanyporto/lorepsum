import { useState } from "react";

// a lore the card offers: its name is the door
export type Door = { id: number; name: string };

// how many doors show before the card offers "+ N more"
const SHOWN = 5;

// The card of an entity that lives in other lores. It opens beside the node,
// on the side facing out of the screen, joined to it by a hairline. Flat like
// everything else: the canvas, a hairline in `beyond`, no shadow. Each lore is
// a door; past five, "+ N more" grows the card in place, with its own scroll,
// so the card never sends anyone out of the constellation.
function LoreCard({
  title,
  heading,
  doors,
  x,
  y,
  side,
  onPick,
  onEnter,
  onLeave,
}: {
  title: string;
  // what the list is: ALSO IN at a lore's border, IN where no lore is open
  heading: string;
  doors: Door[];
  // the node, on screen
  x: number;
  y: number;
  side: "left" | "right";
  onPick: (loreId: number) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? doors : doors.slice(0, SHOWN);
  const hidden = doors.length - shown.length;
  const gap = 22;
  return (
    <>
      {/* the hairline from the node to the card */}
      <div
        className="absolute h-px bg-beyond/60 pointer-events-none"
        style={{
          left: side === "right" ? x + 7 : x - gap,
          top: y,
          width: gap - 7,
        }}
      />
      <div
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute z-20 w-56 rounded-md border border-beyond/60 bg-canvas px-3.5 py-3 animate-fade-in"
        style={{
          left: side === "right" ? x + gap : x - gap,
          top: y,
          transform: `translate(${side === "right" ? "0" : "-100%"}, -50%)`,
        }}
      >
        <p className="font-serif text-[16px] leading-tight text-ink">{title}</p>
        <p className="mt-2 mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted">
          {heading}
        </p>
        <div
          className={
            expanded ? "max-h-40 overflow-y-auto scrollbar-accent" : undefined
          }
        >
          {shown.map((door) => (
            <button
              key={door.id}
              onClick={() => onPick(door.id)}
              className="block w-full text-left py-1 pl-2 border-l-2 border-transparent hover:border-beyond font-mono text-[12px] text-beyond cursor-pointer transition-colors truncate"
            >
              {door.name} ↗
            </button>
          ))}
        </div>
        {hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-1 pl-2.5 font-mono text-[11px] text-muted hover:text-beyond cursor-pointer transition-colors"
          >
            + {hidden} more
          </button>
        )}
      </div>
    </>
  );
}

export default LoreCard;
