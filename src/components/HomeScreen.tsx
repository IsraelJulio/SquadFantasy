import type { GameCampaign } from '../types'

interface HomeScreenProps { campaigns: GameCampaign[]; onStart: () => void; onOpen: (campaign: GameCampaign) => void; onDelete: (id: string) => void }

const statusLabel: Record<GameCampaign['status'], string> = { draft: 'Draft em andamento', tactics: 'Definir sistema', active: 'Copa em andamento', champion: 'Campeão', eliminated: 'Encerrada' }

export function HomeScreen({ campaigns, onStart, onOpen, onDelete }: HomeScreenProps) {
  return (
    <main>
      <section className="hero">
        <div className="hero__content">
          <div className="eyebrow"><span /> MONTE. COMANDE. CONQUISTE.</div>
          <h1>4Fantasy<br /><em>Legends</em></h1>
          <p>Escolha 10 entre os ex-jogadores da Fantasy e comande seu time rumo a glória eterna.</p>
          <div className="hero__actions"><button className="button button--primary" onClick={onStart}>Começar campanha <span>→</span></button>{campaigns.length > 0 && <a className="button button--ghost" href="#campanhas">Ver minhas campanhas</a>}</div>
          {/* <div className="hero__facts"><span><b>80</b> nomes originais</span><span><b>11</b> contratações</span><span><b>40</b> minutos por jogo</span></div> */}
        </div>
        <div className="hero__visual" aria-hidden="true"><div className="orb orb--one" /><div className="orb orb--two" /><div className="trophy"><span className="trophy__star">★</span><span className="trophy__cup">♛</span><span className="trophy__base" /></div><span className="year-tag year-tag--one">3×1</span><span className="year-tag year-tag--two">2×2</span><span className="year-tag year-tag--three">4×0</span></div>
      </section>
      <section className="how-it-works"><div className="section-heading"><span>COMO FUNCIONA</span><h2>Seu caminho até a taça</h2></div><div className="steps"><article><b>01</b><span className="step-icon">◇</span><h3>Defina o sistema</h3><p>Escolha a formação; ela determina as posições necessárias no draft.</p></article><article><b>02</b><span className="step-icon">⇄</span><h3>Monte e escale</h3><p>Contrate 10 atletas e 1 técnico, depois organize titulares e reservas.</p></article><article><b>03</b><span className="step-icon">◎</span><h3>Comande a partida</h3><p>Faça substituições ilimitadas e acompanhe cada minuto da Copa.</p></article></div></section>
      {campaigns.length > 0 && <section className="campaigns" id="campanhas"><div className="section-heading"><span>SALVAMENTO LOCAL</span><h2>Minhas campanhas</h2></div><div className="campaign-list">{campaigns.map((campaign) => <article className="campaign-row" key={campaign.id}><div className="campaign-row__icon">{campaign.status === 'champion' ? '★' : 'EI'}</div><div><strong>{statusLabel[campaign.status]}</strong><span>{campaign.playerIds.length}/11 contratações · {campaign.matches.length} partidas</span></div><span className={`status status--${campaign.status}`}>{campaign.currentStage}</span><button className="text-button" onClick={() => onOpen(campaign)}>Continuar →</button><button className="icon-button" onClick={() => onDelete(campaign.id)} aria-label="Excluir campanha">×</button></article>)}</div></section>}
    </main>
  )
}
