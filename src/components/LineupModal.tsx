import { useState } from 'react'
import { formationTitle } from '../game/formations'
import { coachFrom, validateStartingLineup } from '../game/squad'
import type { Formation, GameAthlete, GamePlayer } from '../types'
import { SubstitutionModal } from './SubstitutionModal'

interface LineupModalProps {
  squad: GamePlayer[]
  formation: Formation
  initialStarterIds: string[]
  onConfirm: (starterIds: string[]) => void
  onClose: () => void
}

export function LineupModal({ squad, formation, initialStarterIds, onConfirm, onClose }: LineupModalProps) {
  const [starterIds, setStarterIds] = useState(initialStarterIds)
  const athletes = squad.filter((player): player is GameAthlete => player.position !== 'TECNICO')
  const starters = athletes.filter((player) => starterIds.includes(player.id))
  const bench = athletes.filter((player) => !starterIds.includes(player.id))
  const errors = validateStartingLineup(starters, bench, formation)

  function swapPlayers(playerOutId: string, playerInId: string) {
    setStarterIds((current) => current.map((id) => id === playerOutId ? playerInId : id))
  }

  return (
    <SubstitutionModal
      mode="pre_match"
      activePlayers={starters}
      benchPlayers={bench}
      coach={coachFrom(squad)}
      formationLabel={formationTitle(formation)}
      validationErrors={errors}
      onConfirm={swapPlayers}
      onClose={onClose}
      onSave={() => { onConfirm(starterIds); onClose() }}
    />
  )
}
