import type { GamePlayer } from '../types'

interface PlayerCardProps {
  player: GamePlayer
  onSelect?: (player: GamePlayer) => void
  selected?: boolean
  compact?: boolean
  concealed?: boolean
}

const positionCode = { GOLEIRO: 'GOL', FIXO: 'FIX', ALA: 'ALA', PIVO: 'PIV', TECNICO: 'TEC' }

export function PlayerCard({ player, onSelect, selected = false, compact = false, concealed = false }: PlayerCardProps) {
  const coach = player.position === 'TECNICO'
  const rare = player.overallOriginal >= 86
  const rating = concealed ? '?' : player.overall

  return (
    <article className={`player-card ${coach ? 'player-card--coach' : ''} ${rare ? 'player-card--rare' : ''} ${selected ? 'player-card--selected' : ''} ${compact ? 'player-card--compact' : ''}`}>
      {rare && <span className="rare-label">LENDA</span>}
      <div className="player-card__top"><div className="overall"><strong>{rating}</strong><span>OVR</span></div><div className="player-card__identity"><span className="position-badge">{positionCode[player.position]}</span></div></div>
      <div className="player-silhouette" aria-hidden="true"><span>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span></div>
      <div className="player-card__name"><h3>{player.name}</h3><p>{coach ? 'Técnico' : player.position} · overall base {concealed ? '?' : player.overallOriginal}</p></div>
      {!compact && <div className="overall-only"><span>FORÇA PRINCIPAL</span><strong>{rating}</strong><small>OVERALL</small></div>}
      {onSelect && <button className="card-action" onClick={() => onSelect(player)}>Escolher {coach ? 'técnico' : 'atleta'} <span aria-hidden="true">→</span></button>}
    </article>
  )
}
