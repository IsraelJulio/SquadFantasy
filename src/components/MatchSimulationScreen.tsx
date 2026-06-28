import { useMatchSimulation } from '../hooks/useMatchSimulation'
import type { GameCampaign, MatchSimulationPlan, Opponent } from '../types'
import { MatchEventHighlight } from './MatchEventHighlight'
import { MatchScoreboard } from './MatchScoreboard'
import { MatchResultModal } from './MatchResultModal'
import { MatchTimeline } from './MatchTimeline'
import { PenaltyShootoutPanel } from './PenaltyShootoutPanel'
import { SubstitutionModal } from './SubstitutionModal'

interface MatchSimulationScreenProps { campaign: GameCampaign; opponent: Opponent; plan: MatchSimulationPlan; onFinished: (plan: MatchSimulationPlan) => void; onContinue: () => void }

export function MatchSimulationScreen({ campaign, opponent, plan, onFinished, onContinue }: MatchSimulationScreenProps) {
  const simulation = useMatchSimulation(plan, opponent, onFinished)
  const finished = simulation.status === 'finished'
  const penaltiesVisible = ['awaiting_penalties', 'penalties'].includes(simulation.status)
  const matchRunning = ['first_half', 'half_time', 'second_half'].includes(simulation.status)
  const matchNotStarted = simulation.status === 'not_started'
  const result = simulation.completedPlan?.match
  const continueLabel = campaign.status === 'active' ? 'Jogar pr\u00f3xima partida' : 'Finalizar campanha'
  return (
    <main className="game-shell match-simulation-screen">
      <header className="simulation-heading"><span className="eyebrow">{plan.stage.toUpperCase()} {'\u00b7'} AO VIVO</span><h1>Acompanhe a <em>partida</em></h1></header>
      <MatchScoreboard opponentName={`${opponent.name} ${opponent.year}`} userScore={simulation.userScore} opponentScore={simulation.opponentScore} status={simulation.status} minute={simulation.currentMinute} />
      {(matchNotStarted || matchRunning) && <div className="simulation-controls" aria-label={'Controles da simula\u00e7\u00e3o'}>
        {matchNotStarted && <button className="button button--primary" onClick={simulation.start}>Iniciar partida</button>}
        {matchRunning && <>
          <button className="button button--substitution" onClick={simulation.pauseForSubstitution}>Fazer substitui{'\u00e7\u00e3o'}</button>
          <button className="button button--ghost" onClick={simulation.accelerate}>Acelerar {'\u00b7'} {simulation.speed}{'\u00d7'}</button>
          <button className="button button--ghost" onClick={simulation.skipToEnd}>Pular para o final</button>
        </>}
      </div>}
      {penaltiesVisible && <PenaltyShootoutPanel opponentName={`${opponent.name} ${opponent.year}`} shootout={simulation.shootout} onStart={simulation.beginPenalties} />}
      <MatchEventHighlight event={simulation.latestGoal} />
      <MatchTimeline events={simulation.visibleEvents} />
      {simulation.status === 'paused' && <SubstitutionModal mode="in_match" activePlayers={simulation.activePlayers} benchPlayers={simulation.benchPlayers} onClose={simulation.cancelSubstitution} onConfirm={(playerOutId, playerInId) => simulation.substitute({ playerOutId, playerInId })} />}
      {finished && result && <MatchResultModal result={result} events={simulation.completedPlan?.events ?? simulation.visibleEvents} continueLabel={continueLabel} onContinue={onContinue} />}
    </main>
  )
}
