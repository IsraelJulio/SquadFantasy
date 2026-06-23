import { players } from '../data/players'
import type { GamePlayer, Position } from '../types'
import { hashSeed, seededRandom, shuffled } from './random'

export const draftSlots: Position[] = [
  'Goleiro',
  'Zagueiro',
  'Zagueiro',
  'Lateral',
  'Lateral',
  'Meio-campo',
  'Meio-campo',
  'Meio-campo',
  'Atacante',
  'Atacante',
  'Atacante',
]

export function getDraftOptions(campaignId: string, selectedIds: string[]): GamePlayer[] {
  const round = selectedIds.length
  if (round >= draftSlots.length) return []
  const position = draftSlots[round]
  const random = seededRandom(hashSeed(`${campaignId}-${round}-${position}`))
  const available = players.filter((player) => player.position === position && !selectedIds.includes(player.id))
  return shuffled(available, random).slice(0, 4)
}
