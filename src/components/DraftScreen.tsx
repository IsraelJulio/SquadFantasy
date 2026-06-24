import { canRerollTeam, DIFFICULTY_SETTINGS, getRemainingTeamRerolls, shouldShowPlayerOverall } from '../game/balance'
import { formationTitle, getRequiredSquadByFormation } from '../game/formations'
import type { Difficulty, DraftTeam, Formation, FutsalPosition, GamePlayer } from '../types'
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
  const athletes = selected.filter((player) => player.position !== 'TECNICO').length
  const coaches = selected.filter((player) => player.position === 'TECNICO').length
  const required = getRequiredSquadByFormation(formation)
  const positionNeeds = (Object.entries(required) as [FutsalPosition, number][]).filter(([, count]) => count > 0)
  const difficultyRules = DIFFICULTY_SETTINGS[difficulty]
  const remainingRerolls = getRemainingTeamRerolls(difficulty, teamRerollsUsed)
  const canRedraw = canRerollTeam(difficulty, teamRerollsUsed) && hasAlternativeTeam
  const showOverall = shouldShowPlayerOverall(difficulty)
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
        <div><span className="eyebrow">{formationTitle(formation).toUpperCase()} · Escolha os jogadores tituláres e reservas</span><h1>Draft por <em>equipes</em></h1><p>Escolha um atleta ou técnico desta equipe. Use duplo toque, duplo clique, Enter ou a seta para contratar. {showOverall ? 'No modo Casual, o overall fica visível.' : 'O overall fica oculto nesta dificuldade.'} Jogadores em cinza estão bloqueados.</p></div>
        <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><b>{round}</b>/11</span></div>
      </section>
      <div className="draft-counters"><span>Atletas <b>{athletes}/10</b></span><span>Técnico <b>{coaches}/1</b></span><span>Total <b>{round}/11</b></span></div>
      <div className="draft-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="missing-positions"><strong>Necessidades do elenco</strong>{positionNeeds.map(([position, count]) => <span className={selected.filter((player) => player.position === position).length >= count ? 'complete' : ''} key={position}>{position} {selected.filter((player) => player.position === position).length}/{count}</span>)}</div>
      {team && <div className="draft-redraw"><div><strong>OPÇÕES DA RODADA</strong><span>{redrawHelp}</span></div><button className="button draft-redraw__button" onClick={onRedraw} disabled={!canRedraw}>{redrawLabel}</button></div>}
      {team ? <DraftTeamCard key={team.id} team={team} selected={selected} formation={formation} showOverall={showOverall} onSelect={onSelect} /> : <section className="draft-team-empty"><h2>Nenhuma contratação disponível</h2><p>Revise a composição exigida pela formação.</p></section>}
      {selected.length > 0 && <section className="picked-strip"><span>SEU ELENCO</span><div>{selected.map((player) => <div className={`picked-avatar ${player.position === 'TECNICO' ? 'picked-avatar--coach' : ''}`} key={player.id} title={`${player.name} · ${player.position}`}>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>)}{Array.from({ length: 11 - selected.length }, (_, index) => <div className="picked-avatar picked-avatar--empty" key={index}>+</div>)}</div></section>}
    </main>
  )
}
