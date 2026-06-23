import type { MatchTimelineEvent } from '../types'
import { MatchTimelineItem } from './MatchTimelineItem'
interface MatchTimelineProps { events: MatchTimelineEvent[] }
export function MatchTimeline({ events }: MatchTimelineProps) {
  const latestFirst = [...events].reverse()
  return <section className="match-timeline" aria-label="Linha do tempo da partida" aria-live="polite"><header><span>LINHA DO TEMPO</span><small>{events.length} eventos</small></header><div className="match-timeline__list">{latestFirst.length === 0 ? <p className="timeline-empty">A partida ainda não começou.</p> : latestFirst.map((event, index) => <MatchTimelineItem key={event.id} event={event} newest={index === 0} />)}</div></section>
}
