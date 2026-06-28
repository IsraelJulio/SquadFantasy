import { draftTeams } from '../data/draftTeams'
import type { DraftOption, DraftPickHistoryItem, DraftTeam, Formation, FutsalPosition, GamePlayer } from '../types'
import { ATHLETE_POSITIONS, getRequiredSquadByFormation } from './formations'
import { hashSeed, seededRandom, shuffled } from './random'

export const MAX_RECENT_TEAMS = 5

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

export function getRemainingDraftPositions(squad: GamePlayer[], formation: Formation): FutsalPosition[] {
  const required = getRequiredSquadByFormation(formation)
  const order: FutsalPosition[] = [...ATHLETE_POSITIONS, 'TECNICO']
  return order.filter((position) => squad.filter((player) => player.position === position).length < required[position])
}

export function updateRecentTeamIds(previousRecentTeamIds: string[], newTeamIds: string[], maxRecentTeams = MAX_RECENT_TEAMS): string[] {
  return [...previousRecentTeamIds, ...newTeamIds].slice(-maxRecentTeams)
}

function playerRole(player: GamePlayer): DraftPickHistoryItem['role'] {
  return player.position === 'TECNICO' ? 'COACH' : 'PLAYER'
}

export function createDraftPickHistoryItem(params: {
  pickNumber: number
  player: GamePlayer
  team: DraftTeam
  selectedAt: string
}): DraftPickHistoryItem {
  return {
    pickNumber: params.pickNumber,
    playerId: params.player.id,
    playerName: params.player.name,
    position: params.player.position,
    role: playerRole(params.player),
    teamId: params.team.id,
    teamName: params.team.name,
    overallOriginal: params.player.overallOriginal,
    overall: params.player.overall,
    selectedAt: params.selectedAt,
  }
}

export function draftTeamCoversRemainingPositions(team: DraftTeam, currentSquad: GamePlayer[], formation: Formation): boolean {
  const remainingPositions = getRemainingDraftPositions(currentSquad, formation)
  const hasAthletes = team.players.some((player) => player.position !== 'TECNICO')
  if (!hasAthletes || remainingPositions.length === 0) return false
  return remainingPositions.every((position) => team.players.some((player) => player.position === position && getDraftPlayerAvailability(player, currentSquad, formation).available))
}

export function draftTeamHasNeededDraftOption(team: DraftTeam, currentSquad: GamePlayer[], formation: Formation): boolean {
  return team.players.some((player) => player.position !== 'TECNICO') && getNeededDraftOptions(team, currentSquad, formation).length > 0
}

function getNeededDraftOptions(team: DraftTeam, currentSquad: GamePlayer[], formation: Formation): GamePlayer[] {
  const remainingPositions = getRemainingDraftPositions(currentSquad, formation)
  return team.players.filter((player) => remainingPositions.includes(player.position) && getDraftPlayerAvailability(player, currentSquad, formation).available)
}

function teamHasNeededOption(team: DraftTeam, selectedPlayerIds: string[], requiredPositions: FutsalPosition[]): boolean {
  return team.players.some((player) => requiredPositions.includes(player.position) && !selectedPlayerIds.includes(player.id))
}

function relaxRecentTeams(teams: DraftTeam[], selectedPlayerIds: string[], requiredPositions: FutsalPosition[], recentTeamIds: string[]): DraftTeam[] {
  const eligible = teams.filter((team) => teamHasNeededOption(team, selectedPlayerIds, requiredPositions))
  const fresh = eligible.filter((team) => !recentTeamIds.includes(team.id))
  return fresh.length > 0 ? fresh : eligible
}

export function generateDraftOptions(params: {
  availableTeams: DraftTeam[]
  selectedPlayerIds: string[]
  requiredPositions: FutsalPosition[]
  recentTeamIds: string[]
  optionsCount: number
}): DraftOption[] {
  const options: DraftOption[] = []
  const usedTeamIds = new Set<string>()
  const usedPlayerIds = new Set<string>()
  const teams = relaxRecentTeams(params.availableTeams, params.selectedPlayerIds, params.requiredPositions, params.recentTeamIds)

  function addFrom(candidates: DraftTeam[], allowDuplicateTeam: boolean) {
    let added = true
    while (options.length < params.optionsCount && added) {
      added = false
      for (const team of candidates) {
        if (options.length >= params.optionsCount) return
        if (!allowDuplicateTeam && usedTeamIds.has(team.id)) continue
        const player = team.players.find((item) => params.requiredPositions.includes(item.position) && !params.selectedPlayerIds.includes(item.id) && !usedPlayerIds.has(item.id))
        if (!player) continue
        options.push({ player, teamId: team.id, teamName: team.name })
        usedTeamIds.add(team.id)
        usedPlayerIds.add(player.id)
        added = true
      }
    }
  }

  addFrom(teams, false)
  if (options.length < params.optionsCount) {
    addFrom(params.availableTeams.filter((team) => teamHasNeededOption(team, params.selectedPlayerIds, params.requiredPositions)), false)
  }
  if (options.length < params.optionsCount) {
    addFrom(params.availableTeams.filter((team) => teamHasNeededOption(team, params.selectedPlayerIds, params.requiredPositions)), true)
  }

  return options.slice(0, params.optionsCount)
}

export function getAvailableDraftTeams(campaignId: string, currentSquad: GamePlayer[], formation: Formation, recentTeamIds: string[] = []): DraftTeam[] {
  if (currentSquad.length >= 11) return []
  const random = seededRandom(hashSeed(`${campaignId}-team-round-${currentSquad.length}`))
  void recentTeamIds
  return shuffled(draftTeams, random).filter((team) => draftTeamHasNeededDraftOption(team, currentSquad, formation))
}

export function getDraftTeam(campaignId: string, currentSquad: GamePlayer[], formation: Formation, drawIndex = 0, recentTeamIds: string[] = []): DraftTeam | null {
  const availableTeams = getAvailableDraftTeams(campaignId, currentSquad, formation, recentTeamIds)
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
