import type { GameAthlete } from '../types'

interface PlayerStaminaProps {
  player: GameAthlete
}

export function PlayerStamina({ player }: PlayerStaminaProps) {
  const level = player.stamina > 70 ? 'high' : player.stamina >= 40 ? 'medium' : 'low'
  const status = player.stamina >= 80 ? 'Descansado' : player.stamina >= 55 ? 'Normal' : player.stamina >= 30 ? 'Cansado' : 'Exausto'
  return (
    <span className="player-energy">
      <span className="player-energy__rating">
        <><b>{player.overall}</b> OVR atual</>
        <em className={`player-energy__status player-energy__status--${level}`}>{status}</em>
      </span>
      <span className={`stamina-bar stamina-bar--${level}`}><i style={{ width: `${player.stamina}%` }} /></span>
      <small>Estamina: {player.stamina}%</small>
    </span>
  )
}
