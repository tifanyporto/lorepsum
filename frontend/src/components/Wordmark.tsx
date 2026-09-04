import type { WordmarkProps } from "../types";

// A marca: `lore` em roxo, `psum` em tinta, ponto roxo.
// Fraunces em modo display — SOFT arredonda os cantos, WONK solta as formas
// mais características dela. Rende em tamanho grande e some em 18px, o que é
// aceitável: na topbar quem identifica é o símbolo ao lado.
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
