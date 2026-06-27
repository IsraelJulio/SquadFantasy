import type { GameCampaign, GroupMatch } from '../types'
import { calculateGroupStandings, getCurrentUserGroupMatch } from '../game/groupStage'

interface GroupStageCardProps {
  campaign: GameCampaign
}

function formatGoalDifference(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function resultLabel(match: GroupMatch) {
  if (!match.played || match.homeScore === undefined || match.awayScore === undefined) return null
  return `${match.homeTeamName} ${match.homeScore} x ${match.awayScore} ${match.awayTeamName}`
}

export function GroupStageCard({ campaign }: GroupStageCardProps) {
  const standings = calculateGroupStandings(campaign.groupTeams, campaign.groupMatches)
  const currentMatch = getCurrentUserGroupMatch(campaign)
  const resultsRound = campaign.groupMatches.some((match) => match.round === campaign.currentGroupRound && match.played)
    ? campaign.currentGroupRound
    : Math.max(1, campaign.currentGroupRound - 1)
  const roundResults = campaign.groupMatches
    .filter((match) => match.round === resultsRound && match.played)
    .map(resultLabel)
    .filter((label): label is string => Boolean(label))

  return (
    <section className="group-stage-card" aria-labelledby="group-stage-title">
      <header>
        <div>
          <span className="eyebrow">RODADA {campaign.currentGroupRound} DE 3</span>
          <h2 id="group-stage-title">Classificação do Grupo</h2>
          <p>Os 2 primeiros avançam para o mata-mata.</p>
        </div>
        {currentMatch && <div className="group-next-match"><small>Próximo jogo</small><strong>{currentMatch.homeTeamName} x {currentMatch.awayTeamName}</strong></div>}
      </header>

      <div className="group-standings" role="table" aria-label="Classificação do grupo">
        <div className="group-standings__row group-standings__row--head" role="row">
          <span>#</span><span>Time</span><span>PTS</span><span>J</span><span>V</span><span>E</span><span>D</span><span>GP</span><span>GC</span><span>SG</span>
        </div>
        {standings.map((standing, index) => (
          <div className={`group-standings__row ${standing.isUserTeam ? 'is-user' : ''} ${index < 2 ? 'is-qualifying' : ''}`} role="row" key={standing.teamId}>
            <span>{index + 1}</span>
            <strong>{standing.isUserTeam ? '◆ ' : ''}{standing.teamName}{index < 2 && <small>classifica</small>}</strong>
            <span>{standing.points}</span>
            <span>{standing.played}</span>
            <span>{standing.wins}</span>
            <span>{standing.draws}</span>
            <span>{standing.losses}</span>
            <span>{standing.goalsFor}</span>
            <span>{standing.goalsAgainst}</span>
            <span>{formatGoalDifference(standing.goalDifference)}</span>
          </div>
        ))}
      </div>

      <div className="group-results">
        <span>Resultados da rodada</span>
        {roundResults.length > 0
          ? <ul>{roundResults.map((result) => <li key={result}>{result}</li>)}</ul>
          : <p>Os jogos do grupo ainda não começaram.</p>}
      </div>
    </section>
  )
}
