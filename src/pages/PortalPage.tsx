import { ArrowRight, Eye, Map, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/AsyncState'
import { PublicHeader } from '../components/Layouts'
import { MapImageModal } from '../components/MapImageModal'
import { useTerritories } from '../hooks/useTerritories'
import { normalizeId, territoryHouseStats } from '../lib/territory'

export function PortalPage() {
  const { territories, loading, error } = useTerritories()
  const [query, setQuery] = useState('')
  const [imageId, setImageId] = useState<string>()
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return territories
    return territories.filter((territory) => territory.id.includes(term) || territory.name.toLocaleLowerCase('pt-BR').includes(term))
  }, [query, territories])

  return (
    <div className="public-page public-page--muted">
      <PublicHeader />
      <main className="portal-main">
        <section className="page-heading page-heading--split">
          <div>
            <p className="eyebrow">Portal público</p>
            <h1>Escolha um território</h1>
            <p>Consulte quadras, ruas, casas e mapas atualizados.</p>
          </div>
          <label className="search-field">
            <Search size={20} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por número ou nome" />
            {query && <button onClick={() => setQuery('')} aria-label="Limpar busca"><X size={17} /></button>}
          </label>
        </section>

        {loading && <LoadingState message="Carregando territórios…" />}
        {error && <ErrorState message={error} />}

        {!loading && !error && (
          <>
            <div className="portal-results"><strong>{filtered.length}</strong> territórios encontrados</div>
            <section className="territory-grid">
              {filtered.map((territory) => {
                const stats = territoryHouseStats(territory)
                return (
                  <article className="territory-card" key={territory.id}>
                    <div className="territory-card__top">
                      <span className="territory-number">{normalizeId(territory.id)}</span>
                      <button className="icon-button icon-button--soft" onClick={() => setImageId(territory.id)} title="Ver mapa em imagem"><Eye size={19} /></button>
                    </div>
                    <div className="territory-card__body">
                      <small>TERRITÓRIO {normalizeId(territory.id)}</small>
                      <h2>{territory.name}</h2>
                      <p><Map size={15} /> {territory.blocks.length} quadras · {stats.total} casas</p>
                    </div>
                    <div className="territory-card__progress">
                      <span><i style={{ width: `${stats.progress}%` }} /></span>
                      <small>{stats.progress}% visitado</small>
                    </div>
                    <Link to={`/territorio/${territory.id}`}>Abrir território <ArrowRight size={17} /></Link>
                  </article>
                )
              })}
            </section>
            {!filtered.length && <div className="empty-state"><Search /><h2>Nenhum território encontrado</h2><p>Tente buscar usando outro nome ou número.</p></div>}
          </>
        )}
      </main>
      <MapImageModal territoryId={imageId} open={Boolean(imageId)} onClose={() => setImageId(undefined)} />
    </div>
  )
}
