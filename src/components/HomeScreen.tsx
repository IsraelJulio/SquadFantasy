import type { GameCampaign } from '../types'

interface HomeScreenProps {
  campaigns: GameCampaign[]
  onStart: () => void
  onOpen: (campaign: GameCampaign) => void
  onDelete: (id: string) => void
}

const statusLabel: Record<GameCampaign['status'], string> = {
  draft: 'Draft em andamento', tactics: 'Definir tática', active: 'Copa em andamento', champion: 'Campeão', eliminated: 'Encerrada',
}

export function HomeScreen({ campaigns, onStart, onOpen, onDelete }: HomeScreenProps) {
  return (
    <main>
      <section className="hero">
        <div className="hero__content">
          <div className="eyebrow"><span /> MONTE. COMANDE. CONQUISTE.</div>
          <h1>Onze lendas.<br /><em>Uma história.</em></h1>
          <p>Escolha craques de diferentes eras, encontre a tática ideal e conduza seu esquadrão até a glória mundial.</p>
          <div className="hero__actions">
            <button className="button button--primary" onClick={onStart}>Começar draft <span>→</span></button>
            {campaigns.length > 0 && <a className="button button--ghost" href="#campanhas">Ver minhas campanhas</a>}
          </div>
          <div className="hero__facts">
            <span><b>80</b> craques originais</span><span><b>11</b> escolhas</span><span><b>7</b> jogos até a taça</span>
          </div>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="orb orb--one" /><div className="orb orb--two" />
          <div className="trophy"><span className="trophy__star">★</span><span className="trophy__cup">♛</span><span className="trophy__base" /></div>
          <span className="year-tag year-tag--one">1958</span><span className="year-tag year-tag--two">1986</span><span className="year-tag year-tag--three">2022</span>
        </div>
      </section>

      <section className="how-it-works">
        <div className="section-heading"><span>COMO FUNCIONA</span><h2>Seu caminho até a taça</h2></div>
        <div className="steps">
          <article><b>01</b><span className="step-icon">✦</span><h3>Monte seu elenco</h3><p>A cada rodada, escolha um entre quatro craques de uma era histórica.</p></article>
          <article><b>02</b><span className="step-icon">⌁</span><h3>Defina a estratégia</h3><p>Formação e estilo de jogo mudam a força e o equilíbrio da equipe.</p></article>
          <article><b>03</b><span className="step-icon">◎</span><h3>Dispute a Copa</h3><p>Supere a fase de grupos e quatro confrontos eliminatórios.</p></article>
        </div>
      </section>

      {campaigns.length > 0 && (
        <section className="campaigns" id="campanhas">
          <div className="section-heading"><span>SALVAMENTO LOCAL</span><h2>Minhas campanhas</h2></div>
          <div className="campaign-list">
            {campaigns.map((campaign) => (
              <article className="campaign-row" key={campaign.id}>
                <div className="campaign-row__icon">{campaign.status === 'champion' ? '★' : 'EI'}</div>
                <div><strong>{statusLabel[campaign.status]}</strong><span>{campaign.playerIds.length}/11 jogadores · {campaign.matches.length} partidas</span></div>
                <span className={`status status--${campaign.status}`}>{campaign.currentStage}</span>
                <button className="text-button" onClick={() => onOpen(campaign)}>Continuar →</button>
                <button className="icon-button" onClick={() => onDelete(campaign.id)} aria-label="Excluir campanha">×</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
