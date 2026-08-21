function Logo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16">
      <line x1="23" y1="24" x2="10" y2="17" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="23" y1="24" x2="37" y2="13" stroke="var(--color-accent)" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="23" y1="24" x2="17" y2="38" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="23" y1="24" x2="37" y2="35" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="10" cy="17" r="2.8" fill="var(--color-ink)" />
      <circle cx="37" cy="13" r="2.8" fill="var(--color-ink)" />
      <circle cx="17" cy="38" r="2.8" fill="var(--color-ink)" />
      <circle cx="37" cy="35" r="2.8" fill="var(--color-ink)" />
      <circle cx="23" cy="24" r="5.6" fill="var(--color-ink)" />
    </svg>
  )
}

export default Logo