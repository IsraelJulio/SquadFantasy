import { canRerollTeam, DIFFICULTY_SETTINGS, getRemainingTeamRerolls, shouldShowDraftPlayerOverall } from '../game/balance'
import type { Difficulty, DraftTeam, Formation, GamePlayer } from '../types'
import { DraftTeamCard } from './DraftTeamCard'

interface DraftScreenProps {
  selected: GamePlayer[]
  team: DraftTeam | null
  formation: Formation
  difficulty: Difficulty
  teamRerollsUsed: number
  hasAlternativeTeam: boolean
  onRedraw: () => void
  onSelect: (player: GamePlayer) => void
}

export function DraftScreen({ selected, team, formation, difficulty, teamRerollsUsed, hasAlternativeTeam, onRedraw, onSelect }: DraftScreenProps) {
  const round = selected.length
  const progress = Math.round((round / 11) * 100)
  const difficultyRules = DIFFICULTY_SETTINGS[difficulty]
  const remainingRerolls = getRemainingTeamRerolls(difficulty, teamRerollsUsed)
  const canRedraw = canRerollTeam(difficulty, teamRerollsUsed) && hasAlternativeTeam
  const showOverall = shouldShowDraftPlayerOverall(difficulty)
  const redrawLabel = difficultyRules.maxTeamRerolls === 0
    ? 'Sorteio extra indisponível no modo Desafio'
    : remainingRerolls === 0
      ? 'Sorteios extras esgotados'
      : `🎲 Sortear nova equipe (${remainingRerolls} ${remainingRerolls === 1 ? 'restante' : 'restantes'})`
  const redrawHelp = difficultyRules.maxTeamRerolls === 0
    ? 'O modo Desafio não permite sorteios extras.'
    : remainingRerolls === 0
      ? 'Você já usou todos os sorteios extras disponíveis para este nível.'
      : hasAlternativeTeam
        ? 'Quer avaliar outros jogadores antes de contratar?'
        : 'Nenhuma outra equipe possui opções válidas nesta rodada.'
  return (
    <main className="game-shell">
      <section className="game-heading">
        <div><span className="eyebrow"> ESCOLHA OS JOGADORES TITULÁRES E RESERVAS</span><h1>Draft por <em>equipes</em></h1></div>
        <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><b>{round}</b>/11</span></div>
      </section>
      <div className="draft-progress"><span style={{ width: `${progress}%` }} /></div>
      {team && <div className="draft-redraw"><div><strong>OPÇÕES DA RODADA</strong><span>{redrawHelp}</span></div><button className="button draft-redraw__button" onClick={onRedraw} disabled={!canRedraw}>{redrawLabel}</button></div>}
      {team ? <DraftTeamCard key={team.id} team={team} selected={selected} formation={formation} showOverall={showOverall} onSelect={onSelect} /> : <section className="draft-team-empty"><h2>Nenhuma contratação disponível</h2><p>Revise a composição exigida pela formação.</p></section>}
      {selected.length > 0 && <section className="picked-strip"><span>SEU ELENCO</span><div>{selected.map((player) => <div className={`picked-avatar ${player.position === 'TECNICO' ? 'picked-avatar--coach' : ''}`} key={player.id} title={`${player.name} · ${player.position}`}>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>)}{Array.from({ length: 11 - selected.length }, (_, index) => <div className="picked-avatar picked-avatar--empty" key={index}>+</div>)}</div></section>}
    </main>
  )
}
