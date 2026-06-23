import { useMemo, useState } from 'react'
import { DraftScreen } from './components/DraftScreen'
import { FinalScreen } from './components/FinalScreen'
import { Header } from './components/Header'
import { HomeScreen } from './components/HomeScreen'
import { TacticsScreen } from './components/TacticsScreen'
import { TournamentScreen } from './components/TournamentScreen'
import { playerById } from './data/players'
import { getDraftOptions } from './game/draft'
import { simulateMatch } from './game/simulation'
import { applyMatch, opponentFor, stageFor } from './game/tournament'
import { campaignRepository } from './repository/campaignRepository'
import type { Formation, GameCampaign, GameMatch, GamePlayer, Strategy } from './types'

export function App() {
  const [campaigns, setCampaigns] = useState(() => campaignRepository.list())
  const [campaign, setCampaign] = useState<GameCampaign | null>(null)
  const [formation, setFormation] = useState<Formation>('4-3-3')
  const [strategy, setStrategy] = useState<Strategy>('Equilibrado')
  const [lastMatch, setLastMatch] = useState<GameMatch | null>(null)
  const [simulating, setSimulating] = useState(false)

  const squad = useMemo(() => campaign?.playerIds.map((id) => playerById.get(id)).filter((player): player is GamePlayer => Boolean(player)) ?? [], [campaign])
  const options = useMemo(() => campaign ? getDraftOptions(campaign.id, campaign.playerIds) : [], [campaign])

  function persist(next: GameCampaign) {
    campaignRepository.save(next)
    setCampaign(next)
    setCampaigns(campaignRepository.list())
  }

  function startCampaign() {
    const next = campaignRepository.create()
    setCampaign(next)
    setCampaigns(campaignRepository.list())
    setLastMatch(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCampaign(next: GameCampaign) {
    setCampaign(next)
    setFormation(next.selectedFormation ?? '4-3-3')
    setStrategy(next.selectedStrategy ?? 'Equilibrado')
    setLastMatch(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectPlayer(player: GamePlayer) {
    if (!campaign || campaign.playerIds.includes(player.id)) return
    const playerIds = [...campaign.playerIds, player.id]
    persist({ ...campaign, playerIds, status: playerIds.length === 11 ? 'tactics' : 'draft', updatedAt: new Date().toISOString() })
  }

  function confirmTactics() {
    if (!campaign) return
    persist({ ...campaign, selectedFormation: formation, selectedStrategy: strategy, status: 'active', updatedAt: new Date().toISOString() })
  }

  function playMatch() {
    if (!campaign || !campaign.selectedFormation || !campaign.selectedStrategy || simulating) return
    setSimulating(true)
    window.setTimeout(() => {
      const opponent = opponentFor(campaign)
      const stage = stageFor(campaign)
      const match = simulateMatch(campaign.id, campaign.matches.length, squad, campaign.selectedFormation!, campaign.selectedStrategy!, opponent, stage)
      const next = applyMatch(campaign, match)
      persist(next)
      setLastMatch(match)
      setSimulating(false)
    }, 1300)
  }

  function deleteCampaign(id: string) {
    campaignRepository.remove(id)
    setCampaigns(campaignRepository.list())
  }

  function goHome() {
    setCampaign(null)
    setLastMatch(null)
    setCampaigns(campaignRepository.list())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  let screen
  if (!campaign) {
    screen = <HomeScreen campaigns={campaigns} onStart={startCampaign} onOpen={openCampaign} onDelete={deleteCampaign} />
  } else if (campaign.status === 'draft') {
    screen = <DraftScreen selected={squad} options={options} onSelect={selectPlayer} />
  } else if (campaign.status === 'tactics') {
    screen = <TacticsScreen squad={squad} formation={formation} strategy={strategy} onFormation={setFormation} onStrategy={setStrategy} onConfirm={confirmTactics} />
  } else if (campaign.status === 'active') {
    const opponent = opponentFor(campaign)
    const bestPlayer = [...squad].sort((a, b) => b.overall - a.overall)[0]
    screen = <TournamentScreen campaign={campaign} opponent={opponent} lastMatch={lastMatch} bestPlayer={bestPlayer} simulating={simulating} onPlay={playMatch} onDismissResult={() => setLastMatch(null)} />
  } else {
    screen = <FinalScreen campaign={campaign} onNew={startCampaign} onHome={goHome} />
  }

  return <div className="app"><Header onHome={goHome} compact={Boolean(campaign)} />{screen}<footer><span>ESQUADRÃO IMORTAL</span><p>Uma experiência original de estratégia esportiva. Sem apostas, apenas futebol.</p></footer></div>
}
