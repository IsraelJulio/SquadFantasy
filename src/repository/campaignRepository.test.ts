import { beforeEach, describe, expect, it } from 'vitest'
import { campaignRepository } from './campaignRepository'

const STORAGE_KEY = 'esquadrao-imortal:futsal-campaigns:v2'

describe('campaignRepository — regras persistidas do draft', () => {
  beforeEach(() => localStorage.clear())

  it('mantém os sorteios usados depois de salvar e recarregar', () => {
    const campaign = campaignRepository.create()
    campaignRepository.save({ ...campaign, teamRerollsUsed: 1 })

    expect(campaignRepository.list()[0].teamRerollsUsed).toBe(1)
  })

  it('não persiste usos acima do limite da dificuldade', () => {
    const campaign = campaignRepository.create()
    const casual = campaignRepository.save({ ...campaign, selectedDifficulty: 'CASUAL', teamRerollsUsed: 99 })
    expect(casual.teamRerollsUsed).toBe(3)

    const challenge = campaignRepository.save({ ...casual, selectedDifficulty: 'CHALLENGE', teamRerollsUsed: 1 })
    expect(challenge.teamRerollsUsed).toBe(0)
  })

  it('migra campanhas antigas para Normal sem sorteios usados', () => {
    const now = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{
      id: 'legacy', status: 'draft', currentStage: 'Fase de grupos', selectedFormation: 'DIAMOND_3_1', selectedStrategy: 'Equilibrado',
      playerIds: [], starterIds: [], losingStreak: 0, matches: [], groupPoints: 0, createdAt: now, updatedAt: now,
    }]))

    expect(campaignRepository.list()[0]).toMatchObject({ selectedDifficulty: 'NORMAL', teamRerollsUsed: 0 })
  })
})
