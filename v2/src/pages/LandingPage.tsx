import { ArrowRight, ClipboardCheck, MapPinned, Route, ShieldCheck, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicHeader } from '../components/Layouts'

export function LandingPage() {
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="hero__content">
            <p className="eyebrow">Organização simples, trabalho em conjunto</p>
            <h1>Territórios claros.<br /><em>Progresso visível.</em></h1>
            <p className="hero__lead">Consulte mapas, encontre ruas e atualize as casas visitadas em uma experiência rápida para celular e computador.</p>
            <div className="hero__actions">
              <Link className="button button--primary button--large" to="/portal">Abrir territórios <ArrowRight size={19} /></Link>
              <Link className="button button--ghost button--large" to="/admin/painel">Acessar administração</Link>
            </div>
            <div className="hero__proof">
              <span><Smartphone size={17} /> Feito para celular</span>
              <span><ShieldCheck size={17} /> Dados preservados</span>
              <span><Route size={17} /> Atualização em tempo real</span>
            </div>
          </div>
          <div className="hero__visual" aria-hidden="true">
            <div className="map-art">
              <span className="map-art__road map-art__road--one" />
              <span className="map-art__road map-art__road--two" />
              <span className="map-art__road map-art__road--three" />
              <span className="map-art__pin map-art__pin--one"><MapPinned /></span>
              <span className="map-art__pin map-art__pin--two"><ClipboardCheck /></span>
              <div className="map-art__card"><small>PROGRESSO DA SEMANA</small><strong>82%</strong><span><i style={{ width: '82%' }} /></span><p>37 de 45 quadras concluídas</p></div>
            </div>
          </div>
        </section>
        <section className="landing-features">
          <article><MapPinned /><div><strong>Um portal para todos</strong><p>Os 50 territórios são carregados a partir do banco, sem páginas duplicadas.</p></div></article>
          <article><ClipboardCheck /><div><strong>Status confiável</strong><p>Casas visitadas e locais onde não se deve bater continuam sincronizados.</p></div></article>
          <article><Route /><div><strong>Rotas e mapas</strong><p>Imagens, links e trajetos ficam disponíveis apenas quando necessários.</p></div></article>
        </section>
      </main>
    </div>
  )
}

