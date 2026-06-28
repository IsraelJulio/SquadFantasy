import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DraftPickHistoryItem, FutsalPosition, GamePlayer } from '../types'
import { DraftSummaryScreen } from './DraftSummaryScreen'

afterEach(cleanup)

function player(id: string, name: string, position: FutsalPosition, overall = 82): GamePlayer {
  const defaults = { carta: '', perfil: '', campeao: false }
  if (position === 'TECNICO') return { id, name, position, overall, overallOriginal: overall, ...defaults }
  return { id, name, position, overall, overallOriginal: overall, stamina: 100, fatigueFactor: 0.8, ...defaults }
}

const squad: GamePlayer[] = [
  player('g1', 'Goleiro Um', 'GOLEIRO', 85),
  player('g2', 'Goleiro Dois', 'GOLEIRO', 80),
  player('f1', 'Fixo Um', 'FIXO', 84),
  player('f2', 'Fixo Dois', 'FIXO', 79),
  player('a1', 'Ala Um', 'ALA', 88),
  player('a2', 'Ala Dois', 'ALA', 86),
  player('a3', 'Ala Tres', 'ALA', 81),
  player('a4', 'Ala Quatro', 'ALA', 78),
  player('p1', 'Pivo Um', 'PIVO', 83),
  player('p2', 'Pivo Dois', 'PIVO', 77),
  player('c1', 'Tecnico Mestre', 'TECNICO', 84),
]

const history: DraftPickHistoryItem[] = squad.map((item, index) => ({
  pickNumber: index + 1,
  playerId: item.id,
  playerName: item.name,
  position: item.position,
  role: item.position === 'TECNICO' ? 'COACH' : 'PLAYER',
  teamId: `team-${index}`,
  teamName: `Origem ${index + 1}`,
  overallOriginal: item.overallOriginal,
  overall: item.overall,
  selectedAt: '2026-06-27T12:00:00.000Z',
}))

describe('DraftSummaryScreen', () => {
  it('renderiza 11 escolhas, tecnico separado e rank do time', () => {
    render(<DraftSummaryScreen squad={squad} formation="DIAMOND_3_1" pickHistory={history} onContinue={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /Resumo do Draft/i })).toBeInTheDocument()
    const orderPanel = screen.getByText('ORDEM DAS ESCOLHAS').closest('article')!
    expect(within(orderPanel).getAllByRole('listitem')).toHaveLength(11)
    expect(screen.getByText('Tecnico contratado')).toBeInTheDocument()
    expect(screen.getAllByText('Tecnico Mestre').length).toBeGreaterThan(0)
    expect(screen.getByText('Rank do elenco')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled()
  })

  it('mostra overall no Casual', () => {
    render(<DraftSummaryScreen squad={squad} formation="DIAMOND_3_1" pickHistory={history} onContinue={vi.fn()} />)

    expect(screen.getAllByText(/85 OVR|84 OVR/).length).toBeGreaterThan(0)
    expect(screen.queryByText('OVR oculto')).not.toBeInTheDocument()
  })

  it('mostra overall no resumo mesmo fora do Casual', () => {
    render(<DraftSummaryScreen squad={squad} formation="DIAMOND_3_1" pickHistory={history} onContinue={vi.fn()} />)

    expect(screen.queryByText('OVR oculto')).not.toBeInTheDocument()
    expect(screen.getAllByText('85 OVR').length).toBeGreaterThan(0)
    expect(screen.getAllByText('84 OVR').length).toBeGreaterThan(0)
    expect(screen.getAllByText('83 OVR').length).toBeGreaterThan(0)
  })

  it('nao permite continuar com draft incompleto', () => {
    render(<DraftSummaryScreen squad={squad.slice(0, 10)} formation="DIAMOND_3_1" pickHistory={history.slice(0, 10)} onContinue={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })
})
