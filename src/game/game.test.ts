import { describe, expect, it } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { Formation, GameAthlete, GameCampaign, GamePlayer } from '../types'
import { calculateDifficultyBoost, calculateTacticalMatchup } from './balance'
import { getAvailableDraftTeams, getDraftPlayerAvailability, getDraftTeam, getNextDraftPosition, validateDraftPick, validateSquadForFormation } from './draft'
import { getRequiredSquadByFormation } from './formations'
import { applySubstitution, calculateLiveMatchStrengths, createInitialMatchState, createMatchSimulation, finalizeMatch, simulateNextMinute } from './simulation'
import { calculateActiveLineupStrength, calculateCoachBoost, calculateComebackBoost, calculateEffectiveOverall, coachFrom, createDefaultLineup, getCompatibleSubstitutes, updatePlayerStamina, validateStartingLineup } from './squad'
import { applyMatch, pointsFor } from './tournament'

function squadFor(formation: Formation): GamePlayer[] {
  const required = getRequiredSquadByFormation(formation)
  return (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
}

const squad = squadFor('DIAMOND_3_1')
const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')

function campaign(): GameCampaign {
  const now = new Date().toISOString()
  return { id: 'test-campaign', status: 'active', currentStage: 'Fase de grupos', selectedFormation: 'DIAMOND_3_1', selectedStrategy: 'Equilibrado', selectedDifficulty: 'NORMAL', teamRerollsUsed: 0, playerIds: squad.map((player) => player.id), starterIds, losingStreak: 0, matches: [], groupPoints: 0, createdAt: now, updatedAt: now }
}

describe('dados simplificados', () => {
  it('tem 72 atletas e 8 técnicos somente com os atributos novos', () => {
    expect(players).toHaveLength(80)
    expect(players.filter((player) => player.position !== 'TECNICO')).toHaveLength(72)
    expect(players.filter((player) => player.position === 'TECNICO')).toHaveLength(8)
    const athlete = players.find((player) => player.position === 'ALA')!
    expect(athlete).toMatchObject({ overall: athlete.overallOriginal, stamina: 100 })
    expect(athlete).not.toHaveProperty('attack')
    expect(athlete).not.toHaveProperty('passing')
    const coach = players.find((player) => player.position === 'TECNICO')!
    expect(Object.keys(coach).sort()).toEqual(['id', 'name', 'overall', 'overallOriginal', 'position'].sort())
  })
})

describe('draft por formação', () => {
  it('calcula 10 atletas e 1 técnico para todas as formações', () => {
    const formations: Formation[] = ['DIAMOND_3_1', 'SQUARE_2_2', 'FOUR_ZERO', 'THREE_TWO']
    for (const formation of formations) expect(Object.values(getRequiredSquadByFormation(formation)).reduce((sum, count) => sum + count, 0)).toBe(11)
  })

  it('não oferece posição que o 4x0 não usa', () => {
    const fourZeroSquad = squadFor('FOUR_ZERO')
    expect(fourZeroSquad.some((player) => player.position === 'FIXO' || player.position === 'PIVO')).toBe(false)
    expect(validateSquadForFormation(fourZeroSquad, 'FOUR_ZERO')).toEqual([])
  })

  it('oferece uma equipe completa por rodada e chega ao técnico como última necessidade', () => {
    const team = getDraftTeam('campaign-one', [], 'DIAMOND_3_1')
    expect(team?.name).toBeTruthy()
    expect(new Set(team?.players.map((player) => player.position)).size).toBeGreaterThan(3)
    const athletes = squad.filter((player) => player.position !== 'TECNICO')
    expect(getNextDraftPosition(athletes, 'DIAMOND_3_1')).toBe('TECNICO')
    const pivot = players.find((player) => player.position === 'PIVO')!
    expect(validateDraftPick(pivot, squadFor('SQUARE_2_2'), 'SQUARE_2_2')).toContain('não usa')
  })

  it('sorteia outra equipe elegível sem repetir a atual', () => {
    const available = getAvailableDraftTeams('redraw-team', [], 'DIAMOND_3_1')
    expect(available.length).toBeGreaterThan(1)
    expect(getDraftTeam('redraw-team', [], 'DIAMOND_3_1', 0)?.id).toBe(available[0].id)
    expect(getDraftTeam('redraw-team', [], 'DIAMOND_3_1', 1)?.id).toBe(available[1].id)
    expect(available[0].id).not.toBe(available[1].id)
  })

  it('bloqueia duplicados, posições completas e posições não usadas', () => {
    const goalkeeper = players.find((player) => player.position === 'GOLEIRO')!
    const twoGoalkeepers = players.filter((player) => player.position === 'GOLEIRO').slice(0, 2)
    expect(getDraftPlayerAvailability(goalkeeper, [goalkeeper], 'DIAMOND_3_1')).toMatchObject({ available: false, code: 'already-picked' })
    expect(getDraftPlayerAvailability(players.find((player) => player.position === 'FIXO')!, [], 'FOUR_ZERO')).toMatchObject({ available: false, code: 'unused-position' })
    expect(getDraftPlayerAvailability(players.filter((player) => player.position === 'GOLEIRO')[2], twoGoalkeepers, 'DIAMOND_3_1')).toMatchObject({ available: false, code: 'position-complete' })
  })

  it('completa 10 atletas e 1 técnico escolhendo apenas membros disponíveis das equipes', () => {
    const selected: GamePlayer[] = []
    while (selected.length < 11) {
      const team = getDraftTeam('complete-team-draft', selected, 'DIAMOND_3_1')
      const choice = team?.players.find((player) => getDraftPlayerAvailability(player, selected, 'DIAMOND_3_1').available)
      expect(choice).toBeTruthy()
      selected.push(choice!)
    }
    expect(selected.filter((player) => player.position !== 'TECNICO')).toHaveLength(10)
    expect(selected.filter((player) => player.position === 'TECNICO')).toHaveLength(1)
    expect(validateSquadForFormation(selected, 'DIAMOND_3_1')).toEqual([])
  })
})

describe('overall, stamina e força', () => {
  it('reduz o overall com cansaço sem cair abaixo de 50% nem superar o original', () => {
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 100 })).toBe(80)
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 50 })).toBe(60)
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 0 })).toBe(40)
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 140 })).toBe(80)
  })

  it('perde 2 em quadra, recupera 4 no banco e respeita os limites', () => {
    const athlete = players.find((player): player is GameAthlete => player.position === 'ALA')!
    const tired = updatePlayerStamina(athlete, true)
    const recovered = updatePlayerStamina({ ...athlete, stamina: 50, overall: calculateEffectiveOverall({ overallOriginal: athlete.overallOriginal, stamina: 50 }) }, false)
    expect(tired.stamina).toBe(98)
    expect(tired.overall).toBe(calculateEffectiveOverall(tired))
    expect(recovered.stamina).toBe(54)
    expect(recovered.overall).toBe(calculateEffectiveOverall(recovered))
    expect(recovered.overall).toBeLessThanOrEqual(athlete.overallOriginal)
    expect(updatePlayerStamina({ ...athlete, stamina: 99 }, false).stamina).toBe(100)
    expect(updatePlayerStamina({ ...athlete, stamina: 1 }, true).stamina).toBe(0)
  })

  it('calcula a força somente com o overall dos cinco titulares e boosts', () => {
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const coach = coachFrom(squad)
    const strength = calculateActiveLineupStrength(starters, coach, 'DIAMOND_3_1', 'Equilibrado', 1.06)
    expect(strength.playersAverage).toBe(starters.reduce((sum, player) => sum + player.overall, 0) / 5)
    expect(strength.finalStrength).toBeGreaterThan(strength.playersAverage)
    expect(calculateCoachBoost(coach)).toBeGreaterThan(0.97)
  })

  it('limita a reação do time conforme a sequência de derrotas', () => {
    expect([0, 1, 2, 3, 7].map(calculateComebackBoost)).toEqual([1, 1.05, 1.1, 1.15, 1.15])
  })

  it('aplica dificuldade e confronto tático sem beneficiar o adversário com anti-frustração', () => {
    expect([calculateDifficultyBoost('CASUAL'), calculateDifficultyBoost('NORMAL'), calculateDifficultyBoost('CHALLENGE')]).toEqual([1.08, 1.05, 1])
    expect(calculateDifficultyBoost('NORMAL', 70, 84)).toBeCloseTo(1.38)
    expect(calculateDifficultyBoost('NORMAL', 84, 70)).toBe(1.05)
    expect(calculateTacticalMatchup('Contra-ataque', 'Ofensivo')).toMatchObject({ edge: 0.04, userBoost: 1.02, opponentBoost: 0.98 })
    expect(calculateTacticalMatchup('Ofensivo', 'Contra-ataque')).toMatchObject({ edge: -0.04, userBoost: 0.98, opponentBoost: 1.02 })
    expect(calculateTacticalMatchup('Equilibrado', 'Ofensivo')).toMatchObject({ edge: 0, userBoost: 1, opponentBoost: 1 })
  })

  it('valida titulares e filtra reservas compatíveis', () => {
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const bench = squad.filter((player) => player.position !== 'TECNICO' && !starterIds.includes(player.id))
    expect(validateStartingLineup(starters, bench, 'DIAMOND_3_1')).toEqual([])
    const outgoing = starters.find((player) => player.position === 'ALA')
    expect(getCompatibleSubstitutes(outgoing, bench).every((player) => player.position === 'ALA')).toBe(true)
  })
})

describe('simulação incremental', () => {
  it('atualiza stamina dos dois times antes de gerar o minuto', () => {
    const plan = createMatchSimulation('stamina', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const initial = createInitialMatchState(plan, opponents[0])
    const next = simulateNextMinute(initial, opponents[0])
    expect(next.userPlayers.filter((player) => next.activeIds.includes(player.id)).every((player) => player.stamina === 98)).toBe(true)
    expect(next.userPlayers.filter((player) => next.benchIds.includes(player.id)).every((player) => player.stamina === 100)).toBe(true)
    expect(next.opponentPlayers.filter((player) => next.opponentActiveIds.includes(player.id)).every((player) => player.stamina === 98)).toBe(true)
    expect(next.opponentPlayers.filter((player) => next.opponentBenchIds.includes(player.id)).every((player) => player.stamina === 100)).toBe(true)
    expect([...next.userPlayers, ...next.opponentPlayers].every((player) => player.overall === calculateEffectiveOverall(player))).toBe(true)
  })

  it('recupera os reservas dos dois times e usa apenas o overall atual dos titulares', () => {
    const plan = createMatchSimulation('current-overall', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos', 2)
    const initial = createInitialMatchState(plan, opponents[0])
    const userBenchId = initial.benchIds[0]
    const opponentBenchId = initial.opponentBenchIds[0]
    const prepared = {
      ...initial,
      userPlayers: initial.userPlayers.map((player) => ({ ...player, stamina: userBenchId === player.id ? 50 : player.stamina, overall: userBenchId === player.id ? calculateEffectiveOverall({ overallOriginal: player.overallOriginal, stamina: 50 }) : player.overall })),
      opponentPlayers: initial.opponentPlayers.map((player) => ({ ...player, stamina: opponentBenchId === player.id ? 50 : player.stamina, overall: opponentBenchId === player.id ? calculateEffectiveOverall({ overallOriginal: player.overallOriginal, stamina: 50 }) : player.overall })),
    }
    const next = simulateNextMinute(prepared, opponents[0])
    expect(next.userPlayers.find((player) => player.id === userBenchId)?.stamina).toBe(54)
    expect(next.opponentPlayers.find((player) => player.id === opponentBenchId)?.stamina).toBe(54)

    const strengths = calculateLiveMatchStrengths(next, opponents[0])
    const userActive = next.userPlayers.filter((player) => next.activeIds.includes(player.id))
    const opponentActive = next.opponentPlayers.filter((player) => next.opponentActiveIds.includes(player.id))
    expect(strengths.user.playersAverage).toBe(userActive.reduce((sum, player) => sum + player.overall, 0) / userActive.length)
    expect(strengths.opponent.playersAverage).toBe(opponentActive.reduce((sum, player) => sum + player.overall, 0) / opponentActive.length)
    expect(strengths.user.comebackBoost).toBe(1.1)
    expect(strengths.opponent.comebackBoost).toBe(1)
    expect(strengths.user.experienceBoost).toBeGreaterThanOrEqual(1.05)
    expect(strengths.opponent.experienceBoost).toBe(1)
    expect(strengths.opponent.coachBoost).toBe(calculateCoachBoost(next.opponentCoach))
  })

  it('recupera no banco e a substituição altera imediatamente os ativos', () => {
    const plan = createMatchSimulation('sub', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    let state = createInitialMatchState(plan, opponents[0])
    for (let minute = 0; minute < 10; minute += 1) state = simulateNextMinute(state, opponents[0])
    const outgoing = state.userPlayers.find((player) => starterIds.includes(player.id) && player.position === 'ALA')!
    const incoming = state.userPlayers.find((player) => state.benchIds.includes(player.id) && player.position === 'ALA')!
    const changed = applySubstitution(state, { playerOutId: outgoing.id, playerInId: incoming.id })
    const changedStrength = calculateLiveMatchStrengths(changed, opponents[0])
    const changedActive = changed.userPlayers.filter((player) => changed.activeIds.includes(player.id))
    const afterMinute = simulateNextMinute(changed, opponents[0])
    expect(changedStrength.user.playersAverage).toBe(changedActive.reduce((sum, player) => sum + player.overall, 0) / changedActive.length)
    expect(afterMinute.userPlayers.find((player) => player.id === outgoing.id)?.stamina).toBe(outgoing.stamina + 4)
    expect(afterMinute.userPlayers.find((player) => player.id === incoming.id)?.stamina).toBe(incoming.stamina - 2)
    expect(changed.events.at(-1)).toMatchObject({ type: 'substitution', playerOut: outgoing.name, playerIn: incoming.name })
  })

  it('troca automaticamente um adversário cansado e usa a nova escalação no minuto seguinte', () => {
    const plan = createMatchSimulation('opponent-sub', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const initial = createInitialMatchState(plan, opponents[0])
    const outgoingId = initial.opponentActiveIds.find((id) => initial.opponentPlayers.find((player) => player.id === id)?.position === 'ALA')!
    const incomingId = initial.opponentBenchIds.find((id) => initial.opponentPlayers.find((player) => player.id === id)?.position === 'ALA')!
    const tired = {
      ...initial,
      minute: 5,
      opponentPlayers: initial.opponentPlayers.map((player) => player.id === outgoingId ? { ...player, stamina: 10, overall: calculateEffectiveOverall({ overallOriginal: player.overallOriginal, stamina: 10 }) } : player),
    }
    const changed = simulateNextMinute(tired, opponents[0])
    expect(changed.opponentActiveIds).toContain(incomingId)
    expect(changed.opponentBenchIds).toContain(outgoingId)
    expect(changed.events.at(-1)).toMatchObject({ type: 'substitution', team: 'opponent' })

    const afterMinute = simulateNextMinute(changed, opponents[0])
    expect(afterMinute.opponentPlayers.find((player) => player.id === outgoingId)?.stamina).toBe(12)
    expect(afterMinute.opponentPlayers.find((player) => player.id === incomingId)?.stamina).toBe(98)
    const strengths = calculateLiveMatchStrengths(afterMinute, opponents[0])
    const active = afterMinute.opponentPlayers.filter((player) => afterMinute.opponentActiveIds.includes(player.id))
    expect(strengths.opponent.playersAverage).toBe(active.reduce((sum, player) => sum + player.overall, 0) / active.length)
  })

  it('simula 40 minutos com placar consistente e substituições do adversário', () => {
    const plan = createMatchSimulation('timeline-test', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    let state = createInitialMatchState(plan, opponents[0])
    for (let minute = 0; minute < 40; minute += 1) state = simulateNextMinute(state, opponents[0])
    const result = finalizeMatch(state, opponents[0])
    expect(result.match?.userScore).toBe(state.events.filter((item) => item.type === 'goal' && item.team === 'user').length)
    expect(result.match?.opponentScore).toBe(state.events.filter((item) => item.type === 'goal' && item.team === 'opponent').length)
    expect(state.events.some((item) => item.type === 'substitution' && item.team === 'opponent')).toBe(true)
  })
})

describe('sequência de derrotas', () => {
  const match = (result: 'victory' | 'draw' | 'defeat', stage: 'Fase de grupos' | 'Final' = 'Fase de grupos') => ({ id: crypto.randomUUID(), stage, opponentName: 'Rival', userScore: result === 'victory' ? 1 : 0, opponentScore: result === 'defeat' ? 1 : 0, result, summary: '', manOfTheMatch: 'Craque', createdAt: new Date().toISOString() })

  it('aumenta na derrota, diminui no empate e zera na vitória', () => {
    let state = applyMatch(campaign(), match('defeat'))
    expect(state.losingStreak).toBe(1)
    state = applyMatch(state, match('draw'))
    expect(state.losingStreak).toBe(0)
    state = { ...state, losingStreak: 2 }
    expect(applyMatch(state, match('victory')).losingStreak).toBe(0)
  })

  it('zera obrigatoriamente ao ser campeão', () => {
    const state = { ...campaign(), currentStage: 'Final' as const, losingStreak: 3 }
    const champion = applyMatch(state, match('victory', 'Final'))
    expect(champion.status).toBe('champion')
    expect(champion.losingStreak).toBe(0)
  })

  it('mantém pontuação padrão dos grupos', () => {
    expect([pointsFor('victory'), pointsFor('draw'), pointsFor('defeat')]).toEqual([3, 1, 0])
  })
})
