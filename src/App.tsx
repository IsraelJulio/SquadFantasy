import { useEffect, useMemo, useRef, useState } from 'react'
import { DraftScreen } from './components/DraftScreen'
import { DraftSummaryScreen } from './components/DraftSummaryScreen'
import { FinalScreen } from './components/FinalScreen'
import { GroupStageFinalStandingsScreen } from './components/GroupStageFinalStandingsScreen'
import { Header } from './components/Header'
import { HomeScreen } from './components/HomeScreen'
import { MatchSimulationScreen } from './components/MatchSimulationScreen'
import { TacticsScreen } from './components/TacticsScreen'
import { TournamentScreen } from './components/TournamentScreen'
import { playerById } from './data/players'
import { canRerollTeam } from './game/balance'
import { createDraftPickHistoryItem, getAvailableDraftTeams, getDraftTeam, updateRecentTeamIds, validateDraftPick } from './game/draft'
import { calculateGroupStandings, didUserQualifyFromGroup, USER_GROUP_TEAM_ID } from './game/groupStage'
import { createMatchSimulation } from './game/simulation'
import { createDefaultLineup, validateStartingLineup } from './game/squad'
import { applyMatch, opponentFor, stageFor } from './game/tournament'
import { campaignRepository } from './repository/campaignRepository'
import type { Difficulty, DraftTeam, Formation, GameCampaign, GamePlayer, MatchSimulationPlan, Opponent, Strategy } from './types'

export function App() {
  const [campaigns, setCampaigns] = useState(() => campaignRepository.list())
  const [campaign, setCampaign] = useState<GameCampaign | null>(null)
  const [formation, setFormation] = useState<Formation>('DIAMOND_3_1')
  const [strategy, setStrategy] = useState<Strategy>('Equilibrado')
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL')
  const [activeSimulation, setActiveSimulation] = useState<{ plan: MatchSimulationPlan; opponent: Opponent } | null>(null)
  const completedMatches = useRef(new Set<string>())

  const squad = useMemo(() => campaign?.playerIds.map((id) => playerById.get(id)).filter((player): player is GamePlayer => Boolean(player)) ?? [], [campaign])
  const draftTeam = useMemo(() => campaign?.selectedFormation ? getDraftTeam(campaign.id, squad, campaign.selectedFormation, campaign.teamRerollsUsed, campaign.recentTeamIds ?? []) : null, [campaign, squad])
  const hasAlternativeDraftTeam = useMemo(() => campaign?.selectedFormation ? getAvailableDraftTeams(campaign.id, squad, campaign.selectedFormation, campaign.recentTeamIds ?? []).length > 1 : false, [campaign, squad])
  const screenKey = activeSimulation
    ? 'match-simulation'
    : campaign
      ? `${campaign.id}-${campaign.status}-${campaign.currentStage}-${campaign.status === 'draft' ? `${campaign.playerIds.length}-${campaign.teamRerollsUsed}` : ''}`
      : 'home'

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [screenKey])

  function persist(next: GameCampaign) {
    const saved = campaignRepository.save(next)
    setCampaign(saved)
    setCampaigns(campaignRepository.list())
  }

  function startCampaign() {
    const next = campaignRepository.create()
    setCampaign(next)
    setCampaigns(campaignRepository.list())
    setFormation('DIAMOND_3_1')
    setStrategy('Equilibrado')
    setDifficulty('NORMAL')
    setActiveSimulation(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCampaign(next: GameCampaign) {
    setCampaign(next)
    setFormation(next.selectedFormation ?? 'DIAMOND_3_1')
    setStrategy(next.selectedStrategy ?? 'Equilibrado')
    setDifficulty(next.selectedDifficulty ?? 'NORMAL')
    setActiveSimulation(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectPlayer(player: GamePlayer, team: DraftTeam) {
    if (!campaign?.selectedFormation || validateDraftPick(player, squad, campaign.selectedFormation)) return
    const selectedAt = new Date().toISOString()
    const playerIds = [...campaign.playerIds, player.id]
    const completedSquad = [...squad, player]
    const complete = playerIds.length === 11
    const pickHistory = [
      ...(campaign.pickHistory ?? []),
      createDraftPickHistoryItem({
        pickNumber: (campaign.pickHistory?.length ?? 0) + 1,
        player,
        team,
        selectedAt,
      }),
    ]
    persist({
      ...campaign,
      playerIds,
      pickHistory,
      recentTeamIds: updateRecentTeamIds(campaign.recentTeamIds ?? [], [team.id]),
      draftCompletedAt: complete ? selectedAt : campaign.draftCompletedAt,
      starterIds: complete ? createDefaultLineup(completedSquad, campaign.selectedFormation) : [],
      status: complete ? 'draft_summary' : 'draft',
      updatedAt: selectedAt,
    })
  }

  function redrawDraftTeam() {
    if (!campaign?.selectedFormation || !hasAlternativeDraftTeam || !canRerollTeam(campaign.selectedDifficulty, campaign.teamRerollsUsed)) return
    persist({
      ...campaign,
      teamRerollsUsed: campaign.teamRerollsUsed + 1,
      recentTeamIds: draftTeam ? updateRecentTeamIds(campaign.recentTeamIds ?? [], [draftTeam.id]) : campaign.recentTeamIds,
      updatedAt: new Date().toISOString(),
    })
  }

  function confirmTactics() {
    if (!campaign) return
    persist({ ...campaign, selectedFormation: formation, selectedStrategy: strategy, selectedDifficulty: difficulty, teamRerollsUsed: 0, recentTeamIds: [], pickHistory: [], draftCompletedAt: undefined, status: 'draft', updatedAt: new Date().toISOString() })
  }

  function continueAfterDraftSummary() {
    if (!campaign?.selectedFormation || squad.length !== 11 || (campaign.pickHistory?.length ?? 0) !== 11) return
    const starterIds = campaign.starterIds.length > 0 ? campaign.starterIds : createDefaultLineup(squad, campaign.selectedFormation)
    persist({ ...campaign, starterIds, status: 'active', updatedAt: new Date().toISOString() })
  }

  function saveLineup(starterIds: string[]) {
    if (!campaign?.selectedFormation) return
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const bench = squad.filter((player) => player.position !== 'TECNICO' && !starterIds.includes(player.id))
    if (validateStartingLineup(starters, bench, campaign.selectedFormation).length > 0) return
    persist({ ...campaign, starterIds, updatedAt: new Date().toISOString() })
  }

  function saveStrategy(nextStrategy: Strategy) {
    if (!campaign) return
    setStrategy(nextStrategy)
    persist({ ...campaign, selectedStrategy: nextStrategy, updatedAt: new Date().toISOString() })
  }

  function playMatch() {
    if (!campaign?.selectedFormation || !campaign.selectedStrategy || activeSimulation) return
    const starters = squad.filter((player) => campaign.starterIds.includes(player.id))
    const bench = squad.filter((player) => player.position !== 'TECNICO' && !campaign.starterIds.includes(player.id))
    if (validateStartingLineup(starters, bench, campaign.selectedFormation).length > 0) return
    const opponent = opponentFor(campaign)
    const plan = createMatchSimulation(campaign.id, campaign.matches.length, squad, campaign.starterIds, campaign.selectedFormation, campaign.selectedStrategy, stageFor(campaign), campaign.losingStreak, campaign.selectedDifficulty)
    setActiveSimulation({ plan, opponent })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finishMatch(plan: MatchSimulationPlan) {
    if (!campaign || !plan.match || completedMatches.current.has(plan.match.id)) return
    completedMatches.current.add(plan.match.id)
    persist({ ...applyMatch(campaign, plan.match), starterIds: plan.starterIds })
  }

  function continueToKnockout() {
    if (!campaign) return
    const standings = calculateGroupStandings(campaign.groupTeams, campaign.groupMatches)
    if (!didUserQualifyFromGroup(standings, USER_GROUP_TEAM_ID)) return
    persist({ ...campaign, status: 'active', currentStage: 'Oitavas', updatedAt: new Date().toISOString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finishCampaignFromGroup() {
    if (!campaign) return
    persist({ ...campaign, status: 'eliminated', currentStage: 'Fase de grupos', updatedAt: new Date().toISOString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function deleteCampaign(id: string) {
    campaignRepository.remove(id)
    setCampaigns(campaignRepository.list())
  }

  function goHome() {
    setCampaign(null)
    setActiveSimulation(null)
    setCampaigns(campaignRepository.list())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let screen
  if (campaign && activeSimulation) {
    screen = <MatchSimulationScreen campaign={campaign} opponent={activeSimulation.opponent} plan={activeSimulation.plan} onFinished={finishMatch} onContinue={() => setActiveSimulation(null)} />
  } else if (!campaign) {
    screen = <HomeScreen campaigns={campaigns} onStart={startCampaign} onOpen={openCampaign} onDelete={deleteCampaign} />
  } else if (campaign.status === 'tactics') {
    screen = <TacticsScreen formation={formation} difficulty={difficulty} onFormation={setFormation} onDifficulty={setDifficulty} onConfirm={confirmTactics} />
  } else if (campaign.status === 'draft') {
    screen = <DraftScreen selected={squad} team={draftTeam} formation={campaign.selectedFormation!} difficulty={campaign.selectedDifficulty} teamRerollsUsed={campaign.teamRerollsUsed} hasAlternativeTeam={hasAlternativeDraftTeam} onRedraw={redrawDraftTeam} onSelect={selectPlayer} />
  } else if (campaign.status === 'draft_summary') {
    screen = <DraftSummaryScreen squad={squad} formation={campaign.selectedFormation!} pickHistory={campaign.pickHistory ?? []} onContinue={continueAfterDraftSummary} />
  } else if (campaign.status === 'active' && campaign.currentStage === 'Classificacao Final do Grupo') {
    const standings = calculateGroupStandings(campaign.groupTeams, campaign.groupMatches)
    screen = <GroupStageFinalStandingsScreen campaign={campaign} standings={standings} userTeamId={USER_GROUP_TEAM_ID} onContinueToKnockout={continueToKnockout} onFinishCampaign={finishCampaignFromGroup} />
  } else if (campaign.status === 'active') {
    const opponent = opponentFor(campaign)
    const bestPlayer = squad.filter((player) => player.position !== 'TECNICO').sort((a, b) => b.overall - a.overall)[0]
    screen = <TournamentScreen campaign={campaign} opponent={opponent} squad={squad} bestPlayer={bestPlayer} onPlay={playMatch} onSaveLineup={saveLineup} onStrategy={saveStrategy} />
  } else {
    screen = <FinalScreen campaign={campaign} onNew={startCampaign} onHome={goHome} />
  }

  return <div className="app"><Header onHome={goHome} compact={Boolean(campaign)} />{screen}<footer><span>ESQUADRÃO IMORTAL</span><p>Uma experiência original de estratégia esportiva. Futsal, tática e emoção.</p></footer></div>
}
