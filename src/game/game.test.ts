import { describe, expect, it } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { Formation, GameCampaign, GamePlayer } from '../types'
import { getDraftOptions, getNextDraftPosition, validateDraftPick, validateSquadForFormation } from './draft'
import { getRequiredSquadByFormation } from './formations'
import { applySubstitution, createInitialMatchState, createMatchSimulation, finalizeMatch, simulateNextMinute } from './simulation'
import { calculateActiveLineupStrength, calculateCoachBoost, coachFrom, createDefaultLineup, getCompatibleSubstitutes, validateStartingLineup } from './squad'
import { applyMatch, pointsFor } from './tournament'

function squadFor(formation: Formation): GamePlayer[] {
  const required = getRequiredSquadByFormation(formation)
  return (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
}

const squad = squadFor('DIAMOND_3_1')
const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')

function campaign(): GameCampaign {
  const now = new Date().toISOString()
  return { id: 'test-campaign', status: 'active', currentStage: 'Fase de grupos', selectedFormation: 'DIAMOND_3_1', selectedStrategy: 'Equilibrado', playerIds: squad.map((player) => player.id), starterIds, matches: [], groupPoints: 0, createdAt: now, updatedAt: now }
}

describe('dados de futsal', () => {
  it('tem 80 nomes, incluindo atletas e técnicos', () => {
    expect(players).toHaveLength(80)
    expect(opponents).toHaveLength(12)
    expect(players.filter((player) => player.kind === 'athlete')).toHaveLength(72)
    expect(players.filter((player) => player.kind === 'coach')).toHaveLength(8)
  })
})

describe('draft por formação', () => {
  it('calcula 10 atletas e 1 técnico para todas as formações', () => {
    const formations: Formation[] = ['DIAMOND_3_1', 'SQUARE_2_2', 'FOUR_ZERO', 'THREE_TWO']
    for (const formation of formations) expect(Object.values(getRequiredSquadByFormation(formation)).reduce((sum, count) => sum + count, 0)).toBe(11)
  })

  it('não oferece uma posição que o 4x0 não usa', () => {
    const fourZeroSquad = squadFor('FOUR_ZERO')
    expect(fourZeroSquad.some((player) => player.position === 'FIXO' || player.position === 'PIVO')).toBe(false)
    expect(validateSquadForFormation(fourZeroSquad, 'FOUR_ZERO')).toEqual([])
  })

  it('oferece quatro opções únicas da próxima posição necessária', () => {
    const options = getDraftOptions('campaign-one', [], 'DIAMOND_3_1')
    expect(options).toHaveLength(4)
    expect(options.every((player) => player.position === 'GOLEIRO')).toBe(true)
    expect(new Set(options.map((player) => player.id)).size).toBe(4)
  })

  it('chega ao técnico depois de completar os dez atletas', () => {
    const athletes = squad.filter((player) => player.kind === 'athlete')
    expect(getNextDraftPosition(athletes, 'DIAMOND_3_1')).toBe('TECNICO')
    const pivot = players.find((player) => player.position === 'PIVO')!
    expect(validateDraftPick(pivot, squadFor('SQUARE_2_2'), 'SQUARE_2_2')).toContain('não é usado')
  })
})

describe('escalação e força', () => {
  it('valida cinco titulares e mantém o técnico separado', () => {
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const bench = squad.filter((player) => player.kind === 'athlete' && !starterIds.includes(player.id))
    expect(validateStartingLineup(starters, bench, 'DIAMOND_3_1')).toEqual([])
    expect(starters).toHaveLength(5)
  })

  it('aplica um boost pequeno do técnico apenas ao quinteto ativo', () => {
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const coach = coachFrom(squad)
    const strength = calculateActiveLineupStrength(starters, 'DIAMOND_3_1', 'Equilibrado', coach)
    expect(calculateCoachBoost(coach)).toBeGreaterThan(0.97)
    expect(calculateCoachBoost(coach)).toBeLessThan(1.04)
    expect(strength.attack).toBeGreaterThan(50)
  })

  it('mostra no banco apenas substitutos compatíveis com o titular selecionado', () => {
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const bench = squad.filter((player) => player.kind === 'athlete' && !starterIds.includes(player.id))
    const outgoing = starters.find((player) => player.position === 'ALA')
    const compatible = getCompatibleSubstitutes(outgoing, bench)
    expect(compatible.length).toBeGreaterThan(0)
    expect(compatible.every((player) => player.position === 'ALA')).toBe(true)
    expect(getCompatibleSubstitutes(undefined, bench)).toEqual([])
  })
})

describe('simulação incremental', () => {
  it('faz substituição compatível, troca o atleta ativo e registra a timeline', () => {
    const plan = createMatchSimulation('test', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const state = { ...createInitialMatchState(plan), minute: 14 }
    const outgoing = squad.find((player) => player.kind === 'athlete' && starterIds.includes(player.id) && player.position === 'ALA')!
    const incoming = squad.find((player) => player.kind === 'athlete' && !starterIds.includes(player.id) && player.position === 'ALA')!
    const changed = applySubstitution(state, { playerOutId: outgoing.id, playerInId: incoming.id })
    expect(changed.activeIds).toContain(incoming.id)
    expect(changed.activeIds).not.toContain(outgoing.id)
    expect(changed.events.at(-1)).toMatchObject({ type: 'substitution', minute: 14, playerOut: outgoing.name, playerIn: incoming.name, position: 'ALA' })
  })

  it('simula 40 minutos e mantém o placar consistente com os gols', () => {
    const plan = createMatchSimulation('timeline-test', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    let state = createInitialMatchState(plan)
    for (let minute = 0; minute < 40; minute += 1) state = simulateNextMinute(state, opponents[0])
    const result = finalizeMatch(state, opponents[0])
    expect(state.minute).toBe(40)
    expect(result.match?.userScore).toBe(state.events.filter((event) => event.type === 'goal' && event.team === 'user').length)
    expect(result.match?.opponentScore).toBe(state.events.filter((event) => event.type === 'goal' && event.team === 'opponent').length)
  })
})

describe('torneio', () => {
  it('atribui a pontuação padrão dos grupos', () => {
    expect(pointsFor('victory')).toBe(3)
    expect(pointsFor('draw')).toBe(1)
    expect(pointsFor('defeat')).toBe(0)
  })

  it('elimina uma campanha abaixo de quatro pontos', () => {
    let state = campaign()
    for (let index = 0; index < 3; index += 1) state = applyMatch(state, { id: `${index}`, stage: 'Fase de grupos', opponentName: 'Rival', userScore: 0, opponentScore: 1, result: 'defeat', summary: '', manOfTheMatch: 'Rival', createdAt: new Date().toISOString() })
    expect(state.status).toBe('eliminated')
  })
})
