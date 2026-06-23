import type { Formation, GamePlayer, Strategy } from '../types'

export interface SquadStrength {
  overall: number
  attack: number
  defense: number
  midfield: number
  compatibility: number
}

const formationNeeds: Record<Formation, Partial<Record<GamePlayer['position'], number>>> = {
  '4-3-3': { Goleiro: 1, Zagueiro: 2, Lateral: 2, 'Meio-campo': 3, Atacante: 3 },
  '4-4-2': { Goleiro: 1, Zagueiro: 2, Lateral: 2, 'Meio-campo': 4, Atacante: 2 },
  '3-5-2': { Goleiro: 1, Zagueiro: 3, Lateral: 1, 'Meio-campo': 4, Atacante: 2 },
  '4-2-3-1': { Goleiro: 1, Zagueiro: 2, Lateral: 2, 'Meio-campo': 4, Atacante: 2 },
}

const strategyAdjustments: Record<Strategy, { attack: number; defense: number; midfield: number }> = {
  Ofensivo: { attack: 5, defense: -3, midfield: 1 },
  Equilibrado: { attack: 1, defense: 1, midfield: 1 },
  Defensivo: { attack: -3, defense: 5, midfield: 1 },
  'Contra-ataque': { attack: 3, defense: 2, midfield: -2 },
  'Posse de bola': { attack: 1, defense: 0, midfield: 5 },
}

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

export function calculateCompatibility(squad: GamePlayer[], formation: Formation) {
  const needs = formationNeeds[formation]
  let difference = 0
  for (const [position, required] of Object.entries(needs)) {
    const count = squad.filter((player) => player.position === position).length
    difference += Math.abs(count - (required ?? 0))
  }
  return Math.max(70, 100 - difference * 5)
}

export function calculateSquadStrength(squad: GamePlayer[], formation: Formation, strategy: Strategy): SquadStrength {
  const compatibility = calculateCompatibility(squad, formation)
  const adjustment = strategyAdjustments[strategy]
  const keepersAndDefenders = squad.filter((player) => ['Goleiro', 'Zagueiro', 'Lateral'].includes(player.position))
  const midfielders = squad.filter((player) => player.position === 'Meio-campo')
  const attackers = squad.filter((player) => player.position === 'Atacante')
  const attack = average(attackers.map((player) => (player.attack + player.technique + player.speed) / 3)) + adjustment.attack
  const defense = average(keepersAndDefenders.map((player) => (player.defense + player.physical + player.mentality) / 3)) + adjustment.defense
  const midfield = average(midfielders.map((player) => (player.technique + player.mentality + player.defense) / 3)) + adjustment.midfield
  return {
    overall: Math.round(average(squad.map((player) => player.overall))),
    attack: Math.round(attack),
    defense: Math.round(defense),
    midfield: Math.round(midfield),
    compatibility,
  }
}
