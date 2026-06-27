import { opponents } from '../data/opponents'
import type { GameCampaign, GroupMatch, GroupStanding, GroupTeam, MatchResult, Opponent } from '../types'
import { hashSeed, seededRandom, shuffled } from './random'

export const USER_GROUP_TEAM_ID = 'user-team'

type GroupScore = { homeScore: number; awayScore: number }
type GroupRound = 1 | 2 | 3

function opponentLabel(opponent: Opponent) {
  return `${opponent.name} ${opponent.year}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function resultForScores(goalsFor: number, goalsAgainst: number): MatchResult {
  return goalsFor > goalsAgainst ? 'victory' : goalsFor < goalsAgainst ? 'defeat' : 'draw'
}

function scoreFromExpected(expected: number, random: () => number) {
  const raw = (expected * 0.55) + (random() * expected * 1.25) + (random() * 0.8)
  return Math.max(0, Math.min(6, Math.floor(raw)))
}

function standingBase(team: GroupTeam): GroupStanding {
  return {
    teamId: team.id,
    teamName: team.name,
    isUserTeam: team.isUserTeam,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }
}

function applyStandingResult(standing: GroupStanding, goalsFor: number, goalsAgainst: number) {
  standing.played += 1
  standing.goalsFor += goalsFor
  standing.goalsAgainst += goalsAgainst
  standing.goalDifference = standing.goalsFor - standing.goalsAgainst

  const result = resultForScores(goalsFor, goalsAgainst)
  if (result === 'victory') {
    standing.wins += 1
    standing.points += 3
  } else if (result === 'draw') {
    standing.draws += 1
    standing.points += 1
  } else {
    standing.losses += 1
  }
}

function directPoints(teamId: string, opponentId: string, matches: GroupMatch[]) {
  return matches.reduce((points, match) => {
    if (!match.played || match.homeScore === undefined || match.awayScore === undefined) return points
    const directHome = match.homeTeamId === teamId && match.awayTeamId === opponentId
    const directAway = match.awayTeamId === teamId && match.homeTeamId === opponentId
    if (!directHome && !directAway) return points
    const goalsFor = directHome ? match.homeScore : match.awayScore
    const goalsAgainst = directHome ? match.awayScore : match.homeScore
    return points + (goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0)
  }, 0)
}

export function createGroupStage(campaignId: string) {
  const selectedOpponents = shuffled(opponents, seededRandom(hashSeed(`${campaignId}-group-opponents`))).slice(0, 3)
  const teams: GroupTeam[] = [
    { id: USER_GROUP_TEAM_ID, name: 'Esquadrão Imortal', isUserTeam: true, strength: 82 },
    ...selectedOpponents.map((opponent) => ({
      id: opponent.id,
      name: opponentLabel(opponent),
      isUserTeam: false,
      strength: opponent.level,
      strategy: opponent.strategy,
    })),
  ]
  const [, a, b, c] = teams
  const match = (round: GroupRound, home: GroupTeam, away: GroupTeam): GroupMatch => ({
    id: `${campaignId}-group-r${round}-${home.id}-${away.id}`,
    round,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeTeamName: home.name,
    awayTeamName: away.name,
    played: false,
    involvesUserTeam: home.isUserTeam || away.isUserTeam,
  })

  return {
    currentGroupRound: 1 as GroupRound,
    groupTeams: teams,
    groupMatches: [
      match(1, teams[0], a),
      match(1, b, c),
      match(2, teams[0], b),
      match(2, a, c),
      match(3, teams[0], c),
      match(3, a, b),
    ],
  }
}

export function calculateGroupStandings(teams: GroupTeam[], matches: GroupMatch[]): GroupStanding[] {
  const standingsByTeam = new Map(teams.map((team) => [team.id, standingBase(team)]))

  for (const match of matches) {
    if (!match.played || match.homeScore === undefined || match.awayScore === undefined) continue
    const home = standingsByTeam.get(match.homeTeamId)
    const away = standingsByTeam.get(match.awayTeamId)
    if (!home || !away) continue
    applyStandingResult(home, match.homeScore, match.awayScore)
    applyStandingResult(away, match.awayScore, match.homeScore)
  }

  return [...standingsByTeam.values()].sort((a, b) => {
    const standard = b.points - a.points
      || b.goalDifference - a.goalDifference
      || b.goalsFor - a.goalsFor
      || a.goalsAgainst - b.goalsAgainst
    if (standard !== 0) return standard
    const direct = directPoints(b.teamId, a.teamId, matches) - directPoints(a.teamId, b.teamId, matches)
    return direct || hashSeed(a.teamId).toString().localeCompare(hashSeed(b.teamId).toString())
  })
}

export function simulateCpuGroupMatch(homeTeam: GroupTeam, awayTeam: GroupTeam, seedKey = `${homeTeam.id}-${awayTeam.id}`): GroupScore {
  const random = seededRandom(hashSeed(`cpu-group-${seedKey}`))
  const edge = homeTeam.strength - awayTeam.strength
  const homeExpected = clamp(1.35 + edge / 60 + 0.12, 0.45, 3.8)
  const awayExpected = clamp(1.25 - edge / 60, 0.35, 3.7)
  return {
    homeScore: scoreFromExpected(homeExpected, random),
    awayScore: scoreFromExpected(awayExpected, random),
  }
}

export function applyGroupMatchResult(matches: GroupMatch[], matchId: string, homeScore: number, awayScore: number): GroupMatch[] {
  return matches.map((match) => match.id === matchId ? { ...match, homeScore, awayScore, played: true } : match)
}

export function getCurrentUserGroupMatch(campaign: GameCampaign): GroupMatch | null {
  return campaign.groupMatches.find((match) => match.round === campaign.currentGroupRound && match.involvesUserTeam) ?? null
}

export function getCpuMatchForCurrentRound(campaign: GameCampaign): GroupMatch | null {
  return campaign.groupMatches.find((match) => match.round === campaign.currentGroupRound && !match.involvesUserTeam) ?? null
}

export function didUserQualifyFromGroup(standings: GroupStanding[], userTeamId = USER_GROUP_TEAM_ID) {
  const userIndex = standings.findIndex((standing) => standing.teamId === userTeamId)
  return userIndex >= 0 && userIndex < 2
}

export function finishGroupRound(campaign: GameCampaign, userMatchResult: { userScore: number; opponentScore: number }): GameCampaign {
  const userMatch = getCurrentUserGroupMatch(campaign)
  if (!userMatch) return campaign

  const userIsHome = userMatch.homeTeamId === USER_GROUP_TEAM_ID
  const userHomeScore = userIsHome ? userMatchResult.userScore : userMatchResult.opponentScore
  const userAwayScore = userIsHome ? userMatchResult.opponentScore : userMatchResult.userScore
  let groupMatches = applyGroupMatchResult(campaign.groupMatches, userMatch.id, userHomeScore, userAwayScore)

  const cpuMatch = getCpuMatchForCurrentRound({ ...campaign, groupMatches })
  if (cpuMatch && !cpuMatch.played) {
    const homeTeam = campaign.groupTeams.find((team) => team.id === cpuMatch.homeTeamId)
    const awayTeam = campaign.groupTeams.find((team) => team.id === cpuMatch.awayTeamId)
    if (homeTeam && awayTeam) {
      const score = simulateCpuGroupMatch(homeTeam, awayTeam, `${campaign.id}-${cpuMatch.id}`)
      groupMatches = applyGroupMatchResult(groupMatches, cpuMatch.id, score.homeScore, score.awayScore)
    }
  }

  const standings = calculateGroupStandings(campaign.groupTeams, groupMatches)
  const userStanding = standings.find((standing) => standing.teamId === USER_GROUP_TEAM_ID)
  const finalRound = campaign.currentGroupRound === 3
  if (!finalRound) return { ...campaign, groupMatches, groupPoints: userStanding?.points ?? campaign.groupPoints, currentGroupRound: (campaign.currentGroupRound + 1) as GroupRound }

  return {
    ...campaign,
    groupMatches,
    groupPoints: userStanding?.points ?? campaign.groupPoints,
    status: didUserQualifyFromGroup(standings) ? campaign.status : 'eliminated',
    currentStage: didUserQualifyFromGroup(standings) ? 'Oitavas' : campaign.currentStage,
  }
}
