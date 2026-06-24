import type { MatchSimulationStatus } from '../types'
interface MatchClockProps { status: MatchSimulationStatus; minute: number }
const labels: Record<MatchSimulationStatus, string> = { not_started: 'Aguardando início', first_half: '1º Tempo', half_time: 'Intervalo', second_half: '2º Tempo', paused: 'Pausado para substituição', awaiting_penalties: 'Fim do tempo normal', penalties: 'Disputa por pênaltis', finished: 'Fim de jogo' }
export function MatchClock({ status, minute }: MatchClockProps) { return <div className={`match-clock match-clock--${status}`} aria-live="polite"><span>{labels[status]}</span><strong>{String(minute).padStart(2, '0')}:00</strong><progress max="40" value={minute} aria-label={`${minute} de 40 minutos`} /></div> }
