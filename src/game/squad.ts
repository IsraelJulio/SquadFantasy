import type { Formation, GameAthlete, GameCoach, GamePlayer, Strategy } from '../types'
import { ATHLETE_POSITIONS, FUTSAL_FORMATIONS } from './formations'

export interface SquadStrength {
  finalStrength: number
  playersAverage: number
  coachBoost: number
  formationBoost: number
  strategyBoost: number
  comebackBoost: number
}

const strategyBoosts: Record<Strategy, number> = {
  Ofensivo: 1.012,
  Equilibrado: 1,
  Defensivo: 1.005,
  'Contra-ataque': 1.01,
  'Posse de bola': 1.012,
}

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
const clampStamina = (stamina: number) => Math.max(0, Math.min(100, stamina))

export function athletesFrom(squad: GamePlayer[]): GameAthlete[] {
  return squad.filter((player): player is GameAthlete => player.position !== 'TECNICO')
}

export function coachFrom(squad: GamePlayer[]): GameCoach | undefined {
  return squad.find((player): player is GameCoach => player.position === 'TECNICO')
}

export function getCompatibleSubstitutes(outgoing: GamePlayer | undefined, bench: GamePlayer[]): GameAthlete[] {
  if (!outgoing || outgoing.position === 'TECNICO') return []
  return bench.filter((player): player is GameAthlete => player.position !== 'TECNICO' && player.position === outgoing.position)
}

export function createDefaultLineup(squad: GamePlayer[], formation: Formation): string[] {
  const athletes = athletesFrom(squad)
  const needs = FUTSAL_FORMATIONS[formation].starters
  return ATHLETE_POSITIONS.flatMap((position) => athletes.filter((player) => player.position === position).slice(0, needs[position]).map((player) => player.id))
}

export function validateStartingLineup(starters: GamePlayer[], bench: GamePlayer[], formation: Formation): string[] {
  const errors: string[] = []
  const athletes = athletesFrom(starters)
  if (starters.some((player) => player.position === 'TECNICO')) errors.push('O técnico não pode ser escalado como atleta.')
  if (athletes.length !== 5) errors.push(`A escalação precisa ter 5 atletas; há ${athletes.length}.`)
  const needs = FUTSAL_FORMATIONS[formation].starters
  for (const position of ATHLETE_POSITIONS) {
    const count = athletes.filter((player) => player.position === position).length
    const required = needs[position]
    if (count < required) errors.push(`Falta ${required - count} ${position} titular para o ${FUTSAL_FORMATIONS[formation].name}.`)
    if (required === 0 && count > 0) errors.push(`Este sistema não usa ${position}.`)
    else if (count > required) errors.push(`Há ${count - required} ${position} titular a mais.`)
  }
  if (bench.some((player) => player.position === 'TECNICO')) errors.push('O técnico deve ficar na área separada.')
  return errors
}

export function calculateEffectiveOverall(player: Pick<GameAthlete, 'overallOriginal' | 'stamina'>): number {
  const staminaFactor = clampStamina(player.stamina) / 100
  const effectiveFactor = Math.max(0.5, 1 - (1 - staminaFactor) * 0.5)
  return Math.min(player.overallOriginal, Math.round(player.overallOriginal * effectiveFactor))
}

export function updatePlayerStamina(player: GameAthlete, isOnCourt: boolean): GameAthlete {
  const stamina = clampStamina(player.stamina + (isOnCourt ? -2 : 4))
  return { ...player, stamina, overall: calculateEffectiveOverall({ overallOriginal: player.overallOriginal, stamina }) }
}

export function updateTeamStamina(players: GameAthlete[], activeIds: string[]): GameAthlete[] {
  return players.map((player) => updatePlayerStamina(player, activeIds.includes(player.id)))
}

export function calculateCoachBoost(coach?: GameCoach): number {
  if (!coach) return 0.97
  return 1 + (coach.overall - 70) / 1000
}

export function calculateFormationBoost(formation: Formation, starters: GamePlayer[]): number {
  const needs = FUTSAL_FORMATIONS[formation].starters
  const athletes = athletesFrom(starters)
  const difference = ATHLETE_POSITIONS.reduce((sum, position) => sum + Math.abs(athletes.filter((player) => player.position === position).length - needs[position]), 0)
  return Math.max(0.9, 1.01 - difference * 0.025)
}

export function calculateStrategyBoost(strategy: Strategy): number {
  return strategyBoosts[strategy]
}

export function calculateComebackBoost(losingStreak: number): number {
  const streak = Math.max(0, losingStreak)
  return streak >= 3 ? 1.1 : 1 + streak * 0.03
}

export function calculateActiveLineupStrength(starters: GamePlayer[], coach: GameCoach | undefined, formation: Formation, strategy: Strategy, comebackBoost = 1): SquadStrength {
  const athletes = athletesFrom(starters)
  const playersAverage = average(athletes.map((player) => player.overall))
  const coachBoost = calculateCoachBoost(coach)
  const formationBoost = calculateFormationBoost(formation, athletes)
  const strategyBoost = calculateStrategyBoost(strategy)
  const finalStrength = playersAverage * coachBoost * formationBoost * strategyBoost * comebackBoost
  return { finalStrength, playersAverage, coachBoost, formationBoost, strategyBoost, comebackBoost }
}

export function calculateSquadStrength(squad: GamePlayer[], formation: Formation, strategy: Strategy, losingStreak = 0): SquadStrength {
  const starters = createDefaultLineup(squad, formation).map((id) => squad.find((player) => player.id === id)!).filter(Boolean)
  return calculateActiveLineupStrength(starters, coachFrom(squad), formation, strategy, calculateComebackBoost(losingStreak))
}

export function countByPosition(players: GamePlayer[]) {
  return ATHLETE_POSITIONS.reduce((counts, position) => ({ ...counts, [position]: players.filter((player) => player.position === position).length }), { GOLEIRO: 0, FIXO: 0, ALA: 0, PIVO: 0 })
}
