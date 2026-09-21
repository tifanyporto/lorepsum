function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      {/* lens + handle */}
      <circle cx="10" cy="10" r="7" stroke="var(--color-ink)" strokeWidth="1.6" />
      <line x1="15" y1="15" x2="20.5" y2="20.5" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />

      {/* two loose nodes, off-axis */}
      <circle cx="8"  cy="8"  r="1.2" fill="var(--color-ink)" />
      <circle cx="12" cy="12" r="1.2" fill="var(--color-ink)" />
    </svg>
  )
}

export default SearchIcon