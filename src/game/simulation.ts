import type { AthletePosition, Formation, GameAthlete, GameMatch, GamePlayer, MatchSimulationPlan, MatchTimelineEvent, Opponent, Stage, Strategy } from '../types'
import { hashSeed, seededRandom } from './random'
import { athletesFrom, calculateActiveLineupStrength, coachFrom } from './squad'

export interface LiveMatchState {
  plan: MatchSimulationPlan
  activeIds: string[]
  benchIds: string[]
  minute: number
  userScore: number
  opponentScore: number
  events: MatchTimelineEvent[]
  opponentSubstitutions: number
}

export interface Substitution {
  playerOutId: string
  playerInId: string
}

const opponentPlayers: Record<AthletePosition, string[]> = {
  GOLEIRO: ['Ortiz', 'Guitta', 'Higuita'],
  FIXO: ['Marcenio', 'Rodrigo', 'Borruto', 'Ciço'],
  ALA: ['Ricardinho', 'Dyego', 'Leozinho', 'Pito', 'Merlim'],
  PIVO: ['Ferrão', 'Lenísio', 'Simi'],
}

function event(state: LiveMatchState, values: Omit<MatchTimelineEvent, 'id' | 'minute' | 'period' | 'userScore' | 'opponentScore'> & { userScore?: number; opponentScore?: number }): MatchTimelineEvent {
  return {
    id: crypto.randomUUID(),
    minute: state.minute,
    period: state.minute <= 20 ? 1 : 2,
    userScore: values.userScore ?? state.userScore,
    opponentScore: values.opponentScore ?? state.opponentScore,
    ...values,
  }
}

export function createMatchSimulation(
  campaignId: string,
  matchNumber: number,
  squad: GamePlayer[],
  starterIds: string[],
  formation: Formation,
  strategy: Strategy,
  stage: Stage,
): MatchSimulationPlan {
  return { id: crypto.randomUUID(), campaignId, matchNumber, squad, starterIds, formation, strategy, stage, events: [] }
}

export function createInitialMatchState(plan: MatchSimulationPlan): LiveMatchState {
  const athleteIds = athletesFrom(plan.squad).map((player) => player.id)
  return { plan, activeIds: [...plan.starterIds], benchIds: athleteIds.filter((id) => !plan.starterIds.includes(id)), minute: 0, userScore: 0, opponentScore: 0, events: [], opponentSubstitutions: 0 }
}

function activeAthletes(state: LiveMatchState): GameAthlete[] {
  return state.activeIds.map((id) => state.plan.squad.find((player) => player.id === id)).filter((player): player is GameAthlete => player?.kind === 'athlete')
}

function userScorer(players: GameAthlete[], random: () => number) {
  const weighted = [...players].sort((a, b) => (b.finishing + b.dribbling) - (a.finishing + a.dribbling))
  return weighted[Math.floor(random() * Math.max(1, Math.min(weighted.length, 4)))]?.name ?? 'Seu ala'
}

export function generateOpponentSubstitution(state: LiveMatchState, random: () => number): MatchTimelineEvent | null {
  if (state.minute < 5 || state.minute === 20 || random() > 0.075) return null
  const positions: AthletePosition[] = ['FIXO', 'ALA', 'PIVO', 'GOLEIRO']
  const position = positions[Math.floor(random() * positions.length)]
  const names = opponentPlayers[position]
  const offset = state.opponentSubstitutions % names.length
  const playerOut = names[offset]
  const playerIn = names[(offset + 1) % names.length]
  return event(state, {
    type: 'substitution', team: 'opponent', playerOut, playerIn, position,
    description: `Substituição do adversário: saiu ${playerOut}, entrou ${playerIn}.`,
  })
}

export function simulateNextMinute(state: LiveMatchState, opponent: Opponent): LiveMatchState {
  const minute = state.minute + 1
  const next = { ...state, minute }
  const signature = [...state.activeIds].sort().join('-')
  const random = seededRandom(hashSeed(`${state.plan.campaignId}-${state.plan.matchNumber}-${minute}-${signature}-${state.userScore}-${state.opponentScore}`))
  const active = activeAthletes(next)
  const coach = coachFrom(state.plan.squad)
  const strength = calculateActiveLineupStrength(active, state.plan.formation, state.plan.strategy, coach)
  const controlEdge = strength.control - opponent.midfield
  const userGoalChance = Math.max(0.018, Math.min(0.16, 0.07 + (strength.attack - opponent.defense) / 650 + controlEdge / 1100))
  const opponentGoalChance = Math.max(0.018, Math.min(0.16, 0.065 + (opponent.attack - strength.defense) / 650 - controlEdge / 1200))
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
    const scorers = opponentPlayers.ALA
    const playerName = scorers[Math.floor(random() * scorers.length)]
    events.push(event({ ...next, userScore, opponentScore }, { type: 'goal', team: 'opponent', playerName, description: `Gol do adversário. ${playerName} conclui a troca de passes.`, userScore, opponentScore }))
  } else if (roll < userGoalChance + opponentGoalChance + 0.12) {
    const team = random() > 0.48 ? 'user' : 'opponent'
    const type = random() > 0.55 ? 'chance' : random() > 0.4 ? 'save' : 'foul'
    const descriptions = {
      chance: team === 'user' ? 'Seu time acelera e cria uma chance perigosa.' : `${opponent.name} chega com perigo pela ala.`,
      save: team === 'user' ? 'Seu goleiro fecha o ângulo e faz grande defesa.' : `O goleiro do ${opponent.name} evita o gol.`,
      foul: team === 'user' ? 'Falta sofrida pelo seu time perto da área.' : 'Falta perigosa para o adversário.',
    }
    events.push(event(next, { type, team, description: descriptions[type] }))
  }

  const stateAfterPlay = { ...next, userScore, opponentScore, events }
  const opponentSubstitution = generateOpponentSubstitution(stateAfterPlay, random)
  if (opponentSubstitution) events.push(opponentSubstitution)
  return { ...stateAfterPlay, events, opponentSubstitutions: state.opponentSubstitutions + (opponentSubstitution ? 1 : 0) }
}

export function createSubstitutionTimelineEvent(state: LiveMatchState, outgoing: GameAthlete, incoming: GameAthlete): MatchTimelineEvent {
  return event(state, {
    type: 'substitution', team: 'user', playerOut: outgoing.name, playerIn: incoming.name, position: outgoing.position,
    description: `Substituição no seu time: saiu ${outgoing.name}, entrou ${incoming.name}.`,
  })
}

export function applySubstitution(state: LiveMatchState, substitution: Substitution): LiveMatchState {
  const outgoing = state.plan.squad.find((player): player is GameAthlete => player.id === substitution.playerOutId && player.kind === 'athlete')
  const incoming = state.plan.squad.find((player): player is GameAthlete => player.id === substitution.playerInId && player.kind === 'athlete')
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

export function finalizeMatch(state: LiveMatchState, opponent: Opponent): MatchSimulationPlan {
  const random = seededRandom(hashSeed(`${state.plan.campaignId}-${state.plan.matchNumber}-final`))
  const tiedKnockout = state.plan.stage !== 'Fase de grupos' && state.userScore === state.opponentScore
  const result = tiedKnockout ? (random() >= 0.5 ? 'victory' : 'defeat') : state.userScore > state.opponentScore ? 'victory' : state.userScore < state.opponentScore ? 'defeat' : 'draw'
  const active = activeAthletes(state)
  const best = [...active].sort((a, b) => b.overall - a.overall)[0]?.name ?? 'Destaque do futsal'
  const match: GameMatch = {
    id: state.plan.id,
    stage: state.plan.stage,
    opponentName: `${opponent.name} ${opponent.year}`,
    userScore: state.userScore,
    opponentScore: state.opponentScore,
    result,
    summary: tiedKnockout ? `Após o empate, a vaga foi decidida nos pênaltis: ${result === 'victory' ? 'classificação do seu time' : `classificação do ${opponent.name}`}.` : result === 'victory' ? 'Seu quinteto controlou os momentos decisivos e confirmou a vitória.' : result === 'defeat' ? `${opponent.name} aproveitou melhor os espaços.` : 'Um duelo equilibrado até o apito final.',
    manOfTheMatch: result === 'defeat' ? `Camisa 10 do ${opponent.name}` : best,
    decidedOnPenalties: tiedKnockout,
    createdAt: new Date().toISOString(),
  }
  return { ...state.plan, starterIds: state.activeIds, events: state.events, match }
}

export function simulateMatch(campaignId: string, matchNumber: number, squad: GamePlayer[], starterIds: string[], formation: Formation, strategy: Strategy, opponent: Opponent, stage: Stage): GameMatch {
  let state = createInitialMatchState(createMatchSimulation(campaignId, matchNumber, squad, starterIds, formation, strategy, stage))
  for (let minute = 0; minute < 40; minute += 1) state = simulateNextMinute(state, opponent)
  return finalizeMatch(state, opponent).match!
}
