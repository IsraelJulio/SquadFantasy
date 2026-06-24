import type { PenaltyShootoutState, PenaltyShotResult } from '../types'
import type { PenaltyParticipants } from '../game/penalties'

interface PenaltyShootoutPanelProps {
  opponentName: string
  regulationScore: { user: number; opponent: number }
  shootout: PenaltyShootoutState
  participants: PenaltyParticipants | null
  showOverall: boolean
  onStart: () => void
  onShoot: () => void
  onSkip: () => void
}

const resultMeta: Record<PenaltyShotResult, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Gol' }, miss: { icon: '❌', label: 'Para fora' },
  saved: { icon: '🧤', label: 'Defesa' }, post: { icon: '🥅', label: 'Trave' },
}

export function PenaltyShootoutPanel({ opponentName, regulationScore, shootout, participants, showOverall, onStart, onShoot, onSkip }: PenaltyShootoutPanelProps) {
  const latestShot = shootout.shots.at(-1)
  const shotsFor = (team: 'user' | 'opponent') => shootout.shots.filter((shot) => shot.team === team)
  return (
    <section className="penalty-panel" aria-live="polite">
      <header><span className="eyebrow">DECISÃO DO MATA-MATA</span><h2>Disputa por pênaltis</h2>{shootout.status === 'not_started' && <p>Fim de jogo! Como a partida terminou empatada no mata-mata, a decisão vai para os pênaltis.</p>}</header>
      <div className="penalty-scores"><div><span>Tempo normal</span><strong>{regulationScore.user} <i>×</i> {regulationScore.opponent}</strong></div><div><span>Pênaltis</span><strong>{shootout.userPenaltyScore} <i>×</i> {shootout.opponentPenaltyScore}</strong></div></div>
      {shootout.status === 'not_started' && <button className="button button--primary" onClick={onStart}>Iniciar pênaltis →</button>}
      {shootout.status === 'in_progress' && participants && <>
        <div className="penalty-round"><span>RODADA {shootout.currentRound}</span><strong>{shootout.currentTeam === 'user' ? 'Seu time cobra' : `${opponentName} cobra`}</strong></div>
        <div className="penalty-duel"><article><small>COBRADOR</small><strong>{participants.taker.name}</strong><span>{showOverall ? `Overall ${participants.taker.overall} · ` : ''}Stamina {participants.taker.stamina}%</span></article><b>VS</b><article><small>GOLEIRO</small><strong>{participants.goalkeeper.name}</strong><span>{showOverall ? `Overall ${participants.goalkeeper.overall} · ` : ''}Stamina {participants.goalkeeper.stamina}%</span></article></div>
        {latestShot && <div className={`penalty-result penalty-result--${latestShot.result}`}><span>{resultMeta[latestShot.result].icon}</span><p><strong>{resultMeta[latestShot.result].label}.</strong> {latestShot.description}</p></div>}
        <div className="penalty-actions"><button className="button button--primary" onClick={onShoot}>Cobrar pênalti</button><button className="button button--ghost" onClick={onSkip}>Pular disputa</button></div>
      </>}
      {shootout.shots.length > 0 && <div className="penalty-history"><h3>Histórico das cobranças</h3>{(['user', 'opponent'] as const).map((team) => <div className="penalty-history__team" key={team}><strong>{team === 'user' ? 'Esquadrão Imortal' : opponentName}</strong><div>{shotsFor(team).map((shot) => <span key={shot.id} className={`penalty-badge penalty-badge--${shot.result}`} title={`Rodada ${shot.round}: ${shot.takerName} — ${resultMeta[shot.result].label}`}>{resultMeta[shot.result].icon}<small>{shot.round}</small></span>)}</div></div>)}<ol>{shootout.shots.map((shot) => <li key={shot.id}><span>Rodada {shot.round}</span><p><strong>{shot.takerName}</strong> — {shot.description}</p></li>)}</ol></div>}
    </section>
  )
}
