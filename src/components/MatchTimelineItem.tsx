import type { MatchEventType, MatchTimelineEvent } from '../types'
interface MatchTimelineItemProps { event: MatchTimelineEvent; newest: boolean }
const eventIcons: Record<MatchEventType, string> = { 'kick-off': '▶', goal: '⚽', chance: '◆', save: '◉', foul: '!', substitution: '⇄', 'half-time': '◷', 'second-half': '▶', 'full-time': '■' }
export function MatchTimelineItem({ event, newest }: MatchTimelineItemProps) {
  const highlightedName = event.playerName ?? event.playerIn
  const descriptionParts = highlightedName ? event.description.split(highlightedName) : [event.description]
  return <article className={`timeline-event timeline-event--${event.type} timeline-event--${event.team} ${newest ? 'timeline-event--newest' : ''}`}><time>{event.minute}'</time><span className="timeline-event__icon" aria-hidden="true">{eventIcons[event.type]}</span><p>{descriptionParts[0]}{highlightedName && <strong className={`player-name player-name--${event.team}`}>{highlightedName}</strong>}{descriptionParts.slice(1).join(highlightedName)}</p>{(event.type === 'goal' || event.type === 'substitution') && <small>{event.type === 'goal' ? `${event.userScore} × ${event.opponentScore}` : event.position}</small>}</article>
}
