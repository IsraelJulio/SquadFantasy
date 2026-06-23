import { describe, expect, it } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { GameCampaign } from '../types'
import { draftSlots, getDraftOptions } from './draft'
import { simulateMatch } from './simulation'
import { calculateCompatibility, calculateSquadStrength } from './squad'
import { applyMatch, pointsFor } from './tournament'

const squad = draftSlots.map((position) => players.find((player) => player.position === position)!)

function campaign(): GameCampaign {
  const now = new Date().toISOString()
  return { id: 'test-campaign', status: 'active', currentStage: 'Fase de grupos', selectedFormation: '4-3-3', selectedStrategy: 'Equilibrado', playerIds: squad.map((player) => player.id), matches: [], groupPoints: 0, createdAt: now, updatedAt: now }
}

describe('game data', () => {
  it('has the complete initial seed', () => {
    expect(players).toHaveLength(80)
    expect(opponents).toHaveLength(12)
    expect(new Set(players.map((player) => player.id)).size).toBe(80)
    expect(players.every((player) => player.overall >= 55 && player.overall <= 96)).toBe(true)
    expect(players.filter((player) => player.overall >= 86).length).toBeGreaterThan(0)
  })
})

describe('draft', () => {
  it('offers four unique players for the required position', () => {
    const options = getDraftOptions('campaign-one', [])
    expect(options).toHaveLength(4)
    expect(options.every((player) => player.position === 'Goleiro')).toBe(true)
    expect(new Set(options.map((player) => player.id)).size).toBe(4)
  })

  it('never offers an already selected player', () => {
    const first = getDraftOptions('campaign-two', [])[0]
    const options = getDraftOptions('campaign-two', [first.id])
    expect(options.map((player) => player.id)).not.toContain(first.id)
    expect(options.every((player) => player.position === 'Zagueiro')).toBe(true)
  })
})

describe('squad calculation', () => {
  it('rewards a compatible 4-3-3 squad', () => {
    expect(calculateCompatibility(squad, '4-3-3')).toBe(100)
    const strength = calculateSquadStrength(squad, '4-3-3', 'Equilibrado')
    expect(strength.attack).toBeGreaterThan(50)
    expect(strength.defense).toBeGreaterThan(50)
  })
})

describe('tournament', () => {
  it('awards standard group points', () => {
    expect(pointsFor('victory')).toBe(3)
    expect(pointsFor('draw')).toBe(1)
    expect(pointsFor('defeat')).toBe(0)
  })

  it('eliminates a campaign that finishes the group below four points', () => {
    let state = campaign()
    for (let index = 0; index < 3; index += 1) {
      state = applyMatch(state, { id: `${index}`, stage: 'Fase de grupos', opponentName: 'Rival', userScore: 0, opponentScore: 1, result: 'defeat', summary: '', manOfTheMatch: 'Rival', createdAt: new Date().toISOString() })
    }
    expect(state.status).toBe('eliminated')
  })

  it('creates an organized match result', () => {
    const match = simulateMatch('test', 0, squad, '4-3-3', 'Equilibrado', opponents[0], 'Fase de grupos')
    expect(match.userScore).toBeGreaterThanOrEqual(0)
    expect(match.opponentScore).toBeGreaterThanOrEqual(0)
    expect(match.summary.length).toBeGreaterThan(20)
    expect(match.manOfTheMatch).toBeTruthy()
  })
})
