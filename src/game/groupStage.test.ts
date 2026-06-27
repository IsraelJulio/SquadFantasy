import { describe, expect, it } from 'vitest'
import type { GameCampaign, GroupMatch, GroupTeam } from '../types'
import {
  USER_GROUP_TEAM_ID,
  calculateGroupStandings,
  createGroupStage,
  didUserQualifyFromGroup,
  finishGroupRound,
  simulateCpuGroupMatch,
} from './groupStage'

const teams: GroupTeam[] = [
  { id: USER_GROUP_TEAM_ID, name: 'Meu Time', isUserTeam: true, strength: 82 },
  { id: 'a', name: 'França 2020', isUserTeam: false, strength: 84 },
  { id: 'b', name: 'Uruguai 2016', isUserTeam: false, strength: 78 },
  { id: 'c', name: 'Argentina 1986', isUserTeam: false, strength: 80 },
]

const match = (id: string, round: 1 | 2 | 3, home: GroupTeam, away: GroupTeam, homeScore?: number, awayScore?: number): GroupMatch => ({
  id,
  round,
  homeTeamId: home.id,
  awayTeamId: away.id,
  homeTeamName: home.name,
  awayTeamName: away.name,
  homeScore,
  awayScore,
  played: homeScore !== undefined && awayScore !== undefined,
  involvesUserTeam: home.isUserTeam || away.isUserTeam,
})

function campaignForGroup(): GameCampaign {
  const now = new Date().toISOString()
  const group = createGroupStage('group-flow')
  return {
    id: 'group-flow',
    status: 'active',
    currentStage: 'Fase de grupos',
    selectedFormation: 'DIAMOND_3_1',
    selectedStrategy: 'Equilibrado',
    selectedDifficulty: 'NORMAL',
    teamRerollsUsed: 0,
    ...group,
    playerIds: [],
    starterIds: [],
    losingStreak: 0,
    matches: [],
    groupPoints: 0,
    createdAt: now,
    updatedAt: now,
  }
}

describe('calculateGroupStandings', () => {
  it('calcula campanha, gols e pontos e ordena por pontos', () => {
    const standings = calculateGroupStandings(teams, [
      match('m1', 1, teams[0], teams[1], 2, 0),
      match('m2', 1, teams[2], teams[3], 1, 1),
    ])

    expect(standings[0]).toMatchObject({ teamId: USER_GROUP_TEAM_ID, played: 1, wins: 1, draws: 0, losses: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2, points: 3 })
    expect(standings.find((standing) => standing.teamId === 'b')).toMatchObject({ draws: 1, points: 1 })
    expect(standings.at(-1)).toMatchObject({ teamId: 'a', losses: 1, points: 0 })
  })

  it('ordena por saldo de gols e depois gols marcados', () => {
    const standings = calculateGroupStandings(teams, [
      match('m1', 1, teams[0], teams[3], 1, 0),
      match('m2', 1, teams[1], teams[2], 3, 2),
    ])

    expect(standings.map((standing) => standing.teamId).slice(0, 2)).toEqual(['a', USER_GROUP_TEAM_ID])
  })
})

describe('simulateCpuGroupMatch', () => {
  it('retorna placar valido sem gols negativos', () => {
    const score = simulateCpuGroupMatch(teams[1], teams[2], 'valid-score')

    expect(score.homeScore).toBeGreaterThanOrEqual(0)
    expect(score.awayScore).toBeGreaterThanOrEqual(0)
  })

  it('usa força dos times para influenciar o resultado', () => {
    const strong: GroupTeam = { id: 'strong', name: 'Forte', isUserTeam: false, strength: 95 }
    const weak: GroupTeam = { id: 'weak', name: 'Fraco', isUserTeam: false, strength: 55 }
    const samples = Array.from({ length: 60 }, (_, index) => simulateCpuGroupMatch(strong, weak, `strength-${index}`))
    const strongGoals = samples.reduce((sum, score) => sum + score.homeScore, 0)
    const weakGoals = samples.reduce((sum, score) => sum + score.awayScore, 0)

    expect(strongGoals).toBeGreaterThan(weakGoals)
  })
})

describe('finishGroupRound', () => {
  it('salva resultado do usuario, simula o outro jogo, marca a rodada e avanca', () => {
    const campaign = campaignForGroup()
    const next = finishGroupRound(campaign, { userScore: 2, opponentScore: 1 })
    const roundMatches = next.groupMatches.filter((item) => item.round === 1)

    expect(roundMatches.every((item) => item.played)).toBe(true)
    expect(roundMatches.find((item) => item.involvesUserTeam)).toMatchObject({ homeScore: 2, awayScore: 1 })
    expect(next.currentGroupRound).toBe(2)
    expect(next.groupPoints).toBe(3)
  })

  it('encerra a fase de grupos ao fim da terceira rodada', () => {
    let campaign = campaignForGroup()
    campaign = finishGroupRound(campaign, { userScore: 3, opponentScore: 0 })
    campaign = finishGroupRound(campaign, { userScore: 2, opponentScore: 0 })
    campaign = finishGroupRound(campaign, { userScore: 1, opponentScore: 0 })

    expect(campaign.currentStage).toBe('Oitavas')
    expect(campaign.status).toBe('active')
    expect(campaign.groupMatches.every((item) => item.played)).toBe(true)
  })
})

describe('didUserQualifyFromGroup', () => {
  it('retorna true para primeiro e segundo, false para terceiro e quarto', () => {
    const standings = calculateGroupStandings(teams, [
      match('m1', 1, teams[0], teams[1], 2, 0),
      match('m2', 1, teams[2], teams[3], 1, 0),
      match('m3', 2, teams[0], teams[2], 1, 0),
      match('m4', 2, teams[1], teams[3], 2, 0),
      match('m5', 3, teams[0], teams[3], 0, 0),
      match('m6', 3, teams[1], teams[2], 2, 0),
    ])

    expect(didUserQualifyFromGroup(standings, standings[0].teamId)).toBe(true)
    expect(didUserQualifyFromGroup(standings, standings[1].teamId)).toBe(true)
    expect(didUserQualifyFromGroup(standings, standings[2].teamId)).toBe(false)
    expect(didUserQualifyFromGroup(standings, standings[3].teamId)).toBe(false)
  })
})
