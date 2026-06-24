import type { GameCampaign } from '../types'

const STORAGE_KEY = 'esquadrao-imortal:futsal-campaigns:v2'

function readAll(): GameCampaign[] {
  try {
    const campaigns = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Array<GameCampaign & { losingStreak?: number }>
    return campaigns.map((campaign) => ({ ...campaign, losingStreak: campaign.losingStreak ?? 0 }))
  } catch {
    return []
  }
}

export const campaignRepository = {
  list: () => readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  save(campaign: GameCampaign) {
    const campaigns = readAll()
    const index = campaigns.findIndex((item) => item.id === campaign.id)
    if (index >= 0) campaigns[index] = campaign
    else campaigns.push(campaign)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
    return campaign
  },
  create(): GameCampaign {
    const now = new Date().toISOString()
    return this.save({
      id: crypto.randomUUID(),
      status: 'tactics',
      currentStage: 'Fase de grupos',
      selectedFormation: null,
      selectedStrategy: null,
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
