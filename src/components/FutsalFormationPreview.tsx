import { formationTitle } from '../game/formations'
import { getFormationPreviewMarkers } from '../game/formationPreview'
import type { Formation } from '../types'

interface FutsalFormationPreviewProps {
  formation: Formation
}

export function FutsalFormationPreview({ formation }: FutsalFormationPreviewProps) {
  const markers = getFormationPreviewMarkers(formation)
  const title = formationTitle(formation)

  return (
    <section className="formation-preview" aria-labelledby="formation-preview-title">
      <header className="formation-preview__header">
        <div>
          <span>POSICIONAMENTO EM QUADRA</span>
          <h2 id="formation-preview-title">{title}</h2>
        </div>
        <small>Defesa <i aria-hidden="true">→</i> Ataque</small>
      </header>
      <div className="futsal-court" role="img" aria-label={`Pré-visualização do ${title}`} data-formation={formation}>
        <svg className="futsal-court__lines" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="97" height="147" rx="1.5" />
          <line x1="1.5" y1="75" x2="98.5" y2="75" />
          <ellipse cx="50" cy="75" rx="15" ry="15" />
          <circle cx="50" cy="75" r="0.8" className="futsal-court__spot" />
          <path d="M 24 1.5 C 24 28, 76 28, 76 1.5" />
          <path d="M 24 148.5 C 24 122, 76 122, 76 148.5" />
          <rect x="39" y="1.5" width="22" height="7" />
          <rect x="39" y="141.5" width="22" height="7" />
          <circle cx="50" cy="18" r="0.8" className="futsal-court__spot" />
          <circle cx="50" cy="132" r="0.8" className="futsal-court__spot" />
        </svg>
        {markers.map((marker, index) => (
          <span
            className={`formation-marker formation-marker--${marker.label.toLowerCase()}`}
            key={marker.id}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            aria-label={`${marker.label} ${index + 1}`}
          >
            {marker.label}
          </span>
        ))}
        <span className="futsal-court__direction" aria-hidden="true">ATAQUE ↑</span>
      </div>
    </section>
  )
}
