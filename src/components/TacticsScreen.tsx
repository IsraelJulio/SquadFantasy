import { calculateSquadStrength } from '../game/squad'
import type { Formation, GamePlayer, Strategy } from '../types'
import { PlayerCard } from './PlayerCard'

const formations: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1']
const strategies: { value: Strategy; icon: string; description: string }[] = [
  { value: 'Ofensivo', icon: '↑', description: 'Pressão alta e muitos jogadores no ataque.' },
  { value: 'Equilibrado', icon: '◆', description: 'Balanço seguro entre todos os setores.' },
  { value: 'Defensivo', icon: '▣', description: 'Bloco compacto e proteção da área.' },
  { value: 'Contra-ataque', icon: '⚡', description: 'Transições rápidas após recuperar a bola.' },
  { value: 'Posse de bola', icon: '∞', description: 'Controle do meio e circulação paciente.' },
]

interface TacticsScreenProps {
  squad: GamePlayer[]
  formation: Formation
  strategy: Strategy
  onFormation: (formation: Formation) => void
  onStrategy: (strategy: Strategy) => void
  onConfirm: () => void
}

export function TacticsScreen({ squad, formation, strategy, onFormation, onStrategy, onConfirm }: TacticsScreenProps) {
  const strength = calculateSquadStrength(squad, formation, strategy)
  return (
    <main className="game-shell tactics-screen">
      <section className="game-heading"><div><span className="eyebrow">VESTIÁRIO</span><h1>Ajuste seu <em>plano de jogo</em></h1><p>Suas decisões táticas influenciam cada partida.</p></div></section>
      <div className="tactics-layout">
        <section className="tactics-panel">
          <label>FORMAÇÃO</label>
          <div className="formation-options">{formations.map((item) => <button className={formation === item ? 'active' : ''} key={item} onClick={() => onFormation(item)}>{item}</button>)}</div>
          <label>ESTILO DE JOGO</label>
          <div className="strategy-options">{strategies.map((item) => <button className={strategy === item.value ? 'active' : ''} key={item.value} onClick={() => onStrategy(item.value)}><span>{item.icon}</span><div><strong>{item.value}</strong><small>{item.description}</small></div></button>)}</div>
        </section>
        <aside className="team-summary">
          <div className="team-summary__header"><span>FORÇA DO TIME</span><strong>{strength.overall}</strong></div>
          <div className="strength-bars">
            {[['Ataque', strength.attack], ['Meio-campo', strength.midfield], ['Defesa', strength.defense], ['Entrosamento', strength.compatibility]].map(([label, value]) => <div key={label}><span>{label}<b>{value}</b></span><i><em style={{ width: `${value}%` }} /></i></div>)}
          </div>
          <div className="mini-squad">{squad.map((player) => <PlayerCard key={player.id} player={player} compact />)}</div>
          <button className="button button--primary button--full" onClick={onConfirm}>Confirmar e ir para a Copa →</button>
        </aside>
      </div>
    </main>
  )
}
