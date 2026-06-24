import type { Formation } from '../types'

export type FormationPreviewLabel = 'GOL' | 'FIXO' | 'ALA' | 'PIVO'

export interface FormationPreviewMarker {
  id: string
  label: FormationPreviewLabel
  x: number
  y: number
}

const formationMarkers: Record<Formation, FormationPreviewMarker[]> = {
  DIAMOND_3_1: [
    { id: 'diamond-goalkeeper', label: 'GOL', x: 50, y: 88 },
    { id: 'diamond-defender', label: 'FIXO', x: 50, y: 68 },
    { id: 'diamond-left-wing', label: 'ALA', x: 25, y: 48 },
    { id: 'diamond-right-wing', label: 'ALA', x: 75, y: 48 },
    { id: 'diamond-pivot', label: 'PIVO', x: 50, y: 20 },
  ],
  SQUARE_2_2: [
    { id: 'square-goalkeeper', label: 'GOL', x: 50, y: 88 },
    { id: 'square-left-defender', label: 'FIXO', x: 29, y: 67 },
    { id: 'square-right-defender', label: 'FIXO', x: 71, y: 67 },
    { id: 'square-left-wing', label: 'ALA', x: 29, y: 35 },
    { id: 'square-right-wing', label: 'ALA', x: 71, y: 35 },
  ],
  FOUR_ZERO: [
    { id: 'four-zero-goalkeeper', label: 'GOL', x: 50, y: 88 },
    { id: 'four-zero-left-support', label: 'ALA', x: 27, y: 63 },
    { id: 'four-zero-right-support', label: 'ALA', x: 73, y: 63 },
    { id: 'four-zero-left-attack', label: 'ALA', x: 27, y: 33 },
    { id: 'four-zero-right-attack', label: 'ALA', x: 73, y: 33 },
  ],
  THREE_TWO: [
    { id: 'three-two-goalkeeper', label: 'GOL', x: 50, y: 88 },
    { id: 'three-two-left-defender', label: 'FIXO', x: 23, y: 62 },
    { id: 'three-two-central-defender', label: 'FIXO', x: 50, y: 71 },
    { id: 'three-two-right-defender', label: 'FIXO', x: 77, y: 62 },
    { id: 'three-two-wing', label: 'ALA', x: 50, y: 31 },
  ],
}

export function getFormationPreviewMarkers(formation: Formation): FormationPreviewMarker[] {
  return formationMarkers[formation]
}
