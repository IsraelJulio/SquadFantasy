import type { GameCampaign } from '../types'
import { DIFFICULTY_SETTINGS } from '../game/balance'

const STORAGE_KEY = 'esquadrao-imortal:futsal-campaigns:v2'

type StoredCampaign = Omit<GameCampaign, 'losingStreak' | 'selectedDifficulty' | 'teamRerollsUsed'> & {
  losingStreak?: number
  selectedDifficulty?: GameCampaign['selectedDifficulty']
  teamRerollsUsed?: number
}

function normalizeCampaign(campaign: StoredCampaign): GameCampaign {
  const selectedDifficulty = campaign.selectedDifficulty ?? 'NORMAL'
  const maximumRerolls = DIFFICULTY_SETTINGS[selectedDifficulty].maxTeamRerolls
  const teamRerollsUsed = Math.min(maximumRerolls, Math.max(0, Math.floor(campaign.teamRerollsUsed ?? 0)))
  return { ...campaign, losingStreak: campaign.losingStreak ?? 0, selectedDifficulty, teamRerollsUsed }
}

function readAll(): GameCampaign[] {
  try {
    const campaigns = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredCampaign[]
    return campaigns.map(normalizeCampaign)
  } catch {
    return []
  }
}

export const campaignRepository = {
  list: () => readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  save(campaign: GameCampaign) {
    const normalized = normalizeCampaign(campaign)
    const campaigns = readAll()
    const index = campaigns.findIndex((item) => item.id === campaign.id)
    if (index >= 0) campaigns[index] = normalized
    else campaigns.push(normalized)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
    return normalized
  },
  create(): GameCampaign {
    const now = new Date().toISOString()
    return this.save({
      id: crypto.randomUUID(),
      status: 'tactics',
      currentStage: 'Fase de grupos',
      selectedFormation: null,
      selectedStrategy: null,
      selectedDifficulty: 'NORMAL',
      teamRerollsUsed: 0,
      playerIds: [],
      starterIds: [],
      losingStreak: 0,
      matches: [],
      groupPoints: 0,
      createdAt: now,
      updatedAt: now,
    })
  },
  remove(id: string) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readAll().filter((campaign) => campaign.id !== id)))
  },
}
