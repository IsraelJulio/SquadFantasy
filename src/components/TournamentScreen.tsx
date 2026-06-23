import { useState } from 'react'
import { formationTitle } from '../game/formations'
import { validateStartingLineup } from '../game/squad'
import type { GameCampaign, GamePlayer, Opponent } from '../types'
import { LineupModal } from './LineupModal'

interface TournamentScreenProps {
  campaign: GameCampaign
  opponent: Opponent
  squad: GamePlayer[]
  bestPlayer: GamePlayer
  onPlay: () => void
  onSaveLineup: (starterIds: string[]) => void
}

const stages = ['Grupos', 'Oitavas', 'Quartas', 'Semifinal', 'Final']

export function TournamentScreen({ campaign, opponent, squad, bestPlayer, onPlay, onSaveLineup }: TournamentScreenProps) {
  const [editingLineup, setEditingLineup] = useState(false)
  const stageIndex = campaign.matches.length < 3 ? 0 : Math.min(campaign.matches.length - 2, 4)
  const groupMatches = campaign.matches.filter((match) => match.stage === 'Fase de grupos')
  const starters = squad.filter((player) => campaign.starterIds.includes(player.id))
  const bench = squad.filter((player) => player.kind === 'athlete' && !campaign.starterIds.includes(player.id))
  const lineupErrors = campaign.selectedFormation ? validateStartingLineup(starters, bench, campaign.selectedFormation) : ['Formação não definida.']

  return (
    <main className="game-shell tournament-screen">
      <section className="tournament-progress">{stages.map((stage, index) => <div className={`${index < stageIndex ? 'done' : ''} ${index === stageIndex ? 'current' : ''}`} key={stage}><i>{index < stageIndex ? '✓' : index + 1}</i><span>{stage}</span></div>)}</section>
      <section className="matchday-heading"><span className="eyebrow">{campaign.currentStage.toUpperCase()} · PARTIDA {campaign.matches.length + 1}</span><h1>Dia de <em>decisão</em></h1></section>
      <section className="match-card">
        <div className="team-side team-side--user"><div className="team-crest">EI</div><span>SEU TIME</span><h2>Esquadrão Imortal</h2><small>{campaign.selectedFormation && formationTitle(campaign.selectedFormation)} · {campaign.selectedStrategy}</small></div>
        <div className="versus"><span>CONFRONTO</span><strong>VS</strong><small>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</small></div>
        <div className="team-side"><div className="team-crest team-crest--opponent">{opponent.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><span>ADVERSÁRIO</span><h2>{opponent.name}</h2><small>{opponent.year} · {opponent.strategy}</small></div>
      </section>
      <section className="match-meta">
        <article><span>DESTAQUE DO QUINTETO</span><strong>{bestPlayer.name}</strong><small>{bestPlayer.overall} OVR · {bestPlayer.position}</small></article>
        <article><span>FORÇA DO ADVERSÁRIO</span><div className="level"><i><em style={{ width: `${opponent.level}%` }} /></i><strong>{opponent.level}</strong></div><small>{opponent.strategy}</small></article>
        {campaign.currentStage === 'Fase de grupos' && <article><span>CLASSIFICAÇÃO</span><strong>{campaign.groupPoints} pontos</strong><small>{groupMatches.length}/3 jogos · precisa de 4 pts</small></article>}
      </section>
      <div className="prematch-actions">
        <button className="button button--primary simulate-button" onClick={onPlay} disabled={lineupErrors.length > 0}>Iniciar partida <span>▶</span></button>
        <button className="button button--ghost" onClick={() => setEditingLineup(true)}>Definir time titular</button>
        {lineupErrors.length > 0 && <small>{lineupErrors[0]}</small>}
      </div>
      {editingLineup && campaign.selectedFormation && <LineupModal squad={squad} formation={campaign.selectedFormation} initialStarterIds={campaign.starterIds} onConfirm={onSaveLineup} onClose={() => setEditingLineup(false)} />}
    </main>
  )
}
