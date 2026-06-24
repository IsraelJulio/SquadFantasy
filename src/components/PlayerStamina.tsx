import type { GameAthlete } from '../types'

interface PlayerStaminaProps { player: GameAthlete }

export function PlayerStamina({ player }: PlayerStaminaProps) {
  const level = player.stamina > 70 ? 'high' : player.stamina >= 40 ? 'medium' : 'low'
  return (
    <span className="player-energy">
      <span className="player-energy__rating"><b>{player.overall}</b> / {player.overallOriginal}{player.stamina < 40 && <em>Cansado</em>}</span>
      <span className={`stamina-bar stamina-bar--${level}`}><i style={{ width: `${player.stamina}%` }} /></span>
      <small>{player.stamina}% energia</small>
    </span>
  )
}
