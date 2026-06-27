import type { DraftTeam } from '../types'
import { buildDraftTeamFromJson, getAllTeams } from './futsalDatabase'

export const draftTeams: DraftTeam[] = getAllTeams()
  .map((team) => buildDraftTeamFromJson(team.id))
  .filter((team) => team.players.some((player) => player.position !== 'TECNICO'))
