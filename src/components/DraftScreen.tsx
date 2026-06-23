import { formationTitle, getRequiredSquadByFormation } from '../game/formations'
import { getNextDraftPosition } from '../game/draft'
import type { Formation, FutsalPosition, GamePlayer } from '../types'
import { PlayerCard } from './PlayerCard'

interface DraftScreenProps {
  selected: GamePlayer[]
  options: GamePlayer[]
  formation: Formation
  onSelect: (player: GamePlayer) => void
}

export function DraftScreen({ selected, options, formation, onSelect }: DraftScreenProps) {
  const round = selected.length
  const progress = Math.round((round / 11) * 100)
  const nextPosition = getNextDraftPosition(selected, formation)
  const athletes = selected.filter((player) => player.kind === 'athlete').length
  const coaches = selected.filter((player) => player.kind === 'coach').length
  const required = getRequiredSquadByFormation(formation)
  const missing = (Object.entries(required) as [FutsalPosition, number][]).filter(([position, count]) => selected.filter((player) => player.position === position).length < count)
  return (
    <main className="game-shell">
      <section className="game-heading">
        <div><span className="eyebrow">{formationTitle(formation).toUpperCase()} · RODADA {round + 1} DE 11</span><h1>Escolha seu <em>{nextPosition}</em></h1><p>{nextPosition === 'TECNICO' ? 'O técnico fica fora da quadra e aplica um boost equilibrado ao quinteto.' : 'Escolha uma lenda do futsal. O overall será revelado após a contratação.'}</p></div>
        <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><b>{round}</b>/11</span></div>
      </section>
      <div className="draft-counters"><span>Atletas <b>{athletes}/10</b></span><span>Técnico <b>{coaches}/1</b></span><span>Total <b>{round}/11</b></span></div>
      <div className="draft-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="missing-positions"><strong>Ainda faltam</strong>{missing.map(([position, count]) => <span key={position}>{position} {selected.filter((player) => player.position === position).length}/{count}</span>)}</div>
      <section className="draft-grid">{options.map((player) => <PlayerCard key={player.id} player={player} onSelect={onSelect} concealed />)}</section>
      {selected.length > 0 && <section className="picked-strip"><span>SEU ELENCO</span><div>{selected.map((player) => <div className={`picked-avatar ${player.kind === 'coach' ? 'picked-avatar--coach' : ''}`} key={player.id} title={`${player.name} · ${player.position}`}>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>)}{Array.from({ length: 11 - selected.length }, (_, index) => <div className="picked-avatar picked-avatar--empty" key={index}>+</div>)}</div></section>}
    </main>
  )
}
