import type { AthletePosition, Difficulty, Formation, GameAthlete, GameCoach, GameMatch, GamePlayer, MatchSimulationPlan, MatchTimelineEvent, Opponent, PenaltyShootoutState, Stage, Strategy } from '../types'
import { calculateDifficultyBoost, calculateTacticalMatchup } from './balance'
import { hashSeed, seededRandom } from './random'
import { createPenaltyShootout, startPenaltyShootout, takeNextPenalty } from './penalties'
import { athletesFrom, calculateActiveLineupStrength, calculateComebackBoost, coachFrom, updateTeamStamina, type SquadStrength } from './squad'

export interface LiveMatchState {
  plan: MatchSimulationPlan
  userPlayers: GameAthlete[]
  activeIds: string[]
  benchIds: string[]
  opponentPlayers: GameAthlete[]
  opponentCoach: GameCoach
  opponentActiveIds: string[]
  opponentBenchIds: string[]
  minute: number
  userScore: number
  opponentScore: number
  events: MatchTimelineEvent[]
}

export interface Substitution {
  playerOutId: string
  playerInId: string
}

const opponentNames: Record<AthletePosition, string[]> = {
  GOLEIRO: ['Ortiz', 'Guitta'],
  FIXO: ['Marcenio', 'Rodrigo'],
  ALA: ['Ricardinho', 'Dyego', 'Leozinho', 'Pito'],
  PIVO: ['Ferrão', 'Lenísio'],
}

function event(state: LiveMatchState, values: Omit<MatchTimelineEvent, 'id' | 'minute' | 'period' | 'userScore' | 'opponentScore'> & { userScore?: number; opponentScore?: number }): MatchTimelineEvent {
  return { id: crypto.randomUUID(), minute: state.minute, period: state.minute <= 20 ? 1 : 2, userScore: values.userScore ?? state.userScore, opponentScore: values.opponentScore ?? state.opponentScore, ...values }
}

function createOpponentPlayer(name: string, position: AthletePosition, index: number, level: number): GameAthlete {
  const overallOriginal = Math.max(65, Math.min(92, level + ((index * 5) % 7) - 3))
  return { id: `opponent-${position}-${index}`, name, position, overallOriginal, overall: overallOriginal, stamina: 100 }
}

function createOpponentCoach(opponent: Opponent): GameCoach {
  const overallOriginal = Math.max(65, Math.min(92, opponent.level))
  return {
    id: `opponent-coach-${opponent.id}`,
    name: `Técnico do ${opponent.name}`,
    position: 'TECNICO',
    overallOriginal,
    overall: overallOriginal,
  }
}

function createOpponentTeam(opponent: Opponent) {
  const players = (Object.entries(opponentNames) as [AthletePosition, string[]][]).flatMap(([position, names]) => names.map((name, index) => createOpponentPlayer(name, position, index, opponent.level)))
  const activeIds = (['GOLEIRO', 'FIXO', 'ALA', 'PIVO'] as AthletePosition[]).flatMap((position) => players.filter((player) => player.position === position).slice(0, position === 'ALA' ? 2 : 1).map((player) => player.id))
  return { players, coach: createOpponentCoach(opponent), activeIds, benchIds: players.filter((player) => !activeIds.includes(player.id)).map((player) => player.id) }
}

export function createMatchSimulation(campaignId: string, matchNumber: number, squad: GamePlayer[], starterIds: string[], formation: Formation, strategy: Strategy, stage: Stage, losingStreak = 0, difficulty: Difficulty = 'NORMAL'): MatchSimulationPlan {
  return { id: crypto.randomUUID(), campaignId, matchNumber, squad, starterIds, formation, strategy, difficulty, stage, losingStreak, events: [] }
}

export function createInitialMatchState(plan: MatchSimulationPlan, opponent: Opponent): LiveMatchState {
  const userPlayers = athletesFrom(plan.squad).map((player) => ({ ...player, stamina: 100, overall: player.overallOriginal }))
  const athleteIds = userPlayers.map((player) => player.id)
  const opponentTeam = createOpponentTeam(opponent)
  return {
    plan,
    userPlayers,
    activeIds: [...plan.starterIds],
    benchIds: athleteIds.filter((id) => !plan.starterIds.includes(id)),
    opponentPlayers: opponentTeam.players,
    opponentCoach: opponentTeam.coach,
    opponentActiveIds: opponentTeam.activeIds,
    opponentBenchIds: opponentTeam.benchIds,
    minute: 0,
    userScore: 0,
    opponentScore: 0,
    events: [],
  }
}

const playersByIds = (players: GameAthlete[], ids: string[]) => ids.map((id) => players.find((player) => player.id === id)).filter((player): player is GameAthlete => Boolean(player))

export interface LiveMatchStrengths {
  user: SquadStrength
  opponent: SquadStrength
}

export function calculateLiveMatchStrengths(state: LiveMatchState, opponent: Opponent): LiveMatchStrengths {
  const active = playersByIds(state.userPlayers, state.activeIds)
  const opponentActive = playersByIds(state.opponentPlayers, state.opponentActiveIds)
  const tacticalMatchup = calculateTacticalMatchup(state.plan.strategy, opponent.strategy)
  const comebackBoost = calculateComebackBoost(state.plan.losingStreak)
  const user = calculateActiveLineupStrength(active, coachFrom(state.plan.squad), state.plan.formation, state.plan.strategy, comebackBoost, tacticalMatchup.userBoost, 1)
  const opponentStrength = calculateActiveLineupStrength(opponentActive, state.opponentCoach, 'DIAMOND_3_1', opponent.strategy, 1, tacticalMatchup.opponentBoost, 1)
  const experienceBoost = calculateDifficultyBoost(state.plan.difficulty, user.finalStrength / comebackBoost, opponentStrength.finalStrength)
  return {
    user: { ...user, finalStrength: user.finalStrength * experienceBoost, experienceBoost },
    opponent: opponentStrength,
  }
}

function userScorer(players: GameAthlete[], random: () => number) {
  const candidates = [...players].sort((a, b) => b.overall - a.overall).slice(0, 4)
  return candidates[Math.floor(random() * Math.max(1, candidates.length))]?.name ?? 'Seu ala'
}

function applyOpponentSubstitution(state: LiveMatchState, random: () => number): LiveMatchState {
  if (state.minute < 5 || state.minute === 20) return state
  const active = playersByIds(state.opponentPlayers, state.opponentActiveIds)
  const bench = playersByIds(state.opponentPlayers, state.opponentBenchIds)
  const outgoing = [...active].sort((a, b) => a.stamina - b.stamina)[0]
  if (!outgoing || (outgoing.stamina >= 40 && random() > 0.075)) return state
  const compatible = bench.filter((player) => player.position === outgoing.position).sort((a, b) => b.overall - a.overall)
  const incoming = compatible[0]
  if (!incoming) return state
  const substitutionEvent = event(state, {
    type: 'substitution', team: 'opponent', playerOut: outgoing.name, playerIn: incoming.name, position: outgoing.position,
    description: `Substituição do adversário: saiu ${outgoing.name}, entrou ${incoming.name}.`,
  })
  return {
    ...state,
    opponentActiveIds: state.opponentActiveIds.map((id) => id === outgoing.id ? incoming.id : id),
    opponentBenchIds: state.opponentBenchIds.map((id) => id === incoming.id ? outgoing.id : id),
    events: [...state.events, substitutionEvent],
  }
}

export function simulateNextMinute(state: LiveMatchState, opponent: Opponent): LiveMatchState {
  const minute = state.minute + 1
  const userPlayers = updateTeamStamina(state.userPlayers, state.activeIds)
  const opponentPlayers = updateTeamStamina(state.opponentPlayers, state.opponentActiveIds)
  const next = { ...state, minute, userPlayers, opponentPlayers }
  const lineupSignature = `user:${[...state.activeIds].sort().join('-')}|opponent:${[...state.opponentActiveIds].sort().join('-')}`
  const random = seededRandom(hashSeed(`${state.plan.campaignId}-${state.plan.matchNumber}-${minute}-${lineupSignature}-${state.userScore}-${state.opponentScore}`))
  const active = playersByIds(userPlayers, state.activeIds)
  const opponentActive = playersByIds(opponentPlayers, state.opponentActiveIds)
  const strengths = calculateLiveMatchStrengths(next, opponent)
  const userStrength = strengths.user.finalStrength
  const opponentStrength = strengths.opponent.finalStrength
  const strengthEdge = userStrength - opponentStrength
  const userGoalChance = Math.max(0.02, Math.min(0.14, 0.065 + strengthEdge / 650))
  const opponentGoalChance = Math.max(0.02, Math.min(0.14, 0.065 - strengthEdge / 650))
  const userEventShare = Math.max(0.35, Math.min(0.65, userStrength / Math.max(1, userStrength + opponentStrength)))
  const roll = random()
  const events = [...state.events]
  let userScore = state.userScore
  let opponentScore = state.opponentScore

  if (roll < userGoalChance) {
    userScore += 1
    const playerName = userScorer(active, random)
    events.push(event({ ...next, userScore, opponentScore }, { type: 'goal', team: 'user', playerName, description: `GOL! ${playerName} gira rápido e finaliza no canto.`, userScore, opponentScore }))
  } else if (roll < userGoalChance + opponentGoalChance) {
    opponentScore += 1
    const playerName = userScorer(opponentActive, random)
    events.push(event({ ...next, userScore, opponentScore }, { type: 'goal', team: 'opponent', playerName, description: `Gol do adversário. ${playerName} conclui a troca de passes.`, userScore, opponentScore }))
  } else if (roll < userGoalChance + opponentGoalChance + 0.12) {
    const team = random() < userEventShare ? 'user' : 'opponent'
    const type = random() > 0.55 ? 'chance' : random() > 0.4 ? 'save' : 'foul'
    const descriptions = {
      chance: team === 'user' ? 'Seu time acelera e cria uma chance perigosa.' : `${opponent.name} chega com perigo pela ala.`,
      save: team === 'user' ? 'Seu goleiro fecha o ângulo e faz grande defesa.' : `O goleiro do ${opponent.name} evita o gol.`,
      foul: team === 'user' ? 'Falta sofrida pelo seu time perto da área.' : 'Falta perigosa para o adversário.',
    }
    events.push(event(next, { type, team, description: descriptions[type] }))
  }

  return applyOpponentSubstitution({ ...next, userScore, opponentScore, events }, random)
}

export function createSubstitutionTimelineEvent(state: LiveMatchState, outgoing: GameAthlete, incoming: GameAthlete): MatchTimelineEvent {
  return event(state, { type: 'substitution', team: 'user', playerOut: outgoing.name, playerIn: incoming.name, position: outgoing.position, description: `Substituição no seu time: saiu ${outgoing.name}, entrou ${incoming.name}.` })
}

export function applySubstitution(state: LiveMatchState, substitution: Substitution): LiveMatchState {
  const outgoing = state.userPlayers.find((player) => player.id === substitution.playerOutId)
  const incoming = state.userPlayers.find((player) => player.id === substitution.playerInId)
  if (!outgoing || !incoming || outgoing.position !== incoming.position) return state
  if (!state.activeIds.includes(outgoing.id) || !state.benchIds.includes(incoming.id)) return state
  return {
    ...state,
    activeIds: state.activeIds.map((id) => id === outgoing.id ? incoming.id : id),
    benchIds: state.benchIds.map((id) => id === incoming.id ? outgoing.id : id),
    events: [...state.events, createSubstitutionTimelineEvent(state, outgoing, incoming)],
  }
}

export function addSystemEvent(state: LiveMatchState, type: 'kick-off' | 'half-time' | 'second-half' | 'full-time', description: string): LiveMatchState {
  return { ...state, events: [...state.events, event(state, { type, team: 'neutral', description })] }
}

export function finalizeMatch(state: LiveMatchState, opponent: Opponent, shootout?: PenaltyShootoutState): MatchSimulationPlan {
  const tiedKnockout = state.plan.stage !== 'Fase de grupos' && state.userScore === state.opponentScore
  if (tiedKnockout && shootout?.status !== 'finished') throw new Error('Uma partida eliminatória empatada só pode terminar após os pênaltis.')
  const active = playersByIds(state.userPlayers, state.activeIds)
  const result = tiedKnockout ? (shootout!.winner === 'user' ? 'victory' : 'defeat') : state.userScore > state.opponentScore ? 'victory' : state.userScore < state.opponentScore ? 'defeat' : 'draw'
  const best = [...active].sort((a, b) => b.overall - a.overall)[0]?.name ?? 'Destaque do futsal'
  const match: GameMatch = {
    id: state.plan.id, stage: state.plan.stage, opponentName: `${opponent.name} ${opponent.year}`, userScore: state.userScore, opponentScore: state.opponentScore, result,
    summary: tiedKnockout ? `Após o empate, a vaga foi decidida nos pênaltis: ${result === 'victory' ? 'classificação do seu time' : `classificação do ${opponent.name}`}.` : result === 'victory' ? 'Seu quinteto controlou os momentos decisivos e confirmou a vitória.' : result === 'defeat' ? `${opponent.name} aproveitou melhor os espaços.` : 'Um duelo equilibrado até o apito final.',
    manOfTheMatch: result === 'defeat' ? `Camisa 10 do ${opponent.name}` : best,
    decidedOnPenalties: tiedKnockout,
    wentToPenalties: tiedKnockout,
    userPenaltyScore: shootout?.userPenaltyScore ?? null,
    opponentPenaltyScore: shootout?.opponentPenaltyScore ?? null,
    penaltyWinner: shootout?.winner ?? null,
    penaltyShots: shootout?.shots ?? [],
    createdAt: new Date().toISOString(),
  }
  return { ...state.plan, starterIds: state.activeIds, events: state.events, match }
}

export function simulateMatch(campaignId: string, matchNumber: number, squad: GamePlayer[], starterIds: string[], formation: Formation, strategy: Strategy, opponent: Opponent, stage: Stage, losingStreak = 0, difficulty: Difficulty = 'NORMAL'): GameMatch {
  let state = createInitialMatchState(createMatchSimulation(campaignId, matchNumber, squad, starterIds, formation, strategy, stage, losingStreak, difficulty), opponent)
  for (let minute = 0; minute < 40; minute += 1) state = simulateNextMinute(state, opponent)
  if (stage !== 'Fase de grupos' && state.userScore === state.opponentScore) {
    let shootout = startPenaltyShootout(createPenaltyShootout())
    const random = seededRandom(hashSeed(`${campaignId}-${matchNumber}-penalties`))
    while (shootout.status !== 'finished') shootout = takeNextPenalty(state, shootout, random)
    return finalizeMatch(state, opponent, shootout).match!
  }
  return finalizeMatch(state, opponent).match!
}
