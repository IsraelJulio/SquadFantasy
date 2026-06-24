import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { getDraftPlayerAvailability } from '../game/draft'
import type { DraftTeam, Formation, GamePlayer } from '../types'

interface DraftTeamCardProps {
  team: DraftTeam
  selected: GamePlayer[]
  formation: Formation
  onSelect: (player: GamePlayer) => void
}

const flags: Record<string, string> = {
  Brasil: '🇧🇷', Argentina: '🇦🇷', Espanha: '🇪🇸', Itália: '🇮🇹', Portugal: '🇵🇹',
  'Países Baixos': '🇳🇱', Uruguai: '🇺🇾', França: '🇫🇷',
}

export function DraftTeamCard({ team, selected, formation, onSelect }: DraftTeamCardProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('Duplo toque, duplo clique ou seta para escolher.')
  const lastTouchRef = useRef<{ playerId: string; time: number } | null>(null)

  function handleClick(player: GamePlayer) {
    const availability = getDraftPlayerAvailability(player, selected, formation)
    setHighlightedId(player.id)
    setFeedback(availability.available ? `${player.name} em destaque. Dê duplo toque, duplo clique ou use a seta para contratar.` : availability.reason ?? 'Jogador indisponível.')
  }

  function handleDoubleClick(player: GamePlayer) {
    if (!getDraftPlayerAvailability(player, selected, formation).available) return
    onSelect(player)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, player: GamePlayer) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const availability = getDraftPlayerAvailability(player, selected, formation)
    if (availability.available) onSelect(player)
    else setFeedback(availability.reason ?? 'Jogador indisponível.')
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>, player: GamePlayer) {
    if (event.pointerType !== 'touch') return
    const availability = getDraftPlayerAvailability(player, selected, formation)
    if (!availability.available) return
    const now = event.timeStamp
    const lastTouch = lastTouchRef.current
    if (lastTouch?.playerId === player.id && now - lastTouch.time <= 450) {
      event.preventDefault()
      lastTouchRef.current = null
      onSelect(player)
      return
    }
    lastTouchRef.current = { playerId: player.id, time: now }
    handleClick(player)
  }

  return (
    <section className="draft-team-card" aria-labelledby="draft-team-name">
      <header className="draft-team-header">
        <span className="draft-team-flag" aria-hidden="true">{flags[team.country] ?? '⚽'}</span>
        <div><h2 id="draft-team-name">{team.name}</h2><p>{team.country}{team.referenceYear ? ` · Edição ${team.referenceYear}` : ''}</p></div>
      </header>
      <div className="draft-list-heading"><strong>Escolha um jogador</strong><span>Duplo toque, duplo clique ou seta</span></div>
      <ul className="draft-player-list" aria-label={`Jogadores do ${team.name}`}>
        {team.players.map((player) => {
          const availability = getDraftPlayerAvailability(player, selected, formation)
          const alreadyPicked = availability.code === 'already-picked'
          const highlighted = highlightedId === player.id
          return <li
            key={player.id}
            className={`draft-player-row ${highlighted ? 'draft-player-row--highlighted' : ''} ${availability.available ? '' : 'draft-player-row--blocked'} ${alreadyPicked ? 'draft-player-row--picked' : ''}`}
          ><button
              type="button"
              className="draft-player-row__main"
              aria-disabled={!availability.available}
              aria-pressed={highlighted}
              aria-label={`${player.name}, ${player.position}${availability.reason ? `, indisponível: ${availability.reason}` : ''}`}
              title={availability.reason ?? 'Duplo toque, duplo clique ou pressione Enter para escolher'}
              onClick={() => handleClick(player)}
              onDoubleClick={() => handleDoubleClick(player)}
              onKeyDown={(event) => handleKeyDown(event, player)}
              onPointerUp={(event) => handlePointerUp(event, player)}
            >
              <span className="draft-player-row__initials" aria-hidden="true">{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
              <span className="draft-player-row__name"><strong>{player.name}</strong><small>{availability.reason ?? 'Disponível para contratação'}</small></span>
              {alreadyPicked && <span className="draft-player-row__picked">Escolhido</span>}
              <span className="draft-player-row__position">{player.position}</span>
            </button><button
              type="button"
              className="draft-player-row__select"
              disabled={!availability.available}
              aria-label={`Selecionar ${player.name}`}
              title={availability.reason ?? `Selecionar ${player.name}`}
              onClick={() => onSelect(player)}
            ><span aria-hidden="true">→</span></button></li>
        })}
      </ul>
      <p className="draft-list-feedback" aria-live="polite">{feedback}</p>
    </section>
  )
}
