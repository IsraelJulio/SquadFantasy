import type { GameMatch, MatchTimelineEvent } from '../types'

interface MatchResultModalProps {
  result: GameMatch
  events: MatchTimelineEvent[]
  continueLabel: string
  onContinue: () => void
}

function formatScore(result: GameMatch) {
  const userPenaltyScore = result.wentToPenalties ? ` (${result.userPenaltyScore})` : ''
  const opponentPenaltyScore = result.wentToPenalties ? `(${result.opponentPenaltyScore}) ` : ''
  return {
    user: `${result.userScore}${userPenaltyScore}`,
    opponent: `${opponentPenaltyScore}${result.opponentScore}`,
  }
}

function scorersByTeam(events: MatchTimelineEvent[], team: 'user' | 'opponent') {
  return events
    .filter((event) => event.type === 'goal' && event.team === team)
    .map((event) => ({
      id: event.id,
      minute: event.minute,
      name: event.playerName ?? 'Autor desconhecido',
    }))
}

function ScorerList({ label, scorers }: { label: string; scorers: ReturnType<typeof scorersByTeam> }) {
  return (
    <section>
      <h3>{label}</h3>
      {scorers.length > 0
        ? <ul>{scorers.map((scorer) => <li key={scorer.id}><strong>{scorer.name}</strong><span>{scorer.minute}'</span></li>)}</ul>
        : <p>Sem gols</p>}
    </section>
  )
}

export function MatchResultModal({ result, events, continueLabel, onContinue }: MatchResultModalProps) {
  const score = formatScore(result)
  const userScorers = scorersByTeam(events, 'user')
  const opponentScorers = scorersByTeam(events, 'opponent')

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`match-result-modal match-result-modal--${result.result}`} role="dialog" aria-modal="true" aria-labelledby="match-result-title">
        <header>
          <div>
            <span className="eyebrow">APITO FINAL</span>
            <h2 id="match-result-title">Fim de jogo</h2>
            <p>{result.summary}</p>
          </div>
        </header>

        <div className="match-result-score" aria-label="Placar final">
          <strong>{score.user}</strong>
          <span>{'\u00d7'}</span>
          <strong>{score.opponent}</strong>
        </div>

        <div className="match-result-scorers" aria-label="Marcadores da partida">
          <ScorerList label={'Gols do Esquadr\u00e3o Imortal'} scorers={userScorers} />
          <ScorerList label={`Gols do ${result.opponentName}`} scorers={opponentScorers} />
        </div>

        <div className="match-result-highlight">
          <small>DESTAQUE DA PARTIDA</small>
          <strong>{'\u2605'} {result.manOfTheMatch}</strong>
        </div>

        <footer>
          <button className="button button--primary" onClick={onContinue}>{continueLabel} {'\u2192'}</button>
        </footer>
      </section>
    </div>
  )
}
