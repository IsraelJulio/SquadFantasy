import type { AthletePosition, GameAthlete, GamePlayer, MatchPlayerState, Strategy } from '../types'

export const MIN_STAMINA = 0
export const MAX_STAMINA = 100
export const MIN_OVERALL = 30
export const MIN_FATIGUE_FACTOR = 0.6
export const MAX_FATIGUE_FACTOR = 1.8
export const DEFAULT_FATIGUE_FACTOR = 1
export const BASE_STAMINA_LOSS_PER_MINUTE = 1.5
export const BENCH_STAMINA_RECOVERY_PER_MINUTE = 0.75
export const CRITICAL_STAMINA_THRESHOLD = 25
export const CRITICAL_OVERALL_DECAY_MULTIPLIER = 3

const strategyStaminaMultiplier: Record<Strategy, number> = {
  Ofensivo: 1.15,
  Equilibrado: 1,
  Defensivo: 0.95,
  'Contra-ataque': 1.05,
  'Posse de bola': 0.9,
}

const positionStaminaMultiplier: Record<AthletePosition, number> = {
  GOLEIRO: 0.72,
  FIXO: 0.98,
  ALA: 1.12,
  PIVO: 1.04,
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function clampStamina(stamina: number) {
  return clamp(Math.round(stamina), MIN_STAMINA, MAX_STAMINA)
}

export function normalizeFatigueFactor(fatigueFactor = DEFAULT_FATIGUE_FACTOR) {
  return clamp(fatigueFactor, MIN_FATIGUE_FACTOR, MAX_FATIGUE_FACTOR)
}

export function generateFatigueFactorFromPhysical(physical: number) {
  const normalizedPhysical = clamp(physical, 40, 100)
  return Number(clamp(1.6 - (normalizedPhysical - 40) / 60, MIN_FATIGUE_FACTOR, MAX_FATIGUE_FACTOR).toFixed(2))
}

export function generateFatigueFactorForAthlete(position: AthletePosition, overall: number, index = 0) {
  const baseByPosition: Record<AthletePosition, number> = {
    GOLEIRO: 0.78,
    FIXO: 0.96,
    ALA: 1.18,
    PIVO: 1.08,
  }
  const ratingAdjustment = clamp((82 - overall) / 100, -0.12, 0.12)
  const profileVariation = ((index % 5) - 2) * 0.04
  return Number(normalizeFatigueFactor(baseByPosition[position] + ratingAdjustment + profileVariation).toFixed(2))
}

export function calculateStaminaLossPerMinute(player: GamePlayer, matchMinute: number, strategy: Strategy): number {
  if (player.position === 'TECNICO') return 0
  const finalStretchMultiplier = matchMinute >= 32 ? 1.06 : matchMinute >= 20 ? 1.02 : 1
  return Number((
    BASE_STAMINA_LOSS_PER_MINUTE
    * normalizeFatigueFactor(player.fatigueFactor)
    * strategyStaminaMultiplier[strategy]
    * positionStaminaMultiplier[player.position]
    * finalStretchMultiplier
  ).toFixed(2))
}

export function calculateCurrentOverall(baseOverall: number, stamina: number, fatigueFactor = DEFAULT_FATIGUE_FACTOR): number {
  const safeStamina = clamp(stamina, MIN_STAMINA, MAX_STAMINA)
  if (safeStamina >= 80) return baseOverall
  const normalDeficit = MAX_STAMINA - Math.max(safeStamina, CRITICAL_STAMINA_THRESHOLD)
  const criticalDeficit = Math.max(0, CRITICAL_STAMINA_THRESHOLD - safeStamina)
  const weightedStaminaDeficit = normalDeficit + criticalDeficit * CRITICAL_OVERALL_DECAY_MULTIPLIER
  const penalty = weightedStaminaDeficit * 0.18 * normalizeFatigueFactor(fatigueFactor)
  return Math.max(MIN_OVERALL, Math.min(baseOverall, Math.round(baseOverall - penalty)))
}

export function updateMatchPlayerStatesPerMinute(players: GameAthlete[], activeIds: string[], strategy: Strategy, matchMinute: number): GameAthlete[] {
  return players.map((player) => {
    const isOnCourt = activeIds.includes(player.id)
    const fatigueFactor = normalizeFatigueFactor(player.fatigueFactor)
    const stamina = clampStamina(player.stamina + (isOnCourt ? -calculateStaminaLossPerMinute(player, matchMinute, strategy) : BENCH_STAMINA_RECOVERY_PER_MINUTE))
    return {
      ...player,
      fatigueFactor,
      stamina,
      overall: calculateCurrentOverall(player.overallOriginal, stamina, fatigueFactor),
    }
  })
}

export function createMatchPlayerStates(players: GameAthlete[], activeIds: string[]): MatchPlayerState[] {
  return players.map((player) => {
    const fatigueFactor = normalizeFatigueFactor(player.fatigueFactor)
    const stamina = clampStamina(player.stamina)
    return {
      playerId: player.id,
      baseOverall: player.overallOriginal,
      currentOverall: calculateCurrentOverall(player.overallOriginal, stamina, fatigueFactor),
      stamina,
      fatigueFactor,
      isOnCourt: activeIds.includes(player.id),
    }
  })
}
