import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { draftTeams } from '../data/draftTeams'
import type { DraftTeam, GamePlayer } from '../types'
import { DraftTeamCard } from './DraftTeamCard'

describe('DraftTeamCard', () => {
  it('mantém o overall oculto e oferece seleção por seta, duplo clique e Enter', () => {
    const onSelect = vi.fn()
    const team = draftTeams[0]
    const player = team.players[0]
    render(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" showOverall={false} onSelect={onSelect} />)
    const playerButton = screen.getByRole('button', { name: new RegExp(`^${player.name},`) })

    expect(playerButton).not.toHaveAccessibleName(/overall/i)
    expect(screen.queryByText('OVR')).not.toBeInTheDocument()
    fireEvent.click(playerButton)
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.doubleClick(playerButton)
    expect(onSelect).toHaveBeenLastCalledWith(player)

    onSelect.mockClear()
    fireEvent.keyDown(playerButton, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(player)

    onSelect.mockClear()
    fireEvent.click(screen.getByRole('button', { name: `Selecionar ${player.name}` }))
    expect(onSelect).toHaveBeenLastCalledWith(player)
  })

  it('confirma no segundo toque em telas touch', () => {
    const onSelect = vi.fn()
    const team = draftTeams[1]
    const player = team.players[0]
    render(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" showOverall={false} onSelect={onSelect} />)
    const playerButton = screen.getByRole('button', { name: new RegExp(`^${player.name},`) })

    fireEvent.pointerUp(playerButton, { pointerType: 'touch' })
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.pointerUp(playerButton, { pointerType: 'touch' })
    expect(onSelect).toHaveBeenCalledWith(player)
  })

  it('mostra o overall somente quando a dificuldade permite', () => {
    const team = draftTeams[0]
    const player = team.players[0]
    const { rerender } = render(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" showOverall onSelect={vi.fn()} />)
    expect(screen.getAllByText(`${player.overall} OVR`).length).toBeGreaterThan(0)

    rerender(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" showOverall={false} onSelect={vi.fn()} />)
    expect(screen.queryByText(`${player.overall} OVR`)).not.toBeInTheDocument()
  })

  it('ordena os jogadores por posicao durante o draft', () => {
    const makePlayer = (id: string, name: string, position: GamePlayer['position']): GamePlayer => {
      const defaults = { carta: '', perfil: '', campeao: false }
      if (position === 'TECNICO') return { id, name, position: 'TECNICO', overall: 80, overallOriginal: 80, ...defaults }
      return { id, name, position, overall: 80, overallOriginal: 80, stamina: 100, ...defaults }
    }
    const team: DraftTeam = {
      id: 'unordered-team',
      name: 'Time fora de ordem',
      country: 'Brasil',
      players: [
        makePlayer('pivo', 'Pivo Teste', 'PIVO'),
        makePlayer('coach', 'Tecnico Teste', 'TECNICO'),
        makePlayer('ala', 'Ala Teste', 'ALA'),
        makePlayer('goleiro', 'Goleiro Teste', 'GOLEIRO'),
        makePlayer('fixo', 'Fixo Teste', 'FIXO'),
      ],
    }

    render(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" showOverall={false} onSelect={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: /Teste, / }).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Goleiro Teste, GOLEIRO',
      'Fixo Teste, FIXO',
      'Ala Teste, ALA',
      'Pivo Teste, PIVO',
      'Tecnico Teste, TECNICO',
    ])
  })
})
