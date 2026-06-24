import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import { getRequiredSquadByFormation } from '../game/formations'
import { createMatchSimulation } from '../game/simulation'
import { createDefaultLineup } from '../game/squad'
import type { GamePlayer } from '../types'
import { useMatchSimulation } from './useMatchSimulation'

describe('useMatchSimulation — substituições em lote', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mantém o jogo pausado durante várias trocas e só retoma ao concluir', () => {
    const required = getRequiredSquadByFormation('DIAMOND_3_1')
    const squad = (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
    const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')
    const plan = createMatchSimulation('batch-substitutions', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const { result } = renderHook(() => useMatchSimulation(plan, opponents[0], vi.fn()))

    act(() => result.current.start())
    act(() => result.current.pauseForSubstitution())
    expect(result.current.status).toBe('paused')

    const firstOutgoing = result.current.activePlayers.find((player) => player.position === 'GOLEIRO')!
    const firstIncoming = result.current.benchPlayers.find((player) => player.position === 'GOLEIRO')!
    act(() => result.current.substitute({ playerOutId: firstOutgoing.id, playerInId: firstIncoming.id }))
    expect(result.current.status).toBe('paused')
    expect(result.current.activePlayers.map((player) => player.id)).toContain(firstIncoming.id)

    const secondOutgoing = result.current.activePlayers.find((player) => player.position === 'ALA')!
    const secondIncoming = result.current.benchPlayers.find((player) => player.position === 'ALA')!
    act(() => result.current.substitute({ playerOutId: secondOutgoing.id, playerInId: secondIncoming.id }))
    expect(result.current.status).toBe('paused')
    expect(result.current.activePlayers.map((player) => player.id)).toContain(secondIncoming.id)
    expect(result.current.visibleEvents.filter((event) => event.type === 'substitution' && event.team === 'user')).toHaveLength(2)

    act(() => result.current.cancelSubstitution())
    expect(result.current.status).toBe('first_half')
  })
})
