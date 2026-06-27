import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { getDraftPlayerAvailability } from '../game/draft'
import type { DraftTeam, Formation, FutsalPosition, GamePlayer } from '../types'

interface DraftTeamCardProps {
  team: DraftTeam
  selected: GamePlayer[]
  formation: Formation
  showOverall: boolean
  onSelect: (player: GamePlayer) => void
}

function TeamFlag({ flagUrl, name }: { flagUrl?: string; name: string }) {
  if (flagUrl?.startsWith('https://')) {
    return <img className="draft-team-flag" src={flagUrl} alt={name} aria-hidden="true" />
  }
  return <span className="draft-team-flag" aria-hidden="true">⚽</span>
}

const draftPositionOrder: Record<FutsalPosition, number> = {
  GOLEIRO: 0,
  FIXO: 1,
  ALA: 2,
  PIVO: 3,
  TECNICO: 4,
}

export function DraftTeamCard({ team, selected, formation, showOverall, onSelect }: DraftTeamCardProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('Duplo toque, duplo clique ou seta para escolher.')
  const lastTouchRef = useRef<{ playerId: string; time: number } | null>(null)
  const sortedPlayers = useMemo(
    () => [...team.players].sort((a, b) => draftPositionOrder[a.position] - draftPositionOrder[b.position]),
    [team.players],
  )

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
        <TeamFlag flagUrl={team.flagUrl} name={team.name} />
        <div><h2 id="draft-team-name">{team.name}</h2><p>{team.country}{team.referenceYear ? ` · Edição ${team.referenceYear}` : ''}</p>{team.rosterNotes && team.rosterNotes.length > 0 && <small>{team.rosterNotes.join(' · ')}</small>}</div>
      </header>
      <div className="draft-list-heading"><strong>Escolha um jogador</strong><span>Duplo toque, duplo clique ou seta</span></div>
      <ul className="draft-player-list" aria-label={`Jogadores do ${team.name}`}>
        {sortedPlayers.map((player) => {
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
              {showOverall && !alreadyPicked && <span className="draft-player-row__overall">{player.overall} OVR</span>}
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
