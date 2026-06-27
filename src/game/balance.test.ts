import { describe, expect, it } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { Difficulty, Formation, GamePlayer } from '../types'
import { getRequiredSquadByFormation } from './formations'
import { simulateMatch } from './simulation'
import { createDefaultLineup } from './squad'
import { canRerollTeam, getRemainingTeamRerolls, shouldShowDraftPlayerOverall } from './balance'

function representativeSquad(formation: Formation): GamePlayer[] {
  const required = getRequiredSquadByFormation(formation)
  return (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) =>
    players.filter((player) => player.position === position).slice(0, count),
  )
}

function victoryRate(difficulty: Difficulty, losingStreak = 0, samples = 400) {
  const formation = 'DIAMOND_3_1'
  const squad = representativeSquad(formation)
  const starterIds = createDefaultLineup(squad, formation)
  const opponent = [...opponents].sort((a, b) => b.level - a.level)[0]
  let victories = 0
  for (let index = 0; index < samples; index += 1) {
    const match = simulateMatch(`balance-${index}`, index, squad, starterIds, formation, 'Equilibrado', opponent, 'Fase de grupos', losingStreak, difficulty)
    if (match.result === 'victory') victories += 1
  }
  return victories / samples
}

describe('balanceamento estatístico', () => {
  it('aumenta a taxa de vitória de forma previsível por dificuldade', () => {
    const challenge = victoryRate('CHALLENGE')
    const normal = victoryRate('NORMAL')
    const casual = victoryRate('CASUAL')
    expect(challenge).toBeGreaterThanOrEqual(0.28)
    expect(challenge).toBeLessThanOrEqual(0.40)
    expect(normal).toBeGreaterThanOrEqual(0.54)
    expect(normal).toBeLessThanOrEqual(0.76)
    expect(casual).toBeGreaterThanOrEqual(0.59)
    expect(casual).toBeLessThanOrEqual(0.86)
    expect(casual).toBeGreaterThanOrEqual(normal)
    expect(normal).toBeGreaterThan(challenge)
  })

  it('eleva a chance após derrotas sem alterar a dificuldade escolhida', () => {
    expect(victoryRate('NORMAL', 2)).toBeGreaterThan(victoryRate('NORMAL'))
  })
})

describe('regras de dificuldade', () => {
  it('controla quando uma equipe pode ser sorteada novamente', () => {
    expect(canRerollTeam('CASUAL', 0)).toBe(true)
    expect(canRerollTeam('CASUAL', 2)).toBe(true)
    expect(canRerollTeam('CASUAL', 3)).toBe(false)
    expect(canRerollTeam('NORMAL', 0)).toBe(true)
    expect(canRerollTeam('NORMAL', 1)).toBe(false)
    expect(canRerollTeam('CHALLENGE', 0)).toBe(false)
  })

  it('calcula os sorteios restantes sem valores negativos', () => {
    expect([0, 1, 3].map((used) => getRemainingTeamRerolls('CASUAL', used))).toEqual([3, 2, 0])
    expect([0, 1].map((used) => getRemainingTeamRerolls('NORMAL', used))).toEqual([1, 0])
    expect([0, 2].map((used) => getRemainingTeamRerolls('CHALLENGE', used))).toEqual([0, 0])
  })

  it('exibe overall no draft somente no Casual', () => {
    expect(shouldShowDraftPlayerOverall('CASUAL')).toBe(true)
    expect(shouldShowDraftPlayerOverall('NORMAL')).toBe(false)
    expect(shouldShowDraftPlayerOverall('CHALLENGE')).toBe(false)
  })
})
