import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import { getRequiredSquadByFormation } from '../game/formations'
import { createGroupStage } from '../game/groupStage'
import { createMatchSimulation } from '../game/simulation'
import { createDefaultLineup } from '../game/squad'
import type { GameCampaign, GamePlayer } from '../types'
import { MatchSimulationScreen } from './MatchSimulationScreen'

function createMatch() {
  const required = getRequiredSquadByFormation('DIAMOND_3_1')
  const squad = (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
  const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')
  const plan = createMatchSimulation('controls-test', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
  const now = new Date().toISOString()
  const campaign: GameCampaign = {
    id: 'controls-test', status: 'active', currentStage: 'Fase de grupos', selectedFormation: 'DIAMOND_3_1', selectedStrategy: 'Equilibrado', selectedDifficulty: 'NORMAL', teamRerollsUsed: 0,
    ...createGroupStage('controls-test'),
    playerIds: squad.map((player) => player.id), starterIds, losingStreak: 0, matches: [], groupPoints: 0, createdAt: now, updatedAt: now,
  }
  return { campaign, plan }
}

describe('MatchSimulationScreen — controles por estado', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('mostra somente as ações válidas antes, durante e depois da partida', () => {
    const { campaign, plan } = createMatch()
    render(<MatchSimulationScreen campaign={campaign} opponent={opponents[0]} plan={plan} onFinished={vi.fn()} onContinue={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fazer substituição' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acelerar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pular para o final' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fazer substituição' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acelerar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pular para o final' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pular para o final' }))
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fazer substituição' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acelerar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pular para o final' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /Fim de jogo/ })).toBeInTheDocument()
    const scorers = screen.getByLabelText('Marcadores da partida')
    expect(within(scorers).getByText(/Gols do Esquadrão Imortal/)).toBeInTheDocument()
    expect(within(scorers).getByText(new RegExp(`Gols do ${opponents[0].name}`))).toBeInTheDocument()
    expect(within(scorers).getAllByRole('listitem').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Jogar próxima partida/ })).toBeInTheDocument()
  })
  it('mantem stamina fora da tela principal e mostra somente no modal de substituicao', () => {
    const { campaign, plan } = createMatch()
    render(<MatchSimulationScreen campaign={campaign} opponent={opponents[0]} plan={plan} onFinished={vi.fn()} onContinue={vi.fn()} />)

    expect(screen.queryByLabelText('Estamina dos jogadores')).not.toBeInTheDocument()
    expect(screen.queryByText(/Estamina:/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))
    expect(screen.queryByLabelText('Estamina dos jogadores')).not.toBeInTheDocument()
    expect(screen.queryByText(/Estamina:/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fazer substituição' }))
    expect(screen.getByRole('dialog', { name: /Fazer substituição/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Estamina:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Descansado').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/OVR atual/).length).toBeGreaterThan(0)
    expect(screen.queryByText('OVR oculto')).not.toBeInTheDocument()

    const firstOutgoing = plan.squad.find((player) => player.position !== 'TECNICO' && plan.starterIds.includes(player.id) && player.position === 'GOLEIRO')!
    const firstIncoming = plan.squad.find((player) => player.position === firstOutgoing.position && !plan.starterIds.includes(player.id))!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(firstOutgoing.name) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(firstIncoming.name) }))

    expect(screen.getByRole('dialog', { name: /Fazer substituição/ })).toBeInTheDocument()
    expect(screen.getByText(`Troca realizada: ${firstOutgoing.name} saiu do time titular e ${firstIncoming.name} entrou.`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Concluir 1 troca e voltar ao jogo/ })).toBeInTheDocument()

    const secondOutgoing = plan.squad.find((player) => player.position !== 'TECNICO' && plan.starterIds.includes(player.id) && player.position === 'ALA')!
    const secondIncoming = plan.squad.find((player) => player.position === secondOutgoing.position && !plan.starterIds.includes(player.id))!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(secondOutgoing.name) }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(secondIncoming.name) }))

    expect(screen.getByRole('dialog', { name: /Fazer substituição/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Concluir 2 trocas e voltar ao jogo/ }))

    expect(screen.queryByRole('dialog', { name: /Fazer substituição/ })).not.toBeInTheDocument()
    expect(screen.getAllByText((_, element) => Boolean(element?.textContent?.includes(`saiu ${firstOutgoing.name}, entrou ${firstIncoming.name}`))).length).toBeGreaterThan(0)
    expect(screen.getAllByText((_, element) => Boolean(element?.textContent?.includes(`saiu ${secondOutgoing.name}, entrou ${secondIncoming.name}`))).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Estamina:/)).not.toBeInTheDocument()
  })
})
