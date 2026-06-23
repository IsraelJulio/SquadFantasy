import type { MatchTimelineEvent } from '../types'
interface MatchEventHighlightProps { event?: MatchTimelineEvent }
export function MatchEventHighlight({ event }: MatchEventHighlightProps) {
  if (!event) return <div className="event-highlight event-highlight--empty">A quadra aguarda o primeiro grande momento.</div>
  const parts = event.playerName ? event.description.split(event.playerName) : [event.description]
  return <div className={`event-highlight event-highlight--${event.team}`} role="status"><span>⚽ {event.minute}'</span><p>{parts[0]}<strong>{event.playerName}</strong>{parts.slice(1).join(event.playerName)}</p></div>
}
