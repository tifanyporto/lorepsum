import type { LogoProps } from "../types";

function Logo({ className = "w-12 h-12", muted = false }: LogoProps) {
  const color = muted ? "var(--color-muted)" : "var(--color-ink)";
  const accentColor = muted ? "var(--color-muted)" : "var(--color-accent)";
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <line
        x1="23"
        y1="24"
        x2="10"
        y2="17"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="24"
        x2="37"
        y2="13"
        stroke={accentColor}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="24"
        x2="17"
        y2="38"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="24"
        x2="37"
        y2="35"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="17" r="2.8" fill={color} />
      <circle cx="37" cy="13" r="2.8" fill={color} />
      <circle cx="17" cy="38" r="2.8" fill={color} />
      <circle cx="37" cy="35" r="2.8" fill={color} />
      <circle cx="23" cy="24" r="5.6" fill={color} />
    </svg>
  );
}

export default Logo;
