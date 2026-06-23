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
  const rare = player.overall >= 86
  const stat = (value: number) => concealed ? '?' : value
  const athleteStats = player.kind === 'athlete' ? [
    [player.finishing, 'FIN'], [player.passing, 'PAS'], [player.marking, 'MAR'], [player.speed, 'VEL'], [player.dribbling, 'DRI'], [player.physical, 'FIS'],
  ] as const : [
    [player.attack, 'ATA'], [player.defense, 'DEF'], [player.tactics, 'TAT'], [player.motivation, 'MOT'], [player.squadManagement, 'GES'], [player.overall, 'OVR'],
  ] as const

  return (
    <article className={`player-card ${player.kind === 'coach' ? 'player-card--coach' : ''} ${rare ? 'player-card--rare' : ''} ${selected ? 'player-card--selected' : ''} ${compact ? 'player-card--compact' : ''}`}>
      {rare && <span className="rare-label">LENDA</span>}
      <div className="player-card__top"><div className="overall"><strong>{stat(player.overall)}</strong><span>OVR</span></div><div className="player-card__identity"><span className="position-badge">{positionCode[player.position]}</span><span className="country-badge">{player.country}</span></div></div>
      <div className="player-silhouette" aria-hidden="true"><span>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span></div>
      <div className="player-card__name"><h3>{player.name}</h3><p>{player.country} · {player.referenceYear}</p></div>
      {!compact && <div className="stats-grid" aria-label={concealed ? 'Atributos ocultos' : 'Atributos'}>{athleteStats.map(([value, label]) => <span key={label}><b>{stat(value)}</b> {label}</span>)}</div>}
      {onSelect && <button className="card-action" onClick={() => onSelect(player)}>Escolher {player.kind === 'coach' ? 'técnico' : 'atleta'} <span aria-hidden="true">→</span></button>}
    </article>
  )
}
