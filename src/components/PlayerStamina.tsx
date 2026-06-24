import type { GameAthlete } from '../types'

interface PlayerStaminaProps { player: GameAthlete; showOverall: boolean }

export function PlayerStamina({ player, showOverall }: PlayerStaminaProps) {
  const level = player.stamina > 70 ? 'high' : player.stamina >= 40 ? 'medium' : 'low'
  return (
    <span className="player-energy">
      <span className="player-energy__rating">{showOverall ? <><b>{player.overall}</b> / {player.overallOriginal}</> : <b>OVR oculto</b>}{player.stamina < 40 && <em>Cansado</em>}</span>
      <span className={`stamina-bar stamina-bar--${level}`}><i style={{ width: `${player.stamina}%` }} /></span>
      <small>{player.stamina}% energia</small>
    </span>
  )
}
