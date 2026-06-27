import type { GamePlayer } from '../types'
import { getAllCoaches, getAllPlayers } from './futsalDatabase'

export const athletes = getAllPlayers()
export const coaches = getAllCoaches()
export const players: GamePlayer[] = [...athletes, ...coaches]

export const playerById = new Map(players.map((player) => [player.id, player]))
