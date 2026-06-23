import type { GamePlayer } from '../types'

interface PlayerCardProps {
  player: GamePlayer
  onSelect?: (player: GamePlayer) => void
  selected?: boolean
  compact?: boolean
  concealed?: boolean
}

const positionCode = {
  Goleiro: 'GOL',
  Zagueiro: 'ZAG',
  Lateral: 'LAT',
  'Meio-campo': 'MEI',
  Atacante: 'ATA',
}

export function PlayerCard({ player, onSelect, selected = false, compact = false, concealed = false }: PlayerCardProps) {
  const rare = player.overall >= 86
  const stat = (value: number) => concealed ? '?' : value

  return (
    <article className={`player-card ${rare ? 'player-card--rare' : ''} ${selected ? 'player-card--selected' : ''} ${compact ? 'player-card--compact' : ''}`}>
      {rare && <span className="rare-label">CAMPEÃO</span>}
      <div className="player-card__top">
        <div className="overall"><strong>{stat(player.overall)}</strong><span>OVR</span></div>
        <div className="player-card__identity">
          <span className="position-badge">{positionCode[player.position]}</span>
          <span className="country-badge">{player.country}</span>
        </div>
      </div>
      <div className="player-silhouette" aria-hidden="true"><span>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span></div>
      <div className="player-card__name">
        <h3>{player.name}</h3>
        <p>{player.country} · {player.referenceYear}</p>
      </div>
      {!compact && (
        <div className="stats-grid" aria-label={concealed ? 'Atributos ocultos' : 'Atributos'}>
          <span><b>{stat(player.attack)}</b> ATA</span><span><b>{stat(player.defense)}</b> DEF</span>
          <span><b>{stat(player.technique)}</b> TEC</span><span><b>{stat(player.speed)}</b> VEL</span>
          <span><b>{stat(player.physical)}</b> FIS</span><span><b>{stat(player.mentality)}</b> MEN</span>
        </div>
      )}
      {onSelect && (
        <button className="card-action" onClick={() => onSelect(player)}>
          Escolher jogador <span aria-hidden="true">→</span>
        </button>
      )}
    </article>
  )
}
