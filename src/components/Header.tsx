interface HeaderProps {
  onHome: () => void
  compact?: boolean
}

export function Header({ onHome, compact = false }: HeaderProps) {
  return (
    <header className={`site-header ${compact ? 'site-header--compact' : ''}`}>
      <button className="brand" onClick={onHome} aria-label="Ir para o início">
        <span className="brand__mark" aria-hidden="true">EI</span>
        <span><strong>Esquadrão</strong> Imortal</span>
      </button>
      <span className="header-chip">MODO COPA</span>
    </header>
  )
}
