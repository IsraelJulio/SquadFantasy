import type { GameCampaign } from '../types'

interface FinalScreenProps {
  campaign: GameCampaign
  onNew: () => void
  onHome: () => void
}

function topScorerOf(campaign: GameCampaign) {
  const totals = new Map<string, number>()
  for (const match of campaign.matches) {
    for (const scorer of match.scorers ?? [])
      totals.set(scorer.name, (totals.get(scorer.name) ?? 0) + scorer.goals)
  }
  if (totals.size === 0) return null
  const [name, goals] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]
  return { name, goals }
}

function topHighlightsOf(campaign: GameCampaign, excludeName: string | null) {
  const motmCounts = new Map<string, number>()
  const goalTotals = new Map<string, number>()
  for (const match of campaign.matches) {
    if (match.manOfTheMatch)
      motmCounts.set(match.manOfTheMatch, (motmCounts.get(match.manOfTheMatch) ?? 0) + 1)
    for (const scorer of match.scorers ?? [])
      goalTotals.set(scorer.name, (goalTotals.get(scorer.name) ?? 0) + scorer.goals)
  }
  const allNames = new Set([...motmCounts.keys(), ...goalTotals.keys()])
  return [...allNames]
    .filter(name => name !== excludeName)
    .map(name => ({ name, motm: motmCounts.get(name) ?? 0, goals: goalTotals.get(name) ?? 0 }))
    .sort((a, b) => b.motm - a.motm || b.goals - a.goals)
    .slice(0, 3)
}

export function FinalScreen({ campaign, onNew, onHome }: FinalScreenProps) {
  const champion = campaign.status === 'champion'
  const wins = campaign.matches.filter((match) => match.result === 'victory').length
  const goals = campaign.matches.reduce((sum, match) => sum + match.userScore, 0)
  const artilheiro = champion ? topScorerOf(campaign) : null
  const highlights = champion ? topHighlightsOf(campaign, artilheiro?.name ?? null) : []
  return (
    <main className={`final-screen ${champion ? 'final-screen--champion' : ''}`}>
      <div className="final-emblem">{champion ? '★' : 'EI'}</div>
      <span className="eyebrow">{champion ? 'A HISTÓRIA FOI ESCRITA' : `${campaign.currentStage.toUpperCase()} · CAMPANHA ENCERRADA`}</span>
      <h1>{champion ? <>Campeões da <em>fantasy!</em></> : <>A jornada termina <em>aqui.</em></>}</h1>
      <p>{champion ? 'Seu esquadrão atravessou eras, superou gigantes e levantou a taça.' : 'Nem toda grande seleção leva a taça. O próximo esquadrão pode escrever um final diferente.'}</p>
      {artilheiro && (
        <div className="final-top-scorer">
          <span className="final-top-scorer__label">Artilheiro da campanha</span>
          <strong className="final-top-scorer__name">{artilheiro.name}</strong>
          <span className="final-top-scorer__goals">{artilheiro.goals} {artilheiro.goals === 1 ? 'gol' : 'gols'}</span>
        </div>
      )}
      {highlights.length > 0 && (
        <div className="final-highlights">
          {highlights.map(p => (
            <div key={p.name} className="final-highlight-card">
              <span className="final-highlight-card__label">Destaque</span>
              <strong className="final-highlight-card__name">{p.name}</strong>
              <span className="final-highlight-card__stats">
                {p.motm > 0 && <>{p.motm}× MVP{p.goals > 0 ? ' · ' : ''}</>}{p.goals > 0 && <>{p.goals} {p.goals === 1 ? 'gol' : 'gols'}</>}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="final-stats"><span><b>{campaign.matches.length}</b> jogos</span><span><b>{wins}</b> vitórias</span><span><b>{goals}</b> gols</span><span><b>{campaign.groupPoints}</b> pts nos grupos</span></div>
      <div className="final-actions"><button className="button button--primary" onClick={onNew}>Montar novo time →</button><button className="button button--ghost" onClick={onHome}>Voltar ao início</button></div>
    </main>
  )
}
