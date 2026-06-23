import type { AthletePosition, Formation, FutsalPosition } from '../types'

export interface FutsalFormation {
  id: Formation
  name: string
  label: string
  starters: Record<AthletePosition, number>
  requiresCoach: true
}

export const FUTSAL_FORMATIONS: Record<Formation, FutsalFormation> = {
  DIAMOND_3_1: { id: 'DIAMOND_3_1', name: 'Sistema 3x1', label: 'Diamante', starters: { GOLEIRO: 1, FIXO: 1, ALA: 2, PIVO: 1 }, requiresCoach: true },
  SQUARE_2_2: { id: 'SQUARE_2_2', name: 'Sistema 2x2', label: 'Quadrado', starters: { GOLEIRO: 1, FIXO: 2, ALA: 2, PIVO: 0 }, requiresCoach: true },
  FOUR_ZERO: { id: 'FOUR_ZERO', name: 'Sistema 4x0', label: '4x0', starters: { GOLEIRO: 1, FIXO: 0, ALA: 4, PIVO: 0 }, requiresCoach: true },
  THREE_TWO: { id: 'THREE_TWO', name: 'Sistema 3x2', label: '3x2', starters: { GOLEIRO: 1, FIXO: 3, ALA: 1, PIVO: 0 }, requiresCoach: true },
}

export const ATHLETE_POSITIONS: AthletePosition[] = ['GOLEIRO', 'FIXO', 'ALA', 'PIVO']

export function getRequiredSquadByFormation(formation: Formation): Record<FutsalPosition, number> {
  const starters = FUTSAL_FORMATIONS[formation].starters
  return {
    GOLEIRO: starters.GOLEIRO * 2,
    FIXO: starters.FIXO * 2,
    ALA: starters.ALA * 2,
    PIVO: starters.PIVO * 2,
    TECNICO: 1,
  }
}

export function formationTitle(formation: Formation) {
  const item = FUTSAL_FORMATIONS[formation]
  return `${item.name} · ${item.label}`
}
