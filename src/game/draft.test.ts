import { describe, expect, it } from 'vitest'
import type { DraftTeam, FutsalPosition, GamePlayer } from '../types'
import { createDraftPickHistoryItem, generateDraftOptions, getDraftPlayerAvailability, getDraftTeam, updateRecentTeamIds } from './draft'
import { calculateDraftTeamGrade } from './draftSummary'

function player(id: string, position: FutsalPosition, overall = 80): GamePlayer {
  const defaults = { carta: '', perfil: '', campeao: false }
  if (position === 'TECNICO') return { id, name: `Tecnico ${id}`, position, overall, overallOriginal: overall, ...defaults }
  return { id, name: `Atleta ${id}`, position, overall, overallOriginal: overall, stamina: 100, fatigueFactor: 0.8, ...defaults }
}

function team(id: string, players: GamePlayer[]): DraftTeam {
  return { id, name: `Time ${id}`, country: 'Teste', players }
}

describe('generateDraftOptions', () => {
  it('evita repetir time na mesma rodada quando possivel', () => {
    const options = generateDraftOptions({
      availableTeams: [team('a', [player('a1', 'ALA')]), team('b', [player('b1', 'ALA')]), team('c', [player('c1', 'ALA')])],
      selectedPlayerIds: [],
      requiredPositions: ['ALA'],
      recentTeamIds: [],
      optionsCount: 3,
    })

    expect(new Set(options.map((option) => option.teamId)).size).toBe(3)
  })

  it('evita times recentes quando possivel', () => {
    const options = generateDraftOptions({
      availableTeams: [team('recent', [player('r1', 'ALA')]), team('fresh', [player('f1', 'ALA')])],
      selectedPlayerIds: [],
      requiredPositions: ['ALA'],
      recentTeamIds: ['recent'],
      optionsCount: 1,
    })

    expect(options[0].teamId).toBe('fresh')
  })

  it('usa fallback com poucos times sem duplicar jogador', () => {
    const options = generateDraftOptions({
      availableTeams: [team('solo', [player('s1', 'ALA'), player('s2', 'ALA')])],
      selectedPlayerIds: [],
      requiredPositions: ['ALA'],
      recentTeamIds: ['solo'],
      optionsCount: 2,
    })

    expect(options.map((option) => option.teamId)).toEqual(['solo', 'solo'])
    expect(new Set(options.map((option) => option.player.id)).size).toBe(2)
  })

  it('nao retorna jogador ja escolhido e respeita posicoes necessarias', () => {
    const options = generateDraftOptions({
      availableTeams: [team('a', [player('picked', 'ALA'), player('fixo', 'FIXO')]), team('b', [player('pivo', 'PIVO')])],
      selectedPlayerIds: ['picked'],
      requiredPositions: ['FIXO'],
      recentTeamIds: [],
      optionsCount: 2,
    })

    expect(options).toHaveLength(1)
    expect(options[0].player.id).toBe('fixo')
    expect(options[0].player.position).toBe('FIXO')
  })
})

describe('updateRecentTeamIds', () => {
  it('mantem apenas os ultimos times e adiciona novos ids', () => {
    expect(updateRecentTeamIds(['a', 'b', 'c', 'd'], ['e', 'f'])).toEqual(['b', 'c', 'd', 'e', 'f'])
  })
})

describe('pickHistory', () => {
  it('registra escolhas com pickNumber correto e inclui tecnico', () => {
    const selectedTeam = team('origin', [player('p1', 'ALA'), player('coach', 'TECNICO')])
    const history = [
      createDraftPickHistoryItem({ pickNumber: 1, player: selectedTeam.players[0], team: selectedTeam, selectedAt: '2026-06-27T12:00:00.000Z' }),
      ...Array.from({ length: 9 }, (_, index) => createDraftPickHistoryItem({ pickNumber: index + 2, player: player(`p${index + 2}`, 'ALA'), team: selectedTeam, selectedAt: '2026-06-27T12:00:00.000Z' })),
      createDraftPickHistoryItem({ pickNumber: 11, player: selectedTeam.players[1], team: selectedTeam, selectedAt: '2026-06-27T12:00:00.000Z' }),
    ]

    expect(history).toHaveLength(11)
    expect(history.map((item) => item.pickNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(history.at(-1)).toMatchObject({ role: 'COACH', position: 'TECNICO', teamId: 'origin' })
  })
})

describe('draft com memoria de times', () => {
  it('mantem o sorteio principal sem priorizar times recentes', () => {
    const first = getDraftTeam('memory-campaign', [], 'DIAMOND_3_1')
    const next = first ? getDraftTeam('memory-campaign', [], 'DIAMOND_3_1', 0, [first.id]) : null

    expect(first).toBeTruthy()
    expect(next).toBeTruthy()
    expect(next?.id).toBe(first?.id)
  })

  it('continua validando jogadores duplicados', () => {
    const selected = player('same', 'ALA')
    expect(getDraftPlayerAvailability(selected, [selected], 'DIAMOND_3_1')).toMatchObject({ available: false, code: 'already-picked' })
  })
})

describe('calculateDraftTeamGrade', () => {
  it('retorna S para elenco muito forte e score entre 0 e 100', () => {
    const players = [
      player('g1', 'GOLEIRO', 96), player('g2', 'GOLEIRO', 94),
      player('f1', 'FIXO', 95), player('f2', 'FIXO', 94),
      player('a1', 'ALA', 97), player('a2', 'ALA', 96), player('a3', 'ALA', 95), player('a4', 'ALA', 94),
      player('p1', 'PIVO', 96), player('p2', 'PIVO', 94),
    ]
    const grade = calculateDraftTeamGrade({ players, coach: player('coach', 'TECNICO', 96) as never, formationKey: 'DIAMOND_3_1' })

    expect(grade.grade).toBe('S')
    expect(grade.score).toBeGreaterThanOrEqual(0)
    expect(grade.score).toBeLessThanOrEqual(100)
  })

  it('retorna F para elenco muito fraco considerando jogadores, tecnico e formacao', () => {
    const players = [
      player('g1', 'GOLEIRO', 50), player('g2', 'GOLEIRO', 50),
      player('f1', 'FIXO', 50), player('f2', 'FIXO', 50),
      player('a1', 'ALA', 50), player('a2', 'ALA', 50), player('a3', 'ALA', 50), player('a4', 'ALA', 50),
      player('p1', 'PIVO', 50), player('p2', 'PIVO', 50),
    ]
    const grade = calculateDraftTeamGrade({ players, coach: player('coach', 'TECNICO', 50) as never, formationKey: 'DIAMOND_3_1' })

    expect(grade.grade).toBe('F')
    expect(grade.score).toBeGreaterThanOrEqual(0)
    expect(grade.score).toBeLessThanOrEqual(100)
  })
})
