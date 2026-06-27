import type { GameCampaign } from '../types'
import { DIFFICULTY_SETTINGS } from '../game/balance'
import { createGroupStage } from '../game/groupStage'

const STORAGE_KEY = 'esquadrao-imortal:futsal-campaigns:v2'

type StoredCampaign = Omit<GameCampaign, 'losingStreak' | 'selectedDifficulty' | 'teamRerollsUsed' | 'currentGroupRound' | 'groupTeams' | 'groupMatches'> & {
  losingStreak?: number
  selectedDifficulty?: GameCampaign['selectedDifficulty']
  teamRerollsUsed?: number
  currentGroupRound?: GameCampaign['currentGroupRound']
  groupTeams?: GameCampaign['groupTeams']
  groupMatches?: GameCampaign['groupMatches']
}

function normalizeCampaign(campaign: StoredCampaign): GameCampaign {
  const selectedDifficulty = campaign.selectedDifficulty ?? 'NORMAL'
  const maximumRerolls = DIFFICULTY_SETTINGS[selectedDifficulty].maxTeamRerolls
  const teamRerollsUsed = Math.min(maximumRerolls, Math.max(0, Math.floor(campaign.teamRerollsUsed ?? 0)))
  const group = campaign.groupTeams?.length === 4 && campaign.groupMatches?.length === 6
    ? { currentGroupRound: campaign.currentGroupRound ?? 1, groupTeams: campaign.groupTeams, groupMatches: campaign.groupMatches }
    : createGroupStage(campaign.id)
  return { ...campaign, ...group, losingStreak: campaign.losingStreak ?? 0, selectedDifficulty, teamRerollsUsed }
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
    const id = crypto.randomUUID()
    return this.save({
      id,
      status: 'tactics',
      currentStage: 'Fase de grupos',
      selectedFormation: null,
      selectedStrategy: null,
      selectedDifficulty: 'NORMAL',
      teamRerollsUsed: 0,
      ...createGroupStage(id),
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
