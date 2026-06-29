import type { PenaltyShootoutState, PenaltyShot, PenaltyShotResult } from '../types'

interface PenaltyShootoutPanelProps {
  opponentName: string
  shootout: PenaltyShootoutState
  onStart: () => void
}

const resultMeta: Record<PenaltyShotResult, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Gol' }, miss: { icon: '❌', label: 'Para fora' },
  saved: { icon: '🧤', label: 'Defesa' }, post: { icon: '🥅', label: 'Trave' },
}

function shotSummary(shot: PenaltyShot) {
  if (shot.result === 'goal') return `${shot.takerName}: cobrança convertida.`
  if (shot.result === 'saved') return `${shot.takerName}: cobrança defendida.`
  if (shot.result === 'post') return `${shot.takerName}: cobrança na trave.`
  return `${shot.takerName}: cobrança para fora.`
}

export function PenaltyShootoutPanel({ opponentName, shootout, onStart }: PenaltyShootoutPanelProps) {
  const latestShot = shootout.shots.at(-1)
  const shotsFor = (team: 'user' | 'opponent') => shootout.shots.filter((shot) => shot.team === team)
  const scoreVisible = shootout.status !== 'not_started'
  return (
    <section className="penalty-panel" aria-live="polite">
      <header><span className="eyebrow">DECISÃO DO MATA-MATA</span><h2>Disputa por pênaltis</h2>{shootout.status === 'not_started' && <p>Fim de jogo! Como a partida terminou empatada no mata-mata, a decisão vai para os pênaltis.</p>}</header>
      {scoreVisible && (
        <div className="penalty-score">
          <span className="penalty-score__team">Esquadrão Imortal</span>
          <strong className="penalty-score__number">{shootout.userPenaltyScore}</strong>
          <span className="penalty-score__sep">×</span>
          <strong className="penalty-score__number">{shootout.opponentPenaltyScore}</strong>
          <span className="penalty-score__team">{opponentName}</span>
        </div>
      )}
      {shootout.status === 'not_started' && <button className="button button--primary" onClick={onStart}>Iniciar disputa</button>}
      {shootout.status === 'in_progress' && latestShot && <div className={`penalty-result penalty-result--${latestShot.result}`}><span>{resultMeta[latestShot.result].icon}</span><p><strong>{resultMeta[latestShot.result].label}.</strong> {shotSummary(latestShot)}</p></div>}
      {shootout.shots.length > 0 && <div className="penalty-history"><h3>Histórico das cobranças</h3>{(['user', 'opponent'] as const).map((team) => <div className="penalty-history__team" key={team}><strong>{team === 'user' ? 'Esquadrão Imortal' : opponentName}</strong><div>{shotsFor(team).map((shot) => <span key={shot.id} className={`penalty-badge penalty-badge--${shot.result}`} title={`${shot.takerName}: ${resultMeta[shot.result].label}`}>{resultMeta[shot.result].icon}</span>)}</div></div>)}</div>}
    </section>
  )
}
