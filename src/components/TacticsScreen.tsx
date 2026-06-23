import { formationTitle, FUTSAL_FORMATIONS } from '../game/formations'
import type { Formation, Strategy } from '../types'

const formations = Object.keys(FUTSAL_FORMATIONS) as Formation[]
const strategies: { value: Strategy; icon: string; description: string }[] = [
  { value: 'Ofensivo', icon: '↑', description: 'Pressão alta e finalizações frequentes.' },
  { value: 'Equilibrado', icon: '◆', description: 'Balanço seguro entre ataque e marcação.' },
  { value: 'Defensivo', icon: '▣', description: 'Bloco compacto e proteção da área.' },
  { value: 'Contra-ataque', icon: '⚡', description: 'Transições rápidas após recuperar a bola.' },
  { value: 'Posse de bola', icon: '∞', description: 'Trocas curtas e circulação paciente.' },
]

interface TacticsScreenProps {
  formation: Formation
  strategy: Strategy
  onFormation: (formation: Formation) => void
  onStrategy: (strategy: Strategy) => void
  onConfirm: () => void
}

export function TacticsScreen({ formation, strategy, onFormation, onStrategy, onConfirm }: TacticsScreenProps) {
  const selected = FUTSAL_FORMATIONS[formation]
  return (
    <main className="game-shell tactics-screen">
      <section className="game-heading"><div><span className="eyebrow">PLANO DE JOGO</span><h1>Escolha seu <em>sistema de futsal</em></h1><p>A formação define exatamente quais posições aparecerão no draft.</p></div></section>
      <div className="tactics-layout">
        <section className="tactics-panel">
          <label>FORMAÇÃO</label>
          <div className="formation-options">{formations.map((item) => <button className={formation === item ? 'active' : ''} key={item} onClick={() => onFormation(item)}><strong>{FUTSAL_FORMATIONS[item].name}</strong><small>{FUTSAL_FORMATIONS[item].label}</small></button>)}</div>
          <label>ESTILO DE JOGO</label>
          <div className="strategy-options">{strategies.map((item) => <button className={strategy === item.value ? 'active' : ''} key={item.value} onClick={() => onStrategy(item.value)}><span>{item.icon}</span><div><strong>{item.value}</strong><small>{item.description}</small></div></button>)}</div>
        </section>
        <aside className="team-summary formation-summary">
          <div className="team-summary__header"><span>{formationTitle(formation).toUpperCase()}</span><strong>5</strong></div>
          <p>Em quadra</p>
          <div className="formation-requirements">{Object.entries(selected.starters).filter(([, count]) => count > 0).map(([position, count]) => <div key={position}><b>{count}</b><span>{position}</span></div>)}</div>
          <div className="squad-rule"><strong>ELENCO DO DRAFT</strong><span>5 titulares + 5 reservas espelhados</span><span>1 técnico separado</span><b>10 atletas + 1 técnico</b></div>
          <button className="button button--primary button--full" onClick={onConfirm}>Confirmar e começar o draft →</button>
        </aside>
      </div>
    </main>
  )
}
