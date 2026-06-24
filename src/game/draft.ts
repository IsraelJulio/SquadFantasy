import { draftTeams } from '../data/draftTeams'
import type { DraftTeam, Formation, FutsalPosition, GamePlayer } from '../types'
import { ATHLETE_POSITIONS, getRequiredSquadByFormation } from './formations'
import { hashSeed, seededRandom, shuffled } from './random'

export function validateDraftPick(player: GamePlayer, currentSquad: GamePlayer[], formation: Formation): string | null {
  return getDraftPlayerAvailability(player, currentSquad, formation).reason
}

export interface DraftPlayerAvailability {
  available: boolean
  reason: string | null
  code: 'available' | 'already-picked' | 'unused-position' | 'position-complete' | 'athletes-complete' | 'squad-complete'
}

export function getDraftPlayerAvailability(player: GamePlayer, currentSquad: GamePlayer[], formation: Formation): DraftPlayerAvailability {
  const unavailable = (reason: string, code: Exclude<DraftPlayerAvailability['code'], 'available'>): DraftPlayerAvailability => ({ available: false, reason, code })
  if (currentSquad.some((item) => item.id === player.id)) return unavailable('Jogador já escolhido.', 'already-picked')
  const required = getRequiredSquadByFormation(formation)
  const currentForPosition = currentSquad.filter((item) => item.position === player.position).length
  if (required[player.position] === 0) return unavailable('Sua formação não usa essa posição.', 'unused-position')
  if (currentForPosition >= required[player.position]) return unavailable(player.position === 'TECNICO' ? 'Você já escolheu seu técnico.' : 'Essa posição já foi completada.', 'position-complete')
  const athleteCount = currentSquad.filter((item) => item.position !== 'TECNICO').length
  if (player.position !== 'TECNICO' && athleteCount >= 10) return unavailable('As 10 vagas de atletas já foram preenchidas.', 'athletes-complete')
  if (currentSquad.length >= 11) return unavailable('O elenco já atingiu 10 atletas e 1 técnico.', 'squad-complete')
  return { available: true, reason: null, code: 'available' }
}

export function getNextDraftPosition(squad: GamePlayer[], formation: Formation): FutsalPosition | null {
  const required = getRequiredSquadByFormation(formation)
  const order: FutsalPosition[] = [...ATHLETE_POSITIONS, 'TECNICO']
  return order.find((position) => squad.filter((player) => player.position === position).length < required[position]) ?? null
}

export function getAvailableDraftTeams(campaignId: string, currentSquad: GamePlayer[], formation: Formation): DraftTeam[] {
  if (currentSquad.length >= 11) return []
  const random = seededRandom(hashSeed(`${campaignId}-team-round-${currentSquad.length}`))
  return shuffled(draftTeams, random).filter((team) => team.players.some((player) => getDraftPlayerAvailability(player, currentSquad, formation).available))
}

export function getDraftTeam(campaignId: string, currentSquad: GamePlayer[], formation: Formation, drawIndex = 0): DraftTeam | null {
  const availableTeams = getAvailableDraftTeams(campaignId, currentSquad, formation)
  if (availableTeams.length === 0) return null
  return availableTeams[Math.max(0, drawIndex) % availableTeams.length]
}

export function validateSquadForFormation(squad: GamePlayer[], formation: Formation): string[] {
  const required = getRequiredSquadByFormation(formation)
  return (Object.entries(required) as [FutsalPosition, number][]).flatMap(([position, count]) => {
    const missing = count - squad.filter((player) => player.position === position).length
    return missing === 0 ? [] : [`${position}: ${missing > 0 ? `faltam ${missing}` : `sobram ${Math.abs(missing)}`}.`]
  })
}
