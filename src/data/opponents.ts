import { buildOpponentFromJson, getAllTeams } from './futsalDatabase'

export const opponents = getAllTeams()
  .map((team) => buildOpponentFromJson(team.id))
  .filter((opponent) => {
    const athletes = opponent.players.filter((player) => player.position !== 'TECNICO')
    return athletes.length >= 5 && athletes.some((player) => player.position === 'GOLEIRO')
  })
