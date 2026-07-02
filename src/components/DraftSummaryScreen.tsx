import { calculateDraftTeamGrade, getDraftSummaryInsights } from '../game/draftSummary'
import { ATHLETE_POSITIONS } from '../game/formations'
import { getTeamById } from '../data/futsalDatabase'
import type { DraftPickHistoryItem, Formation, FutsalPosition, GameCoach, GamePlayer } from '../types'

interface DraftSummaryScreenProps {
  squad: GamePlayer[]
  formation: Formation
  pickHistory: DraftPickHistoryItem[]
  onContinue: () => void
}

const positionLabels: Record<FutsalPosition, string> = {
  GOLEIRO: 'Goleiro',
  FIXO: 'Fixo',
  ALA: 'Ala',
  PIVO: 'Pivo',
  TECNICO: 'Tecnico',
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2)
}

function DraftRosterCrest({ playerName, teamId }: { playerName: string; teamId?: string }) {
  const flagUrl = teamId ? getTeamById(teamId)?.flagUrl : undefined

  if (flagUrl?.startsWith('https://')) {
    return <img className="draft-roster-player__crest" src={flagUrl} alt="" aria-hidden="true" />
  }

  return <span className="draft-roster-player__crest" aria-hidden="true">{initials(playerName)}</span>
}

export function DraftSummaryScreen({ squad, formation, pickHistory, onContinue }: DraftSummaryScreenProps) {
  const athletes = squad.filter((player) => player.position !== 'TECNICO')
  const coach = squad.find((player): player is GameCoach => player.position === 'TECNICO')
  const complete = athletes.length === 10 && Boolean(coach) && pickHistory.length === 11
  const grade = coach ? calculateDraftTeamGrade({ players: squad, coach, formationKey: formation }) : null
  const insights = coach ? getDraftSummaryInsights({ players: squad, coach, formationKey: formation }) : []
  const averageOverall = athletes.length > 0 ? Math.round(athletes.reduce((sum, player) => sum + player.overall, 0) / athletes.length) : 0
  const groupedPositions: FutsalPosition[] = [...ATHLETE_POSITIONS, 'TECNICO']

  return (
    <main className="game-shell draft-summary-screen">
      <section className="game-heading">
        <div><span className="eyebrow">DRAFT CONCLUIDO</span><h1>Resumo do <em>Draft</em></h1></div>
      </section>

      <section className="draft-summary-hero" aria-label="Rank do elenco">
        <article className="draft-summary-grade">
          <span>Rank do elenco</span>
          <strong>{grade?.grade ?? '-'}</strong>
          <h2>{grade?.label ?? 'Draft incompleto'}</h2>
          <p>{grade?.description ?? 'Finalize as 11 escolhas para liberar o resumo.'}</p>
        </article>
        <article className="draft-summary-metric">
          <span>Media de overall</span>
          <strong>{averageOverall}</strong>
          <p>OVR medio dos 10 atletas</p>
        </article>
        {coach && <article className="draft-summary-coach">
          <span>Tecnico contratado</span>
          <strong>{coach.name}</strong>
          <p>{coach.overall} OVR</p>
        </article>}
      </section>

      <section className="draft-summary-grid draft-summary-grid--single">
        <article className="draft-summary-panel">
          <header><span>ELENCO CONTRATADO</span><strong>{squad.length}/11</strong></header>
          <div className="draft-roster-groups">
            {groupedPositions.map((position) => {
              const players = squad.filter((player) => player.position === position)
              if (players.length === 0) return null
              return <section key={position}>
                <h2>{positionLabels[position]}</h2>
                <div>
                  {players.map((player) => {
                    const pick = pickHistory.find((item) => item.playerId === player.id)
                    return <article className={position === 'TECNICO' ? 'draft-roster-player draft-roster-player--coach' : 'draft-roster-player'} key={player.id}>
                      <DraftRosterCrest playerName={player.name} teamId={pick?.teamId} />
                      <div>
                        <strong>{player.name}</strong>
                        <small>Escolha {pick?.pickNumber ?? '-'} - {pick?.teamName ?? 'Origem nao registrada'}</small>
                      </div>
                      <b>{player.overall} OVR</b>
                    </article>
                  })}
                </div>
              </section>
            })}
          </div>
        </article>
      </section>

      <section className="draft-summary-panel draft-summary-insights">
        <header><span>PONTOS FORTES E FRACOS</span><strong>{insights.length}</strong></header>
        <ul>
          {(insights.length > 0 ? insights : ['O resumo fica mais preciso quando o draft esta completo.']).map((insight) => <li key={insight}>{insight}</li>)}
        </ul>
      </section>

      <div className="draft-summary-actions">
        <button className="button button--primary" type="button" onClick={onContinue} disabled={!complete}>Continuar</button>
      </div>
    </main>
  )
}
