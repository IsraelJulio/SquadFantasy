export type AthletePosition = 'GOLEIRO' | 'FIXO' | 'ALA' | 'PIVO'
export type FutsalPosition = AthletePosition | 'TECNICO'
export type Formation = 'DIAMOND_3_1' | 'SQUARE_2_2' | 'FOUR_ZERO' | 'THREE_TWO'
export type Strategy = 'Ofensivo' | 'Equilibrado' | 'Defensivo' | 'Contra-ataque' | 'Posse de bola'
export type Stage = 'Fase de grupos' | 'Oitavas' | 'Quartas' | 'Semifinal' | 'Final'
export type CampaignStatus = 'tactics' | 'draft' | 'active' | 'champion' | 'eliminated'
export type MatchResult = 'victory' | 'draw' | 'defeat'
export type MatchSimulationStatus = 'not_started' | 'first_half' | 'half_time' | 'second_half' | 'paused' | 'finished'
export type MatchEventType = 'kick-off' | 'goal' | 'chance' | 'save' | 'foul' | 'substitution' | 'half-time' | 'second-half' | 'full-time'
export type MatchEventTeam = 'user' | 'opponent' | 'neutral'

export interface MatchTimelineEvent {
  id: string
  minute: number
  period: 1 | 2
  type: MatchEventType
  team: MatchEventTeam
  playerName?: string
  playerOut?: string
  playerIn?: string
  position?: FutsalPosition
  description: string
  userScore: number
  opponentScore: number
}

interface PersonBase {
  id: string
  name: string
  country: string
  referenceYear: number
  overall: number
}

export interface GameAthlete extends PersonBase {
  kind: 'athlete'
  position: AthletePosition
  finishing: number
  passing: number
  marking: number
  speed: number
  dribbling: number
  physical: number
  mentality: number
}

export interface GameCoach extends PersonBase {
  kind: 'coach'
  position: 'TECNICO'
  motivation: number
  tactics: number
  defense: number
  attack: number
  squadManagement: number
}

export type GamePlayer = GameAthlete | GameCoach

export interface Opponent {
  id: string
  name: string
  year: number
  level: number
  strategy: Strategy
  attack: number
  defense: number
  midfield: number
}

export interface GameMatch {
  id: string
  stage: Stage
  opponentName: string
  userScore: number
  opponentScore: number
  result: MatchResult
  summary: string
  manOfTheMatch: string
  decidedOnPenalties?: boolean
  createdAt: string
}

export interface MatchSimulationPlan {
  id: string
  campaignId: string
  matchNumber: number
  stage: Stage
  formation: Formation
  strategy: Strategy
  squad: GamePlayer[]
  starterIds: string[]
  events: MatchTimelineEvent[]
  match?: GameMatch
}

export interface GameCampaign {
  id: string
  status: CampaignStatus
  currentStage: Stage
  selectedFormation: Formation | null
  selectedStrategy: Strategy | null
  playerIds: string[]
  starterIds: string[]
  matches: GameMatch[]
  groupPoints: number
  createdAt: string
  updatedAt: string
}
