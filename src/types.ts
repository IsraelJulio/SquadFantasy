export type Position = 'Goleiro' | 'Zagueiro' | 'Lateral' | 'Meio-campo' | 'Atacante'
export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1'
export type Strategy = 'Ofensivo' | 'Equilibrado' | 'Defensivo' | 'Contra-ataque' | 'Posse de bola'
export type Stage = 'Fase de grupos' | 'Oitavas' | 'Quartas' | 'Semifinal' | 'Final'
export type CampaignStatus = 'draft' | 'tactics' | 'active' | 'champion' | 'eliminated'
export type MatchResult = 'victory' | 'draw' | 'defeat'

export interface GamePlayer {
  id: string
  name: string
  country: string
  position: Position
  referenceYear: number
  attack: number
  defense: number
  technique: number
  speed: number
  physical: number
  mentality: number
  overall: number
}

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

export interface GameCampaign {
  id: string
  status: CampaignStatus
  currentStage: Stage
  selectedFormation: Formation | null
  selectedStrategy: Strategy | null
  playerIds: string[]
  matches: GameMatch[]
  groupPoints: number
  createdAt: string
  updatedAt: string
}
