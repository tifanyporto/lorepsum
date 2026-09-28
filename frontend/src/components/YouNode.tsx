// The you-node, drawn at the origin of whatever group holds it. Placeholder
// shape until #6 decides what it looks like.
function YouNode({
  focused,
  onClick,
}: {
  focused: boolean;
  onClick: () => void;
}) {
  return (
    <g onClick={onClick} className="cursor-pointer">
      {focused && (
        <circle
          r={14}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.4}
          className="pulse-ring"
        />
      )}
      {/* two open arcs instead of a closed ring: the gaps let the real edges
          pass through, so the shape never strangles a connection the way a
          full circle would. Enlarged from r=27 to r=31 with a heavier stroke
          so the you-node holds its own mass beside a lit focus — weight, not
          brightness. */}
      <g
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeOpacity={focused ? 0.9 : 0.62}
        className="transition-all duration-300"
      >
        <path d="M -28 -14 A 31 31 0 0 1 28 -14" />
        <path d="M 28 14 A 31 31 0 0 1 -28 14" />
      </g>
      {/* the core is a diamond, never a dot — it must not read as one more
          node among the others */}
      <rect
        x={-7}
        y={-7}
        width={14}
        height={14}
        transform="rotate(45)"
        fill="var(--color-accent)"
        fillOpacity={focused ? 1 : 0.7}
        className="transition-all duration-300"
      />
    </g>
  );
}

export default YouNode;
