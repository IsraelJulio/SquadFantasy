import type { GameAthlete, PenaltyShootoutState, PenaltyShot, PenaltyShotResult, PenaltyTeam } from '../types'
import type { LiveMatchState } from './simulation'
import { calculateCoachBoost, calculateComebackBoost, coachFrom } from './squad'

export interface PenaltyParticipants {
  taker: GameAthlete
  goalkeeper: GameAthlete
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))
const byOverall = (left: GameAthlete, right: GameAthlete) => right.overall - left.overall
const playersByIds = (players: GameAthlete[], ids: string[]) => ids.map((id) => players.find((player) => player.id === id)).filter((player): player is GameAthlete => Boolean(player))

function orderedTakers(players: GameAthlete[], activeIds: string[], benchIds: string[]) {
  return [...playersByIds(players, activeIds).sort(byOverall), ...playersByIds(players, benchIds).sort(byOverall)]
}

function goalkeeperFor(players: GameAthlete[], activeIds: string[]) {
  return playersByIds(players, activeIds).find((player) => player.position === 'GOLEIRO')
    ?? players.filter((player) => player.position === 'GOLEIRO').sort(byOverall)[0]
}

export function createPenaltyShootout(): PenaltyShootoutState {
  return { status: 'not_started', currentRound: 1, currentTeam: 'user', userPenaltyScore: 0, opponentPenaltyScore: 0, shots: [] }
}

export function startPenaltyShootout(state: PenaltyShootoutState): PenaltyShootoutState {
  return state.status === 'not_started' ? { ...state, status: 'in_progress' } : state
}

export function getPenaltyParticipants(match: LiveMatchState, shootout: PenaltyShootoutState, team = shootout.currentTeam): PenaltyParticipants {
  const user = team === 'user'
  const takers = orderedTakers(
    user ? match.userPlayers : match.opponentPlayers,
    user ? match.activeIds : match.opponentActiveIds,
    user ? match.benchIds : match.opponentBenchIds,
  )
  const previousShots = shootout.shots.filter((shot) => shot.team === team).length
  const taker = takers[previousShots % takers.length]
  const goalkeeper = goalkeeperFor(
    user ? match.opponentPlayers : match.userPlayers,
    user ? match.opponentActiveIds : match.activeIds,
  )
  if (!taker || !goalkeeper) throw new Error('A disputa precisa de um cobrador e um goleiro para cada time.')
  return { taker, goalkeeper }
}

export function calculatePenaltyChance(taker: GameAthlete, goalkeeper: GameAthlete, coachBoost = 1, comebackBoost = 1) {
  const takerAdvantage = (taker.overall - goalkeeper.overall) / 300
  const staminaAdjustment = (taker.stamina - goalkeeper.stamina) / 1000
  return clamp((0.72 + takerAdvantage + staminaAdjustment) * coachBoost * comebackBoost, 0.55, 0.9)
}

export function simulatePenaltyShot(taker: GameAthlete, goalkeeper: GameAthlete, coachBoost = 1, comebackBoost = 1, random: () => number = Math.random): PenaltyShotResult {
  if (random() <= calculatePenaltyChance(taker, goalkeeper, coachBoost, comebackBoost)) return 'goal'
  const failureRoll = random()
  if (failureRoll < 0.6) return 'saved'
  if (failureRoll < 0.85) return 'miss'
  return 'post'
}

function descriptionFor(team: PenaltyTeam, taker: string, goalkeeper: string, result: PenaltyShotResult) {
  if (result === 'goal') return team === 'user' ? `${taker} desloca o goleiro e marca!` : `${taker} bate firme e converte.`
  if (result === 'saved') return team === 'user' ? `${goalkeeper} lê a cobrança de ${taker} e defende.` : `Seu goleiro ${goalkeeper} cresce na cobrança e defende!`
  if (result === 'post') return `${taker} acerta a trave!`
  return team === 'user' ? `${taker} bate para fora!` : `${taker} exagera na força e manda para fora.`
}

function winnerAfterShot(shots: PenaltyShot[], userScore: number, opponentScore: number): PenaltyTeam | undefined {
  const userShots = shots.filter((shot) => shot.team === 'user').length
  const opponentShots = shots.length - userShots
  if (userShots <= 5 && opponentShots <= 5) {
    if (userScore > opponentScore + Math.max(0, 5 - opponentShots)) return 'user'
    if (opponentScore > userScore + Math.max(0, 5 - userShots)) return 'opponent'
  }
  if (userShots >= 5 && opponentShots >= 5 && userShots === opponentShots && userScore !== opponentScore) return userScore > opponentScore ? 'user' : 'opponent'
  return undefined
}

export function takeNextPenalty(match: LiveMatchState, shootout: PenaltyShootoutState, random: () => number = Math.random): PenaltyShootoutState {
  if (shootout.status !== 'in_progress') return shootout
  const team = shootout.currentTeam
  const { taker, goalkeeper } = getPenaltyParticipants(match, shootout, team)
  const coachBoost = team === 'user' ? calculateCoachBoost(coachFrom(match.plan.squad)) : 1
  const comebackBoost = team === 'user' ? calculateComebackBoost(match.plan.losingStreak) : 1
  const result = simulatePenaltyShot(taker, goalkeeper, coachBoost, comebackBoost, random)
  const userPenaltyScore = shootout.userPenaltyScore + (team === 'user' && result === 'goal' ? 1 : 0)
  const opponentPenaltyScore = shootout.opponentPenaltyScore + (team === 'opponent' && result === 'goal' ? 1 : 0)
  const shot: PenaltyShot = {
    id: crypto.randomUUID(), round: shootout.currentRound, team, takerId: taker.id, takerName: taker.name,
    goalkeeperName: goalkeeper.name, result, userPenaltyScore, opponentPenaltyScore,
    description: descriptionFor(team, taker.name, goalkeeper.name, result),
  }
  const shots = [...shootout.shots, shot]
  const winner = winnerAfterShot(shots, userPenaltyScore, opponentPenaltyScore)
  return {
    status: winner ? 'finished' : 'in_progress',
    currentRound: team === 'opponent' ? shootout.currentRound + 1 : shootout.currentRound,
    currentTeam: team === 'user' ? 'opponent' : 'user',
    userPenaltyScore, opponentPenaltyScore, shots, winner,
  }
}
