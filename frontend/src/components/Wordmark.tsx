import type { WordmarkProps } from "../types";

// The mark: `lore` in accent, `psum` in ink, accent dot.
// Fraunces in display mode — SOFT rounds the corners, WONK lets its most
// characteristic shapes loose. It pays off at large sizes and disappears at
// 18px, which is fine: in the topbar the symbol beside it does the identifying.
function Wordmark({ className = "text-[19px]" }: WordmarkProps) {
  return (
    <span
      className={`font-serif font-semibold tracking-[-0.02em] leading-none select-none ${className}`}
      style={{ fontVariationSettings: "'SOFT' 60, 'WONK' 1" }}
    >
      <span className="text-accent">lore</span>
      <span className="text-ink">psum</span>
      <span className="text-accent">.</span>
    </span>
  );
}

export default Wordmark;
