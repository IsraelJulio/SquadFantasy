import { useState } from 'react'
import { calculateCoachBoost, getCompatibleSubstitutes } from '../game/squad'
import type { GameAthlete, GameCoach, GamePlayer } from '../types'

type SubstitutionMode = 'pre_match' | 'in_match'

interface SubstitutionModalProps {
  mode: SubstitutionMode
  activePlayers: GamePlayer[]
  benchPlayers: GamePlayer[]
  coach?: GameCoach
  formationLabel?: string
  validationErrors?: string[]
  onConfirm: (playerOutId: string, playerInId: string) => void
  onClose: () => void
  onSave?: () => void
}

export function SubstitutionModal({ mode, activePlayers, benchPlayers, coach, formationLabel, validationErrors = [], onConfirm, onClose, onSave }: SubstitutionModalProps) {
  const [outId, setOutId] = useState<string | null>(null)
  const [lastSwap, setLastSwap] = useState<string | null>(null)
  const active = activePlayers.filter((player): player is GameAthlete => player.kind === 'athlete')
  const bench = benchPlayers.filter((player): player is GameAthlete => player.kind === 'athlete')
  const outgoing = active.find((player) => player.id === outId)
  const compatibleBench = getCompatibleSubstitutes(outgoing, bench)
  const preMatch = mode === 'pre_match'

  function selectOutgoing(playerId: string) {
    setOutId((current) => current === playerId ? null : playerId)
    setLastSwap(null)
  }

  function confirmIncoming(incoming: GameAthlete) {
    if (!outgoing) return
    onConfirm(outgoing.id, incoming.id)
    setLastSwap(`Troca realizada: ${outgoing.name} saiu do time titular e ${incoming.name} entrou.`)
    setOutId(null)
  }

  const contextualMessage = lastSwap
    ?? (outgoing
      ? compatibleBench.length > 0
        ? `Agora escolha no banco quem deve entrar no lugar de ${outgoing.name}.`
        : 'Não há jogadores no banco compatíveis com essa posição.'
      : 'Selecione um jogador titular para ver as opções disponíveis no banco.')

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="substitution-modal" role="dialog" aria-modal="true" aria-labelledby="sub-title">
        <header>
          <div>
            <span className="eyebrow">{preMatch ? formationLabel?.toUpperCase() : 'RELÓGIO PAUSADO'}</span>
            <h2 id="sub-title">{preMatch ? 'Definir time titular' : 'Fazer substituição'}</h2>
            <p>{preMatch ? 'Monte seu time titular antes da partida. Clique em um jogador da quadra para ver no banco quais atletas podem entrar naquela posição. Depois, selecione o substituto desejado para trocar os jogadores. O técnico não entra em quadra, mas aplica bônus ao desempenho do time.' : 'Escolha quem sai e um reserva da mesma posição.'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        <div className="substitution-columns">
          <section>
            <h3>{preMatch ? `TITULARES · ${active.length}/5` : 'SAI · EM QUADRA'}</h3>
            {active.map((player) => <button className={outId === player.id ? 'selected' : ''} aria-pressed={outId === player.id} key={player.id} onClick={() => selectOutgoing(player.id)}><span>{player.position}</span><strong>{player.name}</strong><small>{player.overall} OVR</small></button>)}
          </section>
          <section>
            <h3>{outgoing ? `BANCO · OPÇÕES PARA ${outgoing.position}` : `BANCO · ${bench.length} RESERVAS`}</h3>
            {compatibleBench.map((player) => <button key={player.id} onClick={() => confirmIncoming(player)}><span>{player.position}</span><strong>{player.name}</strong><small>{player.overall} OVR</small></button>)}
            {!outgoing && <div className="bench-placeholder">Selecione um titular para filtrar o banco.</div>}
            {outgoing && compatibleBench.length === 0 && <div className="bench-placeholder">Nenhum reserva compatível.</div>}
          </section>
        </div>

        <p className={`substitution-help ${lastSwap ? 'success' : ''}`} role="status">{contextualMessage}</p>

        {preMatch && coach && (
          <aside className="coach-fixed coach-fixed--detailed">
            <div><span>TÉCNICO · FORA DA QUADRA</span><strong>{coach.name}</strong><small>{coach.overall} OVR · boost ×{calculateCoachBoost(coach).toFixed(3)}</small></div>
            <div className="coach-attributes"><span>ATA <b>{coach.attack}</b></span><span>DEF <b>{coach.defense}</b></span><span>TAT <b>{coach.tactics}</b></span><span>MOT <b>{coach.motivation}</b></span><span>GES <b>{coach.squadManagement}</b></span></div>
          </aside>
        )}

        {preMatch && <div className={`lineup-validation ${validationErrors.length ? 'invalid' : 'valid'}`} role="status">{validationErrors.length ? validationErrors.map((error) => <span key={error}>• {error}</span>) : <span>✓ Escalação válida para iniciar a partida.</span>}</div>}

        <footer>
          <button className="button button--ghost" onClick={onClose}>{preMatch ? 'Cancelar' : 'Cancelar e retomar'}</button>
          {preMatch && <button className="button button--primary" disabled={validationErrors.length > 0} onClick={onSave}>Confirmar escalação</button>}
        </footer>
      </section>
    </div>
  )
}
