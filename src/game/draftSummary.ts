import type { DraftSummaryGrade, Formation, GameAthlete, GameCoach, GamePlayer } from '../types'
import { ATHLETE_POSITIONS, getRequiredSquadByFormation } from './formations'

const average = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function athletesFrom(players: GamePlayer[]): GameAthlete[] {
  return players.filter((player): player is GameAthlete => player.position !== 'TECNICO')
}

function positionAverage(players: GameAthlete[], position: GameAthlete['position']) {
  return average(players.filter((player) => player.position === position).map((player) => player.overall))
}

function calculateFormationFitScore(players: GamePlayer[], formationKey: Formation): number {
  const required = getRequiredSquadByFormation(formationKey)
  const athletes = athletesFrom(players)
  const positionScores = ATHLETE_POSITIONS.map((position) => {
    if (required[position] === 0) return 100
    const count = athletes.filter((player) => player.position === position).length
    const countScore = clamp((count / required[position]) * 100, 0, 100)
    const qualityScore = positionAverage(athletes, position)
    return countScore * 0.45 + qualityScore * 0.55
  })
  return average(positionScores)
}

function calculateStaminaProfileScore(players: GamePlayer[]): number {
  const athletes = athletesFrom(players)
  if (athletes.length === 0) return 0
  return clamp(100 - average(athletes.map((player) => ((player.fatigueFactor ?? 1) - 0.6) / 1.2 * 35)), 0, 100)
}

function gradeFor(score: number): DraftSummaryGrade {
  if (score >= 92) return { grade: 'S', score, label: 'Elenco elite', description: 'Seu time tem nivel de favorito absoluto para partidas grandes.' }
  if (score >= 86) return { grade: 'A', score, label: 'Muito forte', description: 'Seu time e muito forte, com base pronta para competir contra qualquer rival.' }
  if (score >= 80) return { grade: 'B', score, label: 'Forte', description: 'Seu time tem qualidade alta e boas alternativas no banco.' }
  if (score >= 72) return { grade: 'C', score, label: 'Competitivo', description: 'Seu time e competitivo, mas pode sofrer contra adversarios mais fortes.' }
  if (score >= 65) return { grade: 'D', score, label: 'Irregular', description: 'Seu time tem bons nomes, mas depende de encaixe e gestao fisica.' }
  if (score >= 58) return { grade: 'E', score, label: 'Fraco', description: 'Seu time precisa compensar limitacoes com estrategia e cuidado nas substituicoes.' }
  return { grade: 'F', score, label: 'Muito fraco', description: 'Seu time tera uma campanha dificil se nao encontrar vantagens taticas.' }
}

export function calculateDraftTeamGrade(params: {
  players: GamePlayer[]
  coach: GameCoach
  formationKey: Formation
}): DraftSummaryGrade {
  const athletes = athletesFrom(params.players)
  const playersAverageOverall = average(athletes.map((player) => player.overall))
  const coachOverall = params.coach.overall
  const formationFitScore = calculateFormationFitScore(params.players, params.formationKey)
  const staminaProfileScore = calculateStaminaProfileScore(params.players)
  const score = clamp(
    playersAverageOverall * 0.7 +
      coachOverall * 0.15 +
      formationFitScore * 0.1 +
      staminaProfileScore * 0.05,
    0,
    100,
  )
  return gradeFor(Math.round(score))
}

export function getDraftSummaryInsights(params: {
  players: GamePlayer[]
  coach: GameCoach
  formationKey: Formation
}): string[] {
  const athletes = athletesFrom(params.players)
  const required = getRequiredSquadByFormation(params.formationKey)
  const insights: string[] = []
  const sortedPositions = ATHLETE_POSITIONS
    .filter((position) => required[position] > 0)
    .map((position) => ({ position, average: positionAverage(athletes, position) }))
    .sort((left, right) => right.average - left.average)
  const best = sortedPositions[0]
  const weakest = sortedPositions.at(-1)
  const benchDepth = athletes.filter((player) => player.overall >= 78).length
  const staminaAverage = calculateStaminaProfileScore(params.players)

  if (best && best.average >= 82) insights.push(`Seu time tem ${best.position.toLowerCase()}s muito fortes para sustentar o plano de jogo.`)
  if (benchDepth >= 6) insights.push('O elenco tem boa profundidade no banco.')
  if (positionAverage(athletes, 'GOLEIRO') >= 82) insights.push('Seu goleiro esta acima da media.')
  if (staminaAverage < 78) insights.push('O time pode sofrer fisicamente no segundo tempo.')
  if (params.coach.overall >= 84) insights.push('O tecnico eleva o teto competitivo do elenco.')
  if (weakest && weakest.average > 0 && weakest.average < 74) insights.push(`A posicao de ${weakest.position.toLowerCase()} e o ponto mais sensivel do elenco.`)

  return insights.slice(0, 5)
}
