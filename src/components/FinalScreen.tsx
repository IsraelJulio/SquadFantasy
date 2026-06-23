import type { GameCampaign } from '../types'

interface FinalScreenProps {
  campaign: GameCampaign
  onNew: () => void
  onHome: () => void
}

export function FinalScreen({ campaign, onNew, onHome }: FinalScreenProps) {
  const champion = campaign.status === 'champion'
  const wins = campaign.matches.filter((match) => match.result === 'victory').length
  const goals = campaign.matches.reduce((sum, match) => sum + match.userScore, 0)
  return (
    <main className={`final-screen ${champion ? 'final-screen--champion' : ''}`}>
      <div className="final-emblem">{champion ? '★' : 'EI'}</div>
      <span className="eyebrow">{champion ? 'A HISTÓRIA FOI ESCRITA' : `${campaign.currentStage.toUpperCase()} · CAMPANHA ENCERRADA`}</span>
      <h1>{champion ? <>Campeões do <em>mundo!</em></> : <>A jornada termina <em>aqui.</em></>}</h1>
      <p>{champion ? 'Seu esquadrão atravessou eras, superou gigantes e levantou a taça.' : 'Nem toda grande seleção leva a taça. O próximo esquadrão pode escrever um final diferente.'}</p>
      <div className="final-stats"><span><b>{campaign.matches.length}</b> jogos</span><span><b>{wins}</b> vitórias</span><span><b>{goals}</b> gols</span><span><b>{campaign.groupPoints}</b> pts nos grupos</span></div>
      <div className="final-actions"><button className="button button--primary" onClick={onNew}>Montar novo time →</button><button className="button button--ghost" onClick={onHome}>Voltar ao início</button></div>
    </main>
  )
}
