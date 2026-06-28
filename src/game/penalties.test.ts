import { describe, expect, it } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { GameAthlete, GamePlayer } from '../types'
import { getRequiredSquadByFormation } from './formations'
import { calculatePenaltyChance, createPenaltyShootout, getPenaltyParticipants, startPenaltyShootout, takeNextPenalty } from './penalties'
import { createDefaultLineup } from './squad'
import { createInitialMatchState, createMatchSimulation, finalizeMatch } from './simulation'

const required = getRequiredSquadByFormation('DIAMOND_3_1')
const squad = (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
const starters = createDefaultLineup(squad, 'DIAMOND_3_1')

function knockoutState() {
  return createInitialMatchState(createMatchSimulation('penalty-test', 3, squad, starters, 'DIAMOND_3_1', 'Equilibrado', 'Oitavas', 2), opponents[0])
}

const goal = () => 0
const saved = () => {
  const rolls = [1, 0]
  return () => rolls.shift() ?? 0
}

describe('disputa por pênaltis', () => {
  it('limita a chance entre 55% e 90% usando overall e stamina atuais', () => {
    const athlete = (overall: number, stamina: number): GameAthlete => ({ id: crypto.randomUUID(), name: 'Atleta', position: 'ALA', overallOriginal: 99, overall, stamina, carta: '', perfil: '', campeao: false })
    expect(calculatePenaltyChance(athlete(20, 0), athlete(99, 100), 0.9, 1)).toBe(0.55)
    expect(calculatePenaltyChance(athlete(99, 100), athlete(20, 0), 1.2, 1.1)).toBe(0.9)
  })

  it('prioriza quem terminou em quadra, ordena por overall e nunca inclui o técnico', () => {
    const match = knockoutState()
    let shootout = startPenaltyShootout(createPenaltyShootout())
    const first = getPenaltyParticipants(match, shootout)
    const expected = match.userPlayers.filter((player) => match.activeIds.includes(player.id)).sort((a, b) => b.overall - a.overall)[0]
    expect(first.taker.id).toBe(expected.id)
    for (let index = 0; index < 20; index += 1) shootout = takeNextPenalty(match, shootout, goal)
    const userTakers = shootout.shots.filter((shot) => shot.team === 'user').map((shot) => shot.takerId)
    expect(new Set(userTakers.slice(0, match.userPlayers.length)).size).toBe(match.userPlayers.length)
    expect(userTakers).not.toContain(squad.find((player) => player.position === 'TECNICO')?.id)
  })

  it('encerra antecipadamente quando o adversário não pode mais alcançar', () => {
    const match = knockoutState()
    let shootout = startPenaltyShootout(createPenaltyShootout())
    for (let round = 0; round < 3; round += 1) {
      shootout = takeNextPenalty(match, shootout, goal)
      shootout = takeNextPenalty(match, shootout, saved())
    }
    expect(shootout).toMatchObject({ status: 'finished', winner: 'user', userPenaltyScore: 3, opponentPenaltyScore: 0 })
    expect(shootout.shots).toHaveLength(6)
  })

  it('entra em cobranças alternadas e decide somente após os dois cobrarem na rodada', () => {
    const match = knockoutState()
    let shootout = startPenaltyShootout(createPenaltyShootout())
    for (let index = 0; index < 10; index += 1) shootout = takeNextPenalty(match, shootout, goal)
    expect(shootout).toMatchObject({ status: 'in_progress', currentRound: 6, userPenaltyScore: 5, opponentPenaltyScore: 5 })
    shootout = takeNextPenalty(match, shootout, goal)
    expect(shootout.status).toBe('in_progress')
    shootout = takeNextPenalty(match, shootout, saved())
    expect(shootout).toMatchObject({ status: 'finished', winner: 'user', userPenaltyScore: 6, opponentPenaltyScore: 5 })
  })

  it('não finaliza mata-mata empatado sem disputa e persiste o vencedor depois dela', () => {
    const match = knockoutState()
    expect(() => finalizeMatch(match, opponents[0])).toThrow(/só pode terminar após os pênaltis/)
    let shootout = startPenaltyShootout(createPenaltyShootout())
    for (let round = 0; round < 3; round += 1) {
      shootout = takeNextPenalty(match, shootout, goal)
      shootout = takeNextPenalty(match, shootout, saved())
    }
    expect(finalizeMatch(match, opponents[0], shootout).match).toMatchObject({ wentToPenalties: true, result: 'victory', penaltyWinner: 'user', userPenaltyScore: 3, opponentPenaltyScore: 0 })
  })
})
