import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getFormationPreviewMarkers } from '../game/formationPreview'
import type { Formation } from '../types'
import { FutsalFormationPreview } from './FutsalFormationPreview'

describe('FutsalFormationPreview', () => {
  it.each<[Formation, Record<string, number>]>([
    ['DIAMOND_3_1', { GOL: 1, FIXO: 1, ALA: 2, PIVO: 1 }],
    ['SQUARE_2_2', { GOL: 1, FIXO: 2, ALA: 2, PIVO: 0 }],
    ['FOUR_ZERO', { GOL: 1, FIXO: 0, ALA: 4, PIVO: 0 }],
    ['THREE_TWO', { GOL: 1, FIXO: 3, ALA: 1, PIVO: 0 }],
  ])('desenha os cinco atletas do sistema %s', (formation, expected) => {
    const markers = getFormationPreviewMarkers(formation)
    expect(markers).toHaveLength(5)
    expect(markers.every(({ x, y }) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true)
    for (const [label, count] of Object.entries(expected)) {
      expect(markers.filter((marker) => marker.label === label)).toHaveLength(count)
    }
  })

  it('atualiza os marcadores quando a formação muda', () => {
    const { rerender } = render(<FutsalFormationPreview formation="DIAMOND_3_1" />)
    expect(screen.getByRole('img', { name: /Sistema 3x1/ })).toHaveAttribute('data-formation', 'DIAMOND_3_1')
    expect(screen.getByText('PIVO')).toBeInTheDocument()

    rerender(<FutsalFormationPreview formation="FOUR_ZERO" />)
    expect(screen.getByRole('img', { name: /Sistema 4x0/ })).toHaveAttribute('data-formation', 'FOUR_ZERO')
    expect(screen.queryByText('PIVO')).not.toBeInTheDocument()
    expect(screen.getAllByText('ALA')).toHaveLength(4)
  })
})
