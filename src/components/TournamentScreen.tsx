import type { GameCampaign, GameMatch, GamePlayer, Opponent } from '../types'

interface TournamentScreenProps {
  campaign: GameCampaign
  opponent: Opponent
  lastMatch: GameMatch | null
  bestPlayer: GamePlayer
  simulating: boolean
  onPlay: () => void
  onDismissResult: () => void
}

const stages = ['Grupos', 'Oitavas', 'Quartas', 'Semifinal', 'Final']

export function TournamentScreen({ campaign, opponent, lastMatch, bestPlayer, simulating, onPlay, onDismissResult }: TournamentScreenProps) {
  const stageIndex = campaign.matches.length < 3 ? 0 : Math.min(campaign.matches.length - 2, 4)
  const groupMatches = campaign.matches.filter((match) => match.stage === 'Fase de grupos')
  return (
    <main className="game-shell tournament-screen">
      <section className="tournament-progress">
        {stages.map((stage, index) => <div className={`${index < stageIndex ? 'done' : ''} ${index === stageIndex ? 'current' : ''}`} key={stage}><i>{index < stageIndex ? '✓' : index + 1}</i><span>{stage}</span></div>)}
      </section>

      <section className="matchday-heading"><span className="eyebrow">{campaign.currentStage.toUpperCase()} · PARTIDA {campaign.matches.length + 1}</span><h1>Dia de <em>decisão</em></h1></section>

      <section className="match-card">
        <div className="team-side team-side--user"><div className="team-crest">EI</div><span>SEU TIME</span><h2>Esquadrão Imortal</h2><small>{campaign.selectedFormation} · {campaign.selectedStrategy}</small></div>
        <div className="versus"><span>CONFRONTO</span><strong>VS</strong><small>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</small></div>
        <div className="team-side"><div className="team-crest team-crest--opponent">{opponent.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><span>ADVERSÁRIO</span><h2>{opponent.name}</h2><small>{opponent.year} · {opponent.strategy}</small></div>
      </section>

      <section className="match-meta">
        <article><span>MOMENTO DO SEU CRAQUE</span><strong>{bestPlayer.name}</strong><small>{bestPlayer.overall} OVR · {bestPlayer.position}</small></article>
        <article><span>FORÇA DO ADVERSÁRIO</span><div className="level"><i><em style={{ width: `${opponent.level}%` }} /></i><strong>{opponent.level}</strong></div><small>{opponent.strategy}</small></article>
        {campaign.currentStage === 'Fase de grupos' && <article><span>CLASSIFICAÇÃO</span><strong>{campaign.groupPoints} pontos</strong><small>{groupMatches.length}/3 jogos · precisa de 4 pts</small></article>}
      </section>

      <button className={`button button--primary simulate-button ${simulating ? 'loading' : ''}`} onClick={onPlay} disabled={simulating}>
        {simulating ? 'A partida está acontecendo…' : 'Simular partida'} {!simulating && <span>▶</span>}
      </button>

      {lastMatch && (
        <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Resultado da partida">
          <article className={`result-modal result-modal--${lastMatch.result}`}>
            <span className="eyebrow">APITO FINAL · {lastMatch.stage.toUpperCase()}</span>
            <h2>{lastMatch.result === 'victory' ? 'Vitória!' : lastMatch.result === 'defeat' ? 'Fim de jogo' : 'Tudo igual'}</h2>
            <div className="score"><div><b>EI</b><span>Seu time</span></div><strong>{lastMatch.userScore}<i>×</i>{lastMatch.opponentScore}</strong><div><b>{lastMatch.opponentName.slice(0, 2).toUpperCase()}</b><span>{lastMatch.opponentName}</span></div></div>
            <p>{lastMatch.summary}</p>
            <div className="motm"><span>★</span><div><small>DESTAQUE DA PARTIDA</small><strong>{lastMatch.manOfTheMatch}</strong></div></div>
            <button className="button button--primary button--full" onClick={onDismissResult}>Continuar →</button>
          </article>
        </div>
      )}
    </main>
  )
}
