import { describe, expect, it } from 'vitest'
import type { GameAthlete } from '../types'
import {
  BASE_STAMINA_LOSS_PER_MINUTE,
  BENCH_STAMINA_RECOVERY_PER_MINUTE,
  calculateCurrentOverall,
  calculateStaminaLossPerMinute,
  updateMatchPlayerStatesPerMinute,
} from './staminaRules'
import { calculateActiveLineupStrength } from './squad'

const athlete = (fatigueFactor: number, stamina = 100, overallOriginal = 80): GameAthlete => ({
  id: crypto.randomUUID(),
  name: 'Atleta',
  position: 'FIXO',
  overallOriginal,
  overall: calculateCurrentOverall(overallOriginal, stamina, fatigueFactor),
  stamina,
  fatigueFactor,
})

describe('regras de stamina e fatigueFactor', () => {
  it('calcula perda por minuto usando fatigueFactor e estrategia', () => {
    const normal = calculateStaminaLossPerMinute(athlete(1), 10, 'Equilibrado')
    const fast = calculateStaminaLossPerMinute(athlete(1.5), 10, 'Equilibrado')
    const resistant = calculateStaminaLossPerMinute(athlete(0.7), 10, 'Equilibrado')

    expect(normal).toBeCloseTo(BASE_STAMINA_LOSS_PER_MINUTE * 0.98)
    expect(fast).toBeGreaterThan(normal)
    expect(resistant).toBeLessThan(normal)
    expect(calculateStaminaLossPerMinute(athlete(1), 10, 'Ofensivo')).toBeGreaterThan(calculateStaminaLossPerMinute(athlete(1), 10, 'Posse de bola'))
  })

  it('calcula overall atual a partir da stamina e respeita piso seguro', () => {
    expect(calculateCurrentOverall(80, 100, 1)).toBe(80)
    expect(calculateCurrentOverall(80, 70, 1)).toBeLessThan(80)
    expect(calculateCurrentOverall(80, 40, 1)).toBeLessThan(calculateCurrentOverall(80, 70, 1))
    expect(calculateCurrentOverall(80, 20, 1.4)).toBeLessThan(calculateCurrentOverall(80, 40, 1))
    expect(calculateCurrentOverall(35, 0, 1.8)).toBe(30)
  })

  it('atualiza quadra e banco, limitando stamina e recalculando overall', () => {
    const active = athlete(1.3)
    const bench = athlete(0.7, 60)
    const states = updateMatchPlayerStatesPerMinute([active, bench], [active.id], 'Equilibrado', 12)

    expect(states.find((player) => player.id === active.id)?.stamina).toBeLessThan(100)
    expect(states.find((player) => player.id === bench.id)?.stamina).toBe(Math.round(60 + BENCH_STAMINA_RECOVERY_PER_MINUTE))
    expect(states.every((player) => player.stamina >= 0 && player.stamina <= 100)).toBe(true)
    expect(states.every((player) => player.overall === calculateCurrentOverall(player.overallOriginal, player.stamina, player.fatigueFactor))).toBe(true)
  })

  it('a forca do time muda quando titulares usam currentOverall cansado', () => {
    const fresh = [athlete(1, 100, 90), athlete(1, 100, 85), athlete(1, 100, 84), athlete(1, 100, 83), athlete(1, 100, 82)]
    const tired = fresh.map((player) => ({ ...player, stamina: 20, overall: calculateCurrentOverall(player.overallOriginal, 20, player.fatigueFactor) }))

    expect(calculateActiveLineupStrength(tired, undefined, 'DIAMOND_3_1', 'Equilibrado').playersAverage).toBeLessThan(calculateActiveLineupStrength(fresh, undefined, 'DIAMOND_3_1', 'Equilibrado').playersAverage)
  })
})
