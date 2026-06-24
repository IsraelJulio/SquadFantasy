import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { draftTeams } from '../data/draftTeams'
import { DraftTeamCard } from './DraftTeamCard'

describe('DraftTeamCard', () => {
  it('mantém o overall oculto e oferece seleção por seta, duplo clique e Enter', () => {
    const onSelect = vi.fn()
    const team = draftTeams[0]
    const player = team.players[0]
    render(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" onSelect={onSelect} />)
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
    render(<DraftTeamCard team={team} selected={[]} formation="DIAMOND_3_1" onSelect={onSelect} />)
    const playerButton = screen.getByRole('button', { name: new RegExp(`^${player.name},`) })

    fireEvent.pointerUp(playerButton, { pointerType: 'touch' })
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.pointerUp(playerButton, { pointerType: 'touch' })
    expect(onSelect).toHaveBeenCalledWith(player)
  })
})
