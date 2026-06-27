import { useState } from 'react'
import { calculateTacticalMatchup } from '../game/balance'
import { formationTitle } from '../game/formations'
import { validateStartingLineup } from '../game/squad'
import type { GameCampaign, GamePlayer, Opponent, Strategy } from '../types'
import { GroupStageCard } from './GroupStageCard'
import { LineupModal } from './LineupModal'

interface TournamentScreenProps {
  campaign: GameCampaign
  opponent: Opponent
  squad: GamePlayer[]
  bestPlayer: GamePlayer
  onPlay: () => void
  onSaveLineup: (starterIds: string[]) => void
  onStrategy: (strategy: Strategy) => void
}

const stages = ['Grupos', 'Oitavas', 'Quartas', 'Semifinal', 'Final']
const strategies: Strategy[] = ['Ofensivo', 'Equilibrado', 'Defensivo', 'Contra-ataque', 'Posse de bola']

export function TournamentScreen({ campaign, opponent, squad, bestPlayer, onPlay, onSaveLineup, onStrategy }: TournamentScreenProps) {
  const [editingLineup, setEditingLineup] = useState(false)
  const stageIndex = campaign.matches.length < 3 ? 0 : Math.min(campaign.matches.length - 2, 4)
  const starters = squad.filter((player) => campaign.starterIds.includes(player.id))
  const bench = squad.filter((player) => player.position !== 'TECNICO' && !campaign.starterIds.includes(player.id))
  const lineupErrors = campaign.selectedFormation ? validateStartingLineup(starters, bench, campaign.selectedFormation) : ['Formação não definida.']

  return (
    <main className="game-shell tournament-screen">
      <section className="tournament-progress">{stages.map((stage, index) => <div className={`${index < stageIndex ? 'done' : ''} ${index === stageIndex ? 'current' : ''}`} key={stage}><i>{index < stageIndex ? '✓' : index + 1}</i><span>{stage}</span></div>)}</section>
      <section className="matchday-heading"><span className="eyebrow">{campaign.currentStage.toUpperCase()} · PARTIDA {campaign.matches.length + 1}</span><h1>Dia de <em>decisão</em></h1></section>
      <section className="match-card">
        <div className="team-side team-side--user"><div className="team-crest">EI</div><span>SEU TIME</span><h2>Esquadrão Imortal</h2><small>{campaign.selectedFormation && formationTitle(campaign.selectedFormation)} · {campaign.selectedStrategy}</small></div>
        <div className="versus"><span>CONFRONTO</span><strong>VS</strong><small>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</small></div>
        <div className="team-side">{opponent.flagUrl?.startsWith('https://') ? <img className="team-crest team-crest--opponent" src={opponent.flagUrl} alt={opponent.name} /> : <div className="team-crest team-crest--opponent">{opponent.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>}<span>ADVERSÁRIO</span><h2>{opponent.name}</h2><small>{opponent.year} · {opponent.strategy}</small></div>
      </section>
      <section className="match-meta">
        <article><span>DESTAQUE DO QUINTETO</span><strong>{bestPlayer.name}</strong><small>{bestPlayer.overall} OVR · {bestPlayer.position}</small></article>
        <article><span>FORÇA DO ADVERSÁRIO</span><div className="level"><i><em style={{ width: `${opponent.level}%` }} /></i><strong>{opponent.level}</strong></div><small>{opponent.strategy}</small></article>
        {campaign.currentStage === 'Fase de grupos' && <article><span>FASE DE GRUPOS</span><strong>Rodada {campaign.currentGroupRound}</strong><small>2 primeiros avançam</small></article>}
      </section>
      {campaign.currentStage === 'Fase de grupos' && <GroupStageCard campaign={campaign} />}
      <section className="prematch-strategy" aria-labelledby="prematch-strategy-title">
        <div><span>AJUSTE TÁTICO</span><strong id="prematch-strategy-title">Escolha como enfrentar {opponent.name}</strong></div>
        <div className="prematch-strategy__options">{strategies.map((item) => {
          const edge = calculateTacticalMatchup(item, opponent.strategy).edge
          const matchupLabel = edge > 0 ? `Favorável +${Math.round(edge * 100)}%` : edge < 0 ? `Desfavorável ${Math.round(edge * 100)}%` : 'Neutro'
          return <button aria-pressed={campaign.selectedStrategy === item} className={campaign.selectedStrategy === item ? 'active' : ''} key={item} onClick={() => onStrategy(item)}><strong>{item}</strong><small className={edge > 0 ? 'positive' : edge < 0 ? 'negative' : ''}>{matchupLabel}</small></button>
        })}</div>
        <p>O adversário joga no estilo <b>{opponent.strategy}</b>. Um confronto favorável melhora sua força sem substituir o overall ou a stamina.</p>
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
