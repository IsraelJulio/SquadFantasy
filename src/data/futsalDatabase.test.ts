import { describe, expect, it } from 'vitest'
import { draftTeams } from './draftTeams'
import { getAvailableDraftTeams, getDraftTeam } from '../game/draft'
import { createDefaultLineup, getCompatibleSubstitutes, validateStartingLineup } from '../game/squad'
import { ATHLETE_POSITIONS, FUTSAL_FORMATIONS } from '../game/formations'
import type { Formation } from '../types'
import type { FutsalDatabaseJson } from './futsalDatabase'
import {
  buildDraftTeamFromJson,
  buildOpponentFromJson,
  futsalDatabase,
  futsalDatabaseValidationErrors,
  getAllCoaches,
  getAllPlayers,
  getAllTeams,
  getCoachByTeamId,
  getPlayersByTeamId,
  getTeamById,
  normalizeGamePlayer,
  validateFutsalDatabase,
} from './futsalDatabase'

describe('futsalDatabase', () => {
  function teamWithLineupCoverage(formation: Formation) {
    const needs = FUTSAL_FORMATIONS[formation].starters
    return draftTeams.find((team) =>
      team.players.some((player) => player.position === 'TECNICO')
      && ATHLETE_POSITIONS.every((position) => team.players.filter((player) => player.position === position).length >= needs[position]),
    )
  }

  it('mantem o JSON central valido mesmo com elencos parciais', () => {
    expect(futsalDatabaseValidationErrors).toEqual([])
    expect(getAllTeams().length).toBeGreaterThan(0)
    expect(getAllPlayers()).toHaveLength(futsalDatabase.players.length)
    expect(getAllCoaches()).toHaveLength(futsalDatabase.coaches.length)

    expect(getAllTeams().some((team) => team.playerIds.length === 0)).toBe(true)
    expect(getAllTeams().some((team) => !getCoachByTeamId(team.id))).toBe(true)
    expect(draftTeams.every((team) => team.players.some((player) => player.position !== 'TECNICO'))).toBe(true)
  })

  it('retorna times, atletas e tecnico por id', () => {
    const team = getAllTeams()[0]
    const playerTeam = getAllTeams().find((item) => getPlayersByTeamId(item.id).length > 0)!
    const coachTeam = getAllTeams().find((item) => getCoachByTeamId(item.id))!

    expect(getTeamById(team.id)).toMatchObject({ id: team.id, country: team.country, referenceYear: team.referenceYear })
    expect(getPlayersByTeamId(playerTeam.id).every((player) => player.role === 'PLAYER')).toBe(true)
    expect(getCoachByTeamId(coachTeam.id)).toMatchObject({ teamId: coachTeam.id, role: 'COACH', position: 'TECNICO' })
    expect(getTeamById('time-inexistente')).toBeUndefined()
  })

  it('mantem os campos visuais e de campeao em atletas e tecnicos', () => {
    const players = getAllPlayers()
    const coaches = getAllCoaches()

    expect(players.every((player) => player.carta === '' && player.perfil === '' && player.campeao === false)).toBe(true)
    expect(coaches.every((coach) => coach.carta === '' && coach.perfil === '' && coach.campeao === false)).toBe(true)
  })

  it('normaliza dados antigos sem campos carta, perfil e campeao', () => {
    expect(normalizeGamePlayer({
      id: 'legacy',
      name: 'Legado',
      position: 'ALA',
      overallOriginal: 70,
      overall: 70,
      stamina: 100,
    })).toMatchObject({ carta: '', perfil: '', campeao: false })
  })

  it('monta DraftTeam e Opponent a partir do JSON', () => {
    const sourceTeam = getAllTeams().find((team) => team.playerIds.length > 0 && getCoachByTeamId(team.id))!
    const emptyTeam = getAllTeams().find((team) => team.playerIds.length === 0)!
    const draftTeam = buildDraftTeamFromJson(sourceTeam.id)
    const opponent = buildOpponentFromJson(sourceTeam.id)
    const emptyDraftTeam = buildDraftTeamFromJson(emptyTeam.id)

    expect(draftTeam).toMatchObject({ id: sourceTeam.id, name: sourceTeam.name, country: sourceTeam.country, referenceYear: sourceTeam.referenceYear })
    expect(draftTeam.players.filter((player) => player.position !== 'TECNICO').length).toBeGreaterThan(0)
    expect(draftTeam.players.filter((player) => player.position === 'TECNICO')).toHaveLength(1)
    expect(opponent).toMatchObject({ id: draftTeam.id, name: sourceTeam.country, country: sourceTeam.country, teamName: draftTeam.name, year: sourceTeam.referenceYear, strategy: sourceTeam.defaultStrategy })
    expect(opponent.players).toHaveLength(draftTeam.players.length)
    expect(emptyDraftTeam.rosterNotes).toContain('Sem jogadores')
  })

  it('sorteia equipes a partir da lista do JSON', () => {
    const jsonTeamIds = new Set(getAllTeams().map((team) => team.id))
    const available = getAvailableDraftTeams('json-draft', [], 'DIAMOND_3_1')
    const drawn = getDraftTeam('json-draft', [], 'DIAMOND_3_1')

    expect(available.length).toBeGreaterThan(1)
    expect(available.every((team) => jsonTeamIds.has(team.id))).toBe(true)
    expect(drawn?.id).toBe(available[0].id)
  })

  it('nao coloca tecnico como titular, reserva ou substituto', () => {
    const team = teamWithLineupCoverage('DIAMOND_3_1')!
    const starterIds = createDefaultLineup(team.players, 'DIAMOND_3_1')
    const starters = team.players.filter((player) => starterIds.includes(player.id))
    const bench = team.players.filter((player) => player.position !== 'TECNICO' && !starterIds.includes(player.id))
    const coach = team.players.find((player) => player.position === 'TECNICO')

    expect(starterIds).not.toContain(coach?.id)
    expect(bench).not.toContain(coach)
    expect(validateStartingLineup(starters, bench, 'DIAMOND_3_1')).toEqual([])
    expect(getCompatibleSubstitutes(coach, bench)).toEqual([])
  })

  it('retorna erros quando a base quebra regras obrigatorias', () => {
    const invalid: FutsalDatabaseJson = {
      ...futsalDatabase,
      players: [{ ...futsalDatabase.players[0], stamina: 90, carta: 10 as never, perfil: false as never, campeao: 'sim' as never }, ...futsalDatabase.players.slice(1)],
      teams: [{ ...futsalDatabase.teams[0], playerIds: ['atleta-inexistente'] }, ...futsalDatabase.teams.slice(1)],
    }

    expect(validateFutsalDatabase(invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('stamina 100'),
      expect.stringContaining('carta string'),
      expect.stringContaining('perfil string'),
      expect.stringContaining('campeao boolean'),
      expect.stringContaining('aponta para atleta inexistente'),
    ]))
  })
})
