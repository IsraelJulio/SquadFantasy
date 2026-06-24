import { describe, expect, it } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { Difficulty, Formation, GamePlayer } from '../types'
import { getRequiredSquadByFormation } from './formations'
import { simulateMatch } from './simulation'
import { createDefaultLineup } from './squad'

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
  const opponent = opponents.find((item) => item.level === 81) ?? opponents[0]
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
    expect(challenge).toBeGreaterThanOrEqual(0.18)
    expect(challenge).toBeLessThanOrEqual(0.28)
    expect(normal).toBeGreaterThanOrEqual(0.54)
    expect(normal).toBeLessThanOrEqual(0.62)
    expect(casual).toBeGreaterThanOrEqual(0.59)
    expect(casual).toBeLessThanOrEqual(0.68)
    expect(casual).toBeGreaterThanOrEqual(normal)
    expect(normal).toBeGreaterThan(challenge)
  })

  it('eleva a chance após derrotas sem alterar a dificuldade escolhida', () => {
    expect(victoryRate('NORMAL', 2)).toBeGreaterThan(victoryRate('NORMAL'))
  })
})
