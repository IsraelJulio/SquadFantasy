import { draftSlots } from '../game/draft'
import type { GamePlayer } from '../types'
import { PlayerCard } from './PlayerCard'

interface DraftScreenProps {
  selected: GamePlayer[]
  options: GamePlayer[]
  onSelect: (player: GamePlayer) => void
}

export function DraftScreen({ selected, options, onSelect }: DraftScreenProps) {
  const round = selected.length
  const progress = Math.round((round / 11) * 100)
  return (
    <main className="game-shell">
      <section className="game-heading">
        <div><span className="eyebrow">RODADA {round + 1} DE 11</span><h1>Escolha seu <em>{draftSlots[round]}</em></h1><p>Faça sua aposta. O verdadeiro overall será uma surpresa.</p></div>
        <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><b>{round}</b>/11</span></div>
      </section>
      <div className="draft-progress"><span style={{ width: `${progress}%` }} /></div>
      <section className="draft-grid">
        {options.map((player) => <PlayerCard key={player.id} player={player} onSelect={onSelect} concealed />)}
      </section>
      {selected.length > 0 && (
        <section className="picked-strip">
          <span>SEU ELENCO</span>
          <div>{selected.map((player) => <div className="picked-avatar" key={player.id} title={player.name}>{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>)}{draftSlots.slice(selected.length).map((_, index) => <div className="picked-avatar picked-avatar--empty" key={index}>+</div>)}</div>
        </section>
      )}
    </main>
  )
}
