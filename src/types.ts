export type AthletePosition = 'GOLEIRO' | 'FIXO' | 'ALA' | 'PIVO'
export type FutsalPosition = AthletePosition | 'TECNICO'
export type Formation = 'DIAMOND_3_1' | 'SQUARE_2_2' | 'FOUR_ZERO' | 'THREE_TWO'
export type Strategy = 'Ofensivo' | 'Equilibrado' | 'Defensivo' | 'Contra-ataque' | 'Posse de bola'
export type Difficulty = 'CASUAL' | 'NORMAL' | 'CHALLENGE'
export type Stage = 'Fase de grupos' | 'Oitavas' | 'Quartas' | 'Semifinal' | 'Final'
export type CampaignStatus = 'tactics' | 'draft' | 'draft_summary' | 'active' | 'champion' | 'eliminated'
export type MatchResult = 'victory' | 'draw' | 'defeat'
export type MatchSimulationStatus = 'not_started' | 'first_half' | 'half_time' | 'second_half' | 'paused' | 'awaiting_penalties' | 'penalties' | 'finished'
export type MatchEventType = 'kick-off' | 'goal' | 'chance' | 'save' | 'foul' | 'substitution' | 'fatigue' | 'half-time' | 'second-half' | 'full-time'
export type MatchEventTeam = 'user' | 'opponent' | 'neutral'
export type PenaltyTeam = 'user' | 'opponent'
export type PenaltyShotResult = 'goal' | 'miss' | 'saved' | 'post'
export type PenaltyShootoutStatus = 'not_started' | 'in_progress' | 'finished'

export interface PenaltyShot {
  id: string
  round: number
  team: PenaltyTeam
  takerId: string
  takerName: string
  goalkeeperName: string
  result: PenaltyShotResult
  userPenaltyScore: number
  opponentPenaltyScore: number
  description: string
}

export interface PenaltyShootoutState {
  status: PenaltyShootoutStatus
  currentRound: number
  currentTeam: PenaltyTeam
  userPenaltyScore: number
  opponentPenaltyScore: number
  shots: PenaltyShot[]
  winner?: PenaltyTeam
}

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
  position: FutsalPosition
  overallOriginal: number
  overall: number
  carta: string
  perfil: string
  campeao: boolean
  teamId?: string
  teamName?: string
  role?: 'PLAYER' | 'COACH'
}

export interface GameAthlete extends PersonBase {
  position: AthletePosition
  stamina: number
  fatigueFactor?: number
}

export interface GameCoach extends PersonBase {
  position: 'TECNICO'
}

export type GamePlayer = GameAthlete | GameCoach

export interface MatchPlayerState {
  playerId: string
  baseOverall: number
  currentOverall: number
  stamina: number
  fatigueFactor: number
  isOnCourt: boolean
}

export interface DraftTeam {
  id: string
  name: string
  country: string
  referenceYear?: number
  flagUrl?: string
  players: GamePlayer[]
  rosterNotes?: string[]
}

export interface DraftOption {
  player: GamePlayer
  teamId: string
  teamName: string
}

export interface DraftPickHistoryItem {
  pickNumber: number
  playerId: string
  playerName: string
  position: FutsalPosition
  role: 'PLAYER' | 'COACH'
  teamId: string
  teamName: string
  overallOriginal: number
  overall: number
  selectedAt: string
}

export type DraftTeamGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface DraftSummaryGrade {
  grade: DraftTeamGrade
  score: number
  label: string
  description: string
}

export interface Opponent {
  id: string
  name: string
  country: string
  year: number
  level: number
  strategy: Strategy
  players: GamePlayer[]
  teamName?: string
  flagUrl?: string
}

export interface GroupTeam {
  id: string
  name: string
  isUserTeam: boolean
  strength: number
  formationKey?: Formation
  strategy?: Strategy
}

export interface GroupStanding {
  teamId: string
  teamName: string
  isUserTeam: boolean
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface GroupMatch {
  id: string
  round: 1 | 2 | 3
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  homeScore?: number
  awayScore?: number
  played: boolean
  involvesUserTeam: boolean
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
  wentToPenalties?: boolean
  userPenaltyScore?: number | null
  opponentPenaltyScore?: number | null
  penaltyWinner?: PenaltyTeam | null
  penaltyShots?: PenaltyShot[]
  createdAt: string
}

export interface MatchSimulationPlan {
  id: string
  campaignId: string
  matchNumber: number
  stage: Stage
  formation: Formation
  strategy: Strategy
  difficulty: Difficulty
  squad: GamePlayer[]
  starterIds: string[]
  losingStreak: number
  events: MatchTimelineEvent[]
  match?: GameMatch
}

export interface GameCampaign {
  id: string
  status: CampaignStatus
  currentStage: Stage
  selectedFormation: Formation | null
  selectedStrategy: Strategy | null
  selectedDifficulty: Difficulty
  teamRerollsUsed: number
  recentTeamIds?: string[]
  pickHistory?: DraftPickHistoryItem[]
  draftCompletedAt?: string
  currentGroupRound: 1 | 2 | 3
  groupTeams: GroupTeam[]
  groupMatches: GroupMatch[]
  playerIds: string[]
  starterIds: string[]
  losingStreak: number
  matches: GameMatch[]
  groupPoints: number
  createdAt: string
  updatedAt: string
}
