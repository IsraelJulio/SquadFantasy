import { describe, expect, it } from 'vitest'
import { draftTeams } from '../data/draftTeams'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import type { DraftTeam, Formation, GameAthlete, GameCampaign, GamePlayer, MatchTimelineEvent } from '../types'
import { calculateDifficultyBoost, calculateTacticalMatchup } from './balance'
import { draftTeamCoversRemainingPositions, draftTeamHasNeededDraftOption, getAvailableDraftTeams, getDraftPlayerAvailability, getDraftTeam, getNextDraftPosition, validateDraftPick, validateSquadForFormation } from './draft'
import { getRequiredSquadByFormation } from './formations'
import { createGroupStage } from './groupStage'
import { applySubstitution, calculateLiveMatchStrengths, createInitialMatchState, createMatchSimulation, finalizeMatch, simulateNextMinute } from './simulation'
import { calculateActiveLineupStrength, calculateCoachBoost, calculateComebackBoost, calculateEffectiveOverall, coachFrom, createDefaultLineup, getCompatibleSubstitutes, updatePlayerStamina, validateStartingLineup } from './squad'
import { BENCH_STAMINA_RECOVERY_PER_MINUTE, calculateStaminaLossPerMinute } from './staminaRules'
import { applyMatch, pointsFor } from './tournament'

function squadFor(formation: Formation): GamePlayer[] {
  const required = getRequiredSquadByFormation(formation)
  return (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
}

const squad = squadFor('DIAMOND_3_1')
const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')

function goalEvent(minute: number, team: 'user' | 'opponent', playerName: string, userScore: number, opponentScore: number): MatchTimelineEvent {
  return {
    id: crypto.randomUUID(),
    minute,
    period: minute <= 20 ? 1 : 2,
    type: 'goal',
    team,
    playerName,
    description: `${playerName} marcou.`,
    userScore,
    opponentScore,
  }
}

function campaign(): GameCampaign {
  const now = new Date().toISOString()
  return { id: 'test-campaign', status: 'active', currentStage: 'Fase de grupos', selectedFormation: 'DIAMOND_3_1', selectedStrategy: 'Equilibrado', selectedDifficulty: 'NORMAL', teamRerollsUsed: 0, ...createGroupStage('test-campaign'), playerIds: squad.map((player) => player.id), starterIds, losingStreak: 0, matches: [], groupPoints: 0, createdAt: now, updatedAt: now }
}

describe('dados simplificados', () => {
  it('tem 72 atletas e 8 técnicos somente com os atributos novos', () => {
    expect(players.length).toBeGreaterThan(0)
    expect(players.filter((player) => player.position !== 'TECNICO').length).toBeGreaterThan(0)
    expect(players.filter((player) => player.position === 'TECNICO').length).toBeGreaterThan(0)
    const athlete = players.find((player): player is GameAthlete => player.position === 'ALA')!
    expect(athlete).toMatchObject({ role: 'PLAYER', overall: athlete.overallOriginal, stamina: 100 })
    expect(athlete.fatigueFactor).toBeGreaterThanOrEqual(0.6)
    expect(athlete.fatigueFactor).toBeLessThanOrEqual(1.8)
    expect(athlete).not.toHaveProperty('attack')
    expect(athlete).not.toHaveProperty('passing')
    const coach = players.find((player) => player.position === 'TECNICO')!
    expect(coach).toMatchObject({ role: 'COACH', position: 'TECNICO', preferredStrategy: expect.any(String) })
    expect(coach).not.toHaveProperty('stamina')
    expect(coach).not.toHaveProperty('fatigueFactor')
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

  it('oferece uma equipe com opcao valida por rodada e chega ao técnico como última necessidade', () => {
    const team = getDraftTeam('campaign-one', [], 'DIAMOND_3_1')
    expect(team?.name).toBeTruthy()
    expect(team?.players.some((player) => getDraftPlayerAvailability(player, [], 'DIAMOND_3_1').available)).toBe(true)
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

  it('diferencia equipes completas de equipes parciais com opcao util', () => {
    const goalkeeper = players.find((player) => player.position === 'GOLEIRO')!
    const fixo = players.find((player) => player.position === 'FIXO')!
    const ala = players.find((player) => player.position === 'ALA')!
    const pivot = players.find((player) => player.position === 'PIVO')!
    const coach = players.find((player) => player.position === 'TECNICO')!
    const completeTeam: DraftTeam = { id: 'complete', name: 'Completo', country: 'Teste', players: [goalkeeper, fixo, ala, pivot, coach] }
    const noPlayersTeam: DraftTeam = { id: 'empty', name: 'Vazio', country: 'Teste', players: [coach], rosterNotes: ['Sem jogadores'] }
    const noCoachTeam: DraftTeam = { id: 'no-coach', name: 'Sem técnico', country: 'Teste', players: [goalkeeper, fixo, ala, pivot], rosterNotes: ['Sem técnico'] }
    const noPivotTeam: DraftTeam = { id: 'no-pivot', name: 'Sem pivo', country: 'Teste', players: [goalkeeper, fixo, ala, coach] }
    const needsOnlyCoach = squad.filter((player) => player.position !== 'TECNICO')

    expect(draftTeamCoversRemainingPositions(completeTeam, [], 'DIAMOND_3_1')).toBe(true)
    expect(draftTeamCoversRemainingPositions(noPlayersTeam, [], 'DIAMOND_3_1')).toBe(false)
    expect(draftTeamCoversRemainingPositions(noCoachTeam, needsOnlyCoach, 'DIAMOND_3_1')).toBe(false)
    expect(draftTeamCoversRemainingPositions(noPivotTeam, [], 'DIAMOND_3_1')).toBe(false)
    expect(draftTeamHasNeededDraftOption(noPivotTeam, [], 'DIAMOND_3_1')).toBe(true)
    expect(draftTeamHasNeededDraftOption(noPlayersTeam, [], 'DIAMOND_3_1')).toBe(false)
  })

  it('sorteia entre equipes validas sem priorizar o menor elenco', () => {
    const available = getAvailableDraftTeams('focused-draft-team', [], 'DIAMOND_3_1')

    expect(available.length).toBeGreaterThan(1)
    expect(available[0].id).toBe('62')
    expect(available[0].players.filter((player) => player.position !== 'TECNICO')).toHaveLength(12)
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
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 50 })).toBe(71)
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 0 })).toBe(62)
    expect(calculateEffectiveOverall({ overallOriginal: 80, stamina: 140 })).toBe(80)
    expect(calculateEffectiveOverall({ overallOriginal: 35, stamina: 0, fatigueFactor: 1.8 })).toBe(30)
  })

  it('perde 2 em quadra, recupera 4 no banco e respeita os limites', () => {
    const athlete = players.find((player): player is GameAthlete => player.position === 'ALA')!
    const tired = updatePlayerStamina(athlete, true)
    const recovered = updatePlayerStamina({ ...athlete, stamina: 50, overall: calculateEffectiveOverall({ overallOriginal: athlete.overallOriginal, stamina: 50 }) }, false)
    expect(tired.stamina).toBe(Math.round(100 - calculateStaminaLossPerMinute(athlete, 0, 'Equilibrado')))
    expect(tired.overall).toBe(calculateEffectiveOverall(tired))
    expect(recovered.stamina).toBe(Math.round(50 + BENCH_STAMINA_RECOVERY_PER_MINUTE))
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
    expect(next.userPlayers.filter((player) => next.activeIds.includes(player.id)).every((player) => player.stamina < 100)).toBe(true)
    expect(next.userPlayers.filter((player) => next.benchIds.includes(player.id)).every((player) => player.stamina === 100)).toBe(true)
    expect(next.opponentPlayers.filter((player) => next.opponentActiveIds.includes(player.id)).every((player) => player.stamina < 100)).toBe(true)
    expect(next.opponentPlayers.filter((player) => next.opponentBenchIds.includes(player.id)).every((player) => player.stamina === 100)).toBe(true)
    expect([...next.userPlayers, ...next.opponentPlayers].every((player) => player.overall === calculateEffectiveOverall(player))).toBe(true)
  })

  it('usa equipes do draft como adversarios e escala jogadores desse elenco', () => {
    const opponent = opponents.find((item) => draftTeams.some((team) => team.id === item.id))!
    const draftTeam = draftTeams.find((team) => team.id === opponent.id)!
    const plan = createMatchSimulation('draft-opponent', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const initial = createInitialMatchState(plan, opponent)
    const draftPlayerNames = new Set(draftTeam.players.map((player) => player.name))

    expect(opponent.teamName).toBe(draftTeam.name)
    expect(initial.opponentPlayers).toHaveLength(draftTeam.players.filter((player) => player.position !== 'TECNICO').length)
    expect(initial.opponentPlayers.every((player) => draftPlayerNames.has(player.name))).toBe(true)
    expect(initial.opponentActiveIds).toHaveLength(5)
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
    expect(next.userPlayers.find((player) => player.id === userBenchId)?.stamina).toBe(Math.round(50 + BENCH_STAMINA_RECOVERY_PER_MINUTE))
    expect(next.opponentPlayers.find((player) => player.id === opponentBenchId)?.stamina).toBe(Math.round(50 + BENCH_STAMINA_RECOVERY_PER_MINUTE))

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
    expect(afterMinute.userPlayers.find((player) => player.id === outgoing.id)?.stamina).toBe(Math.min(100, Math.round(outgoing.stamina + BENCH_STAMINA_RECOVERY_PER_MINUTE)))
    expect(afterMinute.userPlayers.find((player) => player.id === incoming.id)?.stamina).toBeLessThan(incoming.stamina)
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
    const outgoingAfterSubstitution = changed.opponentPlayers.find((player) => player.id === outgoingId)!
    expect(afterMinute.opponentPlayers.find((player) => player.id === outgoingId)?.stamina).toBe(Math.min(100, Math.round(outgoingAfterSubstitution.stamina + BENCH_STAMINA_RECOVERY_PER_MINUTE)))
    expect(afterMinute.opponentPlayers.find((player) => player.id === incomingId)?.stamina).toBeLessThan(100)
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

  it('mantem maior overall como destaque somente no 0 a 0', () => {
    const plan = createMatchSimulation('motm-zero-zero', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const state = createInitialMatchState(plan, opponents[0])
    const bestByOverall = state.userPlayers
      .filter((player) => state.activeIds.includes(player.id))
      .sort((a, b) => b.overall - a.overall)[0]

    expect(finalizeMatch(state, opponents[0]).match?.manOfTheMatch).toBe(bestByOverall.name)
  })

  it('sorteia o destaque entre os artilheiros da partida quando ha gols', () => {
    const plan = createMatchSimulation('motm-top-scorers', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
    const initial = createInitialMatchState(plan, opponents[0])
    const userLeader = initial.userPlayers.find((player) => initial.activeIds.includes(player.id))!.name
    const opponentLeader = initial.opponentPlayers.find((player) => initial.opponentActiveIds.includes(player.id))!.name
    const secondaryScorer = initial.userPlayers.find((player) => initial.activeIds.includes(player.id) && player.name !== userLeader)!.name
    const state = {
      ...initial,
      userScore: 3,
      opponentScore: 2,
      events: [
        goalEvent(3, 'user', userLeader, 1, 0),
        goalEvent(7, 'opponent', opponentLeader, 1, 1),
        goalEvent(12, 'user', secondaryScorer, 2, 1),
        goalEvent(18, 'user', userLeader, 3, 1),
        goalEvent(34, 'opponent', opponentLeader, 3, 2),
      ],
    }

    const manOfTheMatch = finalizeMatch(state, opponents[0]).match?.manOfTheMatch
    expect([userLeader, opponentLeader]).toContain(manOfTheMatch)
    expect(manOfTheMatch).not.toBe(secondaryScorer)
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
