import { useMemo, useRef, useState } from 'react'
import { DraftScreen } from './components/DraftScreen'
import { FinalScreen } from './components/FinalScreen'
import { Header } from './components/Header'
import { HomeScreen } from './components/HomeScreen'
import { MatchSimulationScreen } from './components/MatchSimulationScreen'
import { TacticsScreen } from './components/TacticsScreen'
import { TournamentScreen } from './components/TournamentScreen'
import { playerById } from './data/players'
import { getDraftOptions, validateDraftPick } from './game/draft'
import { createMatchSimulation } from './game/simulation'
import { createDefaultLineup, validateStartingLineup } from './game/squad'
import { applyMatch, opponentFor, stageFor } from './game/tournament'
import { campaignRepository } from './repository/campaignRepository'
import type { Formation, GameCampaign, GamePlayer, MatchSimulationPlan, Opponent, Strategy } from './types'

export function App() {
  const [campaigns, setCampaigns] = useState(() => campaignRepository.list())
  const [campaign, setCampaign] = useState<GameCampaign | null>(null)
  const [formation, setFormation] = useState<Formation>('DIAMOND_3_1')
  const [strategy, setStrategy] = useState<Strategy>('Equilibrado')
  const [activeSimulation, setActiveSimulation] = useState<{ plan: MatchSimulationPlan; opponent: Opponent } | null>(null)
  const completedMatches = useRef(new Set<string>())

  const squad = useMemo(() => campaign?.playerIds.map((id) => playerById.get(id)).filter((player): player is GamePlayer => Boolean(player)) ?? [], [campaign])
  const options = useMemo(() => campaign?.selectedFormation ? getDraftOptions(campaign.id, campaign.playerIds, campaign.selectedFormation) : [], [campaign])

  function persist(next: GameCampaign) {
    campaignRepository.save(next)
    setCampaign(next)
    setCampaigns(campaignRepository.list())
  }

  function startCampaign() {
    const next = campaignRepository.create()
    setCampaign(next)
    setCampaigns(campaignRepository.list())
    setFormation('DIAMOND_3_1')
    setStrategy('Equilibrado')
    setActiveSimulation(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCampaign(next: GameCampaign) {
    setCampaign(next)
    setFormation(next.selectedFormation ?? 'DIAMOND_3_1')
    setStrategy(next.selectedStrategy ?? 'Equilibrado')
    setActiveSimulation(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectPlayer(player: GamePlayer) {
    if (!campaign?.selectedFormation || validateDraftPick(player, squad, campaign.selectedFormation)) return
    const playerIds = [...campaign.playerIds, player.id]
    const completedSquad = [...squad, player]
    const complete = playerIds.length === 11
    persist({
      ...campaign,
      playerIds,
      starterIds: complete ? createDefaultLineup(completedSquad, campaign.selectedFormation) : [],
      status: complete ? 'active' : 'draft',
      updatedAt: new Date().toISOString(),
    })
  }

  function confirmTactics() {
    if (!campaign) return
    persist({ ...campaign, selectedFormation: formation, selectedStrategy: strategy, status: 'draft', updatedAt: new Date().toISOString() })
  }

  function saveLineup(starterIds: string[]) {
    if (!campaign?.selectedFormation) return
    const starters = squad.filter((player) => starterIds.includes(player.id))
    const bench = squad.filter((player) => player.position !== 'TECNICO' && !starterIds.includes(player.id))
    if (validateStartingLineup(starters, bench, campaign.selectedFormation).length > 0) return
    persist({ ...campaign, starterIds, updatedAt: new Date().toISOString() })
  }

  function playMatch() {
    if (!campaign?.selectedFormation || !campaign.selectedStrategy || activeSimulation) return
    const starters = squad.filter((player) => campaign.starterIds.includes(player.id))
    const bench = squad.filter((player) => player.position !== 'TECNICO' && !campaign.starterIds.includes(player.id))
    if (validateStartingLineup(starters, bench, campaign.selectedFormation).length > 0) return
    const opponent = opponentFor(campaign)
    const plan = createMatchSimulation(campaign.id, campaign.matches.length, squad, campaign.starterIds, campaign.selectedFormation, campaign.selectedStrategy, stageFor(campaign), campaign.losingStreak)
    setActiveSimulation({ plan, opponent })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function finishMatch(plan: MatchSimulationPlan) {
    if (!campaign || !plan.match || completedMatches.current.has(plan.match.id)) return
    completedMatches.current.add(plan.match.id)
    persist({ ...applyMatch(campaign, plan.match), starterIds: plan.starterIds })
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
    screen = <TacticsScreen formation={formation} strategy={strategy} onFormation={setFormation} onStrategy={setStrategy} onConfirm={confirmTactics} />
  } else if (campaign.status === 'draft') {
    screen = <DraftScreen selected={squad} options={options} formation={campaign.selectedFormation!} onSelect={selectPlayer} />
  } else if (campaign.status === 'active') {
    const opponent = opponentFor(campaign)
    const bestPlayer = squad.filter((player) => player.position !== 'TECNICO').sort((a, b) => b.overall - a.overall)[0]
    screen = <TournamentScreen campaign={campaign} opponent={opponent} squad={squad} bestPlayer={bestPlayer} onPlay={playMatch} onSaveLineup={saveLineup} />
  } else {
    screen = <FinalScreen campaign={campaign} onNew={startCampaign} onHome={goHome} />
  }

  return <div className="app"><Header onHome={goHome} compact={Boolean(campaign)} />{screen}<footer><span>ESQUADRÃO IMORTAL</span><p>Uma experiência original de estratégia esportiva. Futsal, tática e emoção.</p></footer></div>
}
