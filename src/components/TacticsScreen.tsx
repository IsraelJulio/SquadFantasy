import { FUTSAL_FORMATIONS } from '../game/formations'
import { DIFFICULTY_SETTINGS } from '../game/balance'
import type { Difficulty, Formation } from '../types'
import { FutsalFormationPreview } from './FutsalFormationPreview'

const formations = Object.keys(FUTSAL_FORMATIONS) as Formation[]
const difficulties = Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]

interface TacticsScreenProps {
  formation: Formation
  difficulty: Difficulty
  onFormation: (formation: Formation) => void
  onDifficulty: (difficulty: Difficulty) => void
  onConfirm: () => void
}

export function TacticsScreen({ formation, difficulty, onFormation, onDifficulty, onConfirm }: TacticsScreenProps) {
  return (
    <main className="game-shell tactics-screen">
      <section className="game-heading"><div><span className="eyebrow">PLANO DE JOGO</span><h1>Escolha sua <em>formação</em></h1><p>A formação define exatamente quais posições aparecerão no draft.</p></div></section>
      <div className="tactics-layout tactics-layout--compact">
        <section className="tactics-panel">
          <label>FORMAÇÃO</label>
          <div className="formation-options">{formations.map((item) => <button aria-pressed={formation === item} className={formation === item ? 'active' : ''} key={item} onClick={() => onFormation(item)}><strong>{FUTSAL_FORMATIONS[item].name}</strong><small>{FUTSAL_FORMATIONS[item].label}</small></button>)}</div>
          <FutsalFormationPreview formation={formation} />
          <label>DIFICULDADE</label>
          <div className="difficulty-options">{difficulties.map((item) => <button aria-pressed={difficulty === item} className={difficulty === item ? 'active' : ''} key={item} onClick={() => onDifficulty(item)}><strong>{DIFFICULTY_SETTINGS[item].label}</strong><small>{DIFFICULTY_SETTINGS[item].description}</small></button>)}</div>
          <button className="button button--primary button--full tactics-confirm" onClick={onConfirm}>Confirmar e começar o draft →</button>
        </section>
      </div>
    </main>
  )
}
