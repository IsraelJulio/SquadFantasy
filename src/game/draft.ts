import { players } from '../data/players'
import type { Formation, FutsalPosition, GamePlayer } from '../types'
import { ATHLETE_POSITIONS, getRequiredSquadByFormation } from './formations'
import { hashSeed, seededRandom, shuffled } from './random'

export function validateDraftPick(player: GamePlayer, currentSquad: GamePlayer[], formation: Formation): string | null {
  if (currentSquad.some((item) => item.id === player.id)) return 'Este nome já foi contratado.'
  const required = getRequiredSquadByFormation(formation)
  const count = currentSquad.filter((item) => item.position === player.position).length
  if (required[player.position] === 0) return `O ${player.position} não é usado nesta formação.`
  if (count >= required[player.position]) return `A quantidade de ${player.position} já está completa.`
  if (currentSquad.length >= 11) return 'O elenco já atingiu 10 atletas e 1 técnico.'
  return null
}

export function getNextDraftPosition(squad: GamePlayer[], formation: Formation): FutsalPosition | null {
  const required = getRequiredSquadByFormation(formation)
  const order: FutsalPosition[] = [...ATHLETE_POSITIONS, 'TECNICO']
  return order.find((position) => squad.filter((player) => player.position === position).length < required[position]) ?? null
}

export function getDraftOptions(campaignId: string, selectedIds: string[], formation: Formation): GamePlayer[] {
  const squad = selectedIds.map((id) => players.find((player) => player.id === id)).filter((player): player is GamePlayer => Boolean(player))
  const position = getNextDraftPosition(squad, formation)
  if (!position) return []
  const random = seededRandom(hashSeed(`${campaignId}-${selectedIds.length}-${position}`))
  const available = players.filter((player) => player.position === position && !selectedIds.includes(player.id))
  return shuffled(available, random).slice(0, 4)
}

export function validateSquadForFormation(squad: GamePlayer[], formation: Formation): string[] {
  const required = getRequiredSquadByFormation(formation)
  return (Object.entries(required) as [FutsalPosition, number][]).flatMap(([position, count]) => {
    const missing = count - squad.filter((player) => player.position === position).length
    return missing === 0 ? [] : [`${position}: ${missing > 0 ? `faltam ${missing}` : `sobram ${Math.abs(missing)}`}.`]
  })
}
