import type { GameCampaign, GroupMatch, GroupStanding } from '../types'

interface GroupStageFinalStandingsScreenProps {
  campaign: GameCampaign
  standings: GroupStanding[]
  userTeamId: string
  onContinueToKnockout: () => void
  onFinishCampaign: () => void
}

function formatGoalDifference(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function resultLabel(match: GroupMatch) {
  if (!match.played || match.homeScore === undefined || match.awayScore === undefined) return null
  return `${match.homeTeamName} ${match.homeScore} x ${match.awayScore} ${match.awayTeamName}`
}

function statusLabel(index: number) {
  return index < 2 ? 'Classificado' : 'Eliminado'
}

function userMessage(userPosition: number) {
  if (userPosition === 1) return 'Campanha perfeita! Seu time liderou o grupo e avancou para o mata-mata.'
  if (userPosition === 2) return 'Classificacao garantida! Seu time ficou em 2o lugar e segue vivo na competicao.'
  return 'Seu time nao ficou entre os 2 primeiros e foi eliminado na fase de grupos.'
}

export function GroupStageFinalStandingsScreen({ campaign, standings, userTeamId, onContinueToKnockout, onFinishCampaign }: GroupStageFinalStandingsScreenProps) {
  const userIndex = standings.findIndex((standing) => standing.teamId === userTeamId)
  const userQualified = userIndex >= 0 && userIndex < 2
  const rounds = [1, 2, 3] as const

  return (
    <main className="game-shell final-group-screen">
      <section className="final-group-hero" aria-labelledby="final-group-title">
        <span className="eyebrow">FIM DA FASE DE GRUPOS</span>
        <h1 id="final-group-title">Classificacao Final do Grupo</h1>
        <p>{userMessage(userIndex + 1)}</p>
      </section>

      <section className={`qualification-message ${userQualified ? 'qualification-message--qualified' : 'qualification-message--eliminated'}`}>
        <strong>{userQualified ? 'Seu time avancou' : 'Seu time foi eliminado'}</strong>
        <span>{userQualified ? 'Os 2 primeiros colocados seguem para o mata-mata.' : 'A campanha termina depois da classificacao final do grupo.'}</span>
      </section>

      <section className="final-group-table-panel" aria-labelledby="final-group-table-title">
        <div className="final-group-section-heading">
          <span>TABELA FINAL</span>
          <h2 id="final-group-table-title">4 times, 2 vagas</h2>
        </div>
        <div className="final-group-table-wrap">
          <table className="final-group-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Time</th>
                <th scope="col">PTS</th>
                <th scope="col">J</th>
                <th scope="col">V</th>
                <th scope="col">E</th>
                <th scope="col">D</th>
                <th scope="col">GP</th>
                <th scope="col">GC</th>
                <th scope="col">SG</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => {
                const qualified = index < 2
                const isUser = standing.teamId === userTeamId
                return (
                  <tr className={`${isUser ? 'is-user' : ''} ${qualified ? 'is-qualified' : 'is-eliminated'}`} key={standing.teamId}>
                    <td>{index + 1}</td>
                    <th scope="row">
                      <span>{standing.teamName}</span>
                      {isUser && <small>Seu time</small>}
                    </th>
                    <td>{standing.points}</td>
                    <td>{standing.played}</td>
                    <td>{standing.wins}</td>
                    <td>{standing.draws}</td>
                    <td>{standing.losses}</td>
                    <td>{standing.goalsFor}</td>
                    <td>{standing.goalsAgainst}</td>
                    <td>{formatGoalDifference(standing.goalDifference)}</td>
                    <td><span className={`standing-status standing-status--${qualified ? 'qualified' : 'eliminated'}`}>{statusLabel(index)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="group-results final-group-results" aria-labelledby="final-group-results-title">
        <div className="final-group-section-heading">
          <span>RESULTADOS DO GRUPO</span>
          <h2 id="final-group-results-title">Jogos das 3 rodadas</h2>
        </div>
        <div className="final-group-rounds">
          {rounds.map((round) => {
            const results = campaign.groupMatches
              .filter((match) => match.round === round)
              .map(resultLabel)
              .filter((label): label is string => Boolean(label))
            return (
              <article key={round}>
                <h3>Rodada {round}</h3>
                <ul>
                  {results.map((result) => <li key={result}>{result}</li>)}
                </ul>
              </article>
            )
          })}
        </div>
      </section>

      <div className="final-group-actions">
        {userQualified
          ? <button className="button button--primary" onClick={onContinueToKnockout}>Avancar para o mata-mata</button>
          : <button className="button button--primary" onClick={onFinishCampaign}>Finalizar campanha</button>}
      </div>
    </main>
  )
}
