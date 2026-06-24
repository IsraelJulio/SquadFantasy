import { opponents } from '../data/opponents'
import type { GameCampaign, Opponent, Stage } from '../types'
import { hashSeed, seededRandom, shuffled } from './random'

const knockoutStages: Stage[] = ['Oitavas', 'Quartas', 'Semifinal', 'Final']

export function pointsFor(result: 'victory' | 'draw' | 'defeat') {
  return result === 'victory' ? 3 : result === 'draw' ? 1 : 0
}

export function opponentFor(campaign: GameCampaign): Opponent {
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

  if (match.stage === 'Fase de grupos' && matches.length === 3) {
    if (groupPoints < 4) status = 'eliminated'
    else currentStage = 'Oitavas'
  } else if (match.stage !== 'Fase de grupos') {
    if (match.result === 'defeat') status = 'eliminated'
    else if (match.stage === 'Final') {
      status = 'champion'
      losingStreak = 0
    }
    else currentStage = knockoutStages[knockoutStages.indexOf(match.stage) + 1]
  }

  return { ...campaign, matches, groupPoints, losingStreak, status, currentStage, updatedAt: new Date().toISOString() }
}
