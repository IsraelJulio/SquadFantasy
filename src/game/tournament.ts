import { opponents } from '../data/opponents'
import type { GameCampaign, Opponent, Stage } from '../types'
import { finishGroupRound, getCurrentUserGroupMatch, USER_GROUP_TEAM_ID } from './groupStage'
import { hashSeed, seededRandom, shuffled } from './random'

const knockoutStages: Stage[] = ['Oitavas', 'Quartas', 'Semifinal', 'Final']

export function pointsFor(result: 'victory' | 'draw' | 'defeat') {
  return result === 'victory' ? 3 : result === 'draw' ? 1 : 0
}

export function opponentFor(campaign: GameCampaign): Opponent {
  if (campaign.currentStage === 'Fase de grupos') {
    const groupMatch = getCurrentUserGroupMatch(campaign)
    const opponentId = groupMatch?.homeTeamId === USER_GROUP_TEAM_ID ? groupMatch.awayTeamId : groupMatch?.homeTeamId
    const groupOpponent = opponents.find((opponent) => opponent.id === opponentId)
    if (groupOpponent) return groupOpponent
  }
  const order = shuffled(opponents, seededRandom(hashSeed(campaign.id)))
  return order[campaign.matches.length % order.length]
}

export function stageFor(campaign: GameCampaign): Stage {
  if (campaign.matches.length < 3) return 'Fase de grupos'
  return knockoutStages[Math.min(campaign.matches.length - 3, knockoutStages.length - 1)]
}

export function applyMatch(campaign: GameCampaign, match: GameCampaign['matches'][number]): GameCampaign {
  const matches = [...campaign.matches, match]
  const groupPoints = campaign.groupPoints + (match.stage === 'Fase de grupos' ? pointsFor(match.result) : 0)
  let status = campaign.status
  let currentStage = campaign.currentStage
  let losingStreak = match.result === 'defeat' ? campaign.losingStreak + 1 : match.result === 'victory' ? 0 : Math.max(0, campaign.losingStreak - 1)
  let nextCampaign = { ...campaign, matches, groupPoints, losingStreak, status, currentStage }

  if (match.stage === 'Fase de grupos') {
    nextCampaign = finishGroupRound(nextCampaign, { userScore: match.userScore, opponentScore: match.opponentScore })
  } else {
    if (match.result === 'defeat') status = 'eliminated'
    else if (match.stage === 'Final') {
      status = 'champion'
      losingStreak = 0
    }
    else currentStage = knockoutStages[knockoutStages.indexOf(match.stage) + 1]
    nextCampaign = { ...nextCampaign, status, currentStage, losingStreak }
  }

  return { ...nextCampaign, updatedAt: new Date().toISOString() }
}
