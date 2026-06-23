import type { AthletePosition, Formation, GameAthlete, GameCoach, GamePlayer, Strategy } from '../types'
import { ATHLETE_POSITIONS, FUTSAL_FORMATIONS } from './formations'

export interface SquadStrength {
  overall: number
  attack: number
  defense: number
  control: number
  compatibility: number
  coachBoost: number
}

const strategyAdjustments: Record<Strategy, { attack: number; defense: number; control: number }> = {
  Ofensivo: { attack: 5, defense: -3, control: 1 },
  Equilibrado: { attack: 1, defense: 1, control: 1 },
  Defensivo: { attack: -3, defense: 5, control: 1 },
  'Contra-ataque': { attack: 4, defense: 2, control: -2 },
  'Posse de bola': { attack: 1, defense: 0, control: 5 },
}

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

export function athletesFrom(squad: GamePlayer[]): GameAthlete[] {
  return squad.filter((player): player is GameAthlete => player.kind === 'athlete')
}

export function coachFrom(squad: GamePlayer[]): GameCoach | undefined {
  return squad.find((player): player is GameCoach => player.kind === 'coach')
}

export function getCompatibleSubstitutes(outgoing: GamePlayer | undefined, bench: GamePlayer[]): GameAthlete[] {
  if (!outgoing || outgoing.kind !== 'athlete') return []
  return bench.filter((player): player is GameAthlete => player.kind === 'athlete' && player.position === outgoing.position)
}

export function createDefaultLineup(squad: GamePlayer[], formation: Formation): string[] {
  const athletes = athletesFrom(squad)
  const needs = FUTSAL_FORMATIONS[formation].starters
  return ATHLETE_POSITIONS.flatMap((position) => athletes.filter((player) => player.position === position).slice(0, needs[position]).map((player) => player.id))
}

export function validateStartingLineup(starters: GamePlayer[], bench: GamePlayer[], formation: Formation): string[] {
  const errors: string[] = []
  const athletes = starters.filter((player): player is GameAthlete => player.kind === 'athlete')
  if (starters.some((player) => player.kind === 'coach')) errors.push('O técnico não pode ser escalado como atleta.')
  if (athletes.length !== 5) errors.push(`A escalação precisa ter 5 atletas; há ${athletes.length}.`)
  const needs = FUTSAL_FORMATIONS[formation].starters
  for (const position of ATHLETE_POSITIONS) {
    const count = athletes.filter((player) => player.position === position).length
    const required = needs[position]
    if (count < required) errors.push(`Falta ${required - count} ${position} titular para o ${FUTSAL_FORMATIONS[formation].name}.`)
    if (required === 0 && count > 0) errors.push(`Este sistema não usa ${position}.`)
    else if (count > required) errors.push(`Há ${count - required} ${position} titular a mais.`)
  }
  if (bench.some((player) => player.kind === 'coach')) errors.push('O técnico deve ficar na área separada.')
  return errors
}

export function calculateCoachBoost(coach?: GameCoach): number {
  if (!coach) return 0.97
  return 1 + (coach.overall - 70) / 1000
}

export function calculateCompatibility(starters: GamePlayer[], formation: Formation) {
  const needs = FUTSAL_FORMATIONS[formation].starters
  const athletes = athletesFrom(starters)
  const difference = ATHLETE_POSITIONS.reduce((sum, position) => sum + Math.abs(athletes.filter((player) => player.position === position).length - needs[position]), 0)
  return Math.max(60, 100 - difference * 12)
}

export function calculateActiveLineupStrength(starters: GamePlayer[], formation: Formation, strategy: Strategy, coach?: GameCoach): SquadStrength {
  const athletes = athletesFrom(starters)
  const compatibility = calculateCompatibility(athletes, formation)
  const adjustment = strategyAdjustments[strategy]
  const coachBoost = calculateCoachBoost(coach)
  const attack = average(athletes.map((player) => player.finishing * 0.38 + player.dribbling * 0.27 + player.passing * 0.2 + player.speed * 0.15)) + adjustment.attack
  const defense = average(athletes.map((player) => player.marking * 0.42 + player.physical * 0.23 + player.mentality * 0.2 + player.speed * 0.15)) + adjustment.defense
  const control = average(athletes.map((player) => player.passing * 0.38 + player.dribbling * 0.27 + player.mentality * 0.2 + player.speed * 0.15)) + adjustment.control
  return {
    overall: Math.round(average(athletes.map((player) => player.overall)) * coachBoost),
    attack: Math.round(attack * coachBoost),
    defense: Math.round(defense * coachBoost),
    control: Math.round(control * coachBoost),
    compatibility,
    coachBoost,
  }
}

export function calculateSquadStrength(squad: GamePlayer[], formation: Formation, strategy: Strategy): SquadStrength {
  const starters = createDefaultLineup(squad, formation).map((id) => squad.find((player) => player.id === id)!).filter(Boolean)
  return calculateActiveLineupStrength(starters, formation, strategy, coachFrom(squad))
}

export function countByPosition(players: GamePlayer[]): Record<AthletePosition, number> {
  return ATHLETE_POSITIONS.reduce((counts, position) => ({ ...counts, [position]: players.filter((player) => player.position === position).length }), { GOLEIRO: 0, FIXO: 0, ALA: 0, PIVO: 0 })
}
