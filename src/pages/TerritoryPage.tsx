import { ArrowLeft, Check, ChevronRight, ExternalLink, Image, Info, Map, MapPinned } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/AsyncState'
import { MapImageModal } from '../components/MapImageModal'
import { Modal } from '../components/Modal'
import { useToast } from '../contexts/ToastContext'
import { useTerritory } from '../hooks/useTerritories'
import { houseNumbers, houseStatusLabel, normalizeId } from '../lib/territory'
import { setHouseStatus } from '../lib/territoryRepository'
import type { GlobalMapData, HouseStatus, StreetMapData } from '../types'

const GlobalTerritoryMap = lazy(() => import('../components/TerritoryMap').then((module) => ({ default: module.GlobalTerritoryMap })))
const StreetTerritoryMap = lazy(() => import('../components/TerritoryMap').then((module) => ({ default: module.StreetTerritoryMap })))

interface PendingHouse { block: string; street: string; house: string; current: HouseStatus }

export function TerritoryPage() {
  const { id } = useParams()
  const { territory, loading, error } = useTerritory(id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [imageOpen, setImageOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [pendingHouse, setPendingHouse] = useState<PendingHouse>()
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const blockName = params.get('quadra') ?? ''
  const streetName = params.get('rua') ?? ''

  const block = useMemo(() => territory?.blocks.find((item) => String(item.name) === blockName), [blockName, territory])
  const street = useMemo(() => block?.streets?.find((item) => item.name === streetName), [block, streetName])

  function selectBlock(name: string) {
    setMapOpen(false)
    setParams({ quadra: name })
  }
  function selectStreet(name: string) {
    setMapOpen(false)
    setParams({ quadra: blockName, rua: name })
  }

  async function confirmHouseChange() {
    if (!id || !pendingHouse) return
    setSaving(true)
    try {
      await setHouseStatus(
        id,
        pendingHouse.block,
        pendingHouse.street,
        pendingHouse.house,
        pendingHouse.current === 'DONE' ? null : 'DONE',
      )
      toast(pendingHouse.current === 'DONE' ? 'Casa marcada como pendente.' : 'Casa marcada como visitada.', 'success')
      setPendingHouse(undefined)
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Não foi possível atualizar a casa.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="public-page territory-page"><LoadingState message="Carregando território…" /></div>
  if (error) return <div className="public-page territory-page"><ErrorState message={error} /></div>
  if (!territory) return <div className="public-page territory-page"><main className="empty-state"><MapPinned /><h1>Território não encontrado</h1><Link className="button button--primary" to="/portal">Voltar ao portal</Link></main></div>

  const globalMap = territory.mapData?.global as GlobalMapData | undefined
  const blockMap = blockName ? territory.mapData?.[blockName] as Record<string, StreetMapData> | undefined : undefined
  const streetMap = blockName && streetName ? blockMap?.[streetName] : undefined

  return (
    <div className="public-page public-page--muted territory-page">
      <main className="territory-view">
        <div className="territory-toolbar">
          <button className="button button--ghost button--small" onClick={() => streetName ? setParams({ quadra: blockName }) : blockName ? setParams({}) : navigate('/portal')}><ArrowLeft size={17} /> Voltar</button>
          <div>
            <span className="eyebrow">Território {normalizeId(territory.id)}</span>
            <h1>{territory.name}</h1>
            {(blockName || streetName) && <p>{blockName && `Quadra ${blockName}`}{streetName && ` · ${streetName}`}</p>}
          </div>
          <div className="territory-toolbar__actions">
            <button className="icon-button icon-button--soft" onClick={() => setInfoOpen(true)} title="Informações"><Info /></button>
            <button className="icon-button icon-button--soft" onClick={() => setImageOpen(true)} title="Mapa em imagem"><Image /></button>
          </div>
        </div>

        {!blockName && (
          <section className="territory-content">
            {globalMap && (
              <div className="map-toggle-panel">
                <button className="button button--secondary" onClick={() => setMapOpen((value) => !value)}><Map size={18} /> {mapOpen ? 'Ocultar mapa interativo' : 'Abrir mapa interativo'}</button>
                {mapOpen && <Suspense fallback={<LoadingState message="Abrindo mapa…" />}><GlobalTerritoryMap data={globalMap} onBlockSelect={selectBlock} /></Suspense>}
              </div>
            )}
            <div className="section-title"><div><p className="eyebrow">Escolha uma quadra</p><h2>{territory.blocks.length} quadras disponíveis</h2></div></div>
            <div className="block-grid">
              {territory.blocks.map((item) => (
                <button key={String(item.name)} className="block-card" onClick={() => selectBlock(String(item.name))}>
                  <span>{String(item.name)}</span>
                  <div><small>QUADRA</small><strong>{item.streets?.length ?? 0} ruas</strong></div>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </section>
        )}

        {blockName && !streetName && (
          <section className="territory-content">
            <div className="section-title"><div><p className="eyebrow">Quadra {blockName}</p><h2>Escolha uma rua</h2></div></div>
            <div className="street-list">
              {block?.streets?.map((item) => {
                const houses = houseNumbers(item.houses)
                return (
                  <article className="street-row" key={item.name}>
                    {item.mapLink ? <a href={item.mapLink} target="_blank" rel="noreferrer" className="street-map-link" title="Abrir mapa externo"><MapPinned /></a> : <span className="street-map-link is-muted"><MapPinned /></span>}
                    <button onClick={() => selectStreet(item.name)}>
                      <span><strong>{item.name}</strong><small>{houses.length ? `${houses.length} casas · ${houses[0]} até ${houses.at(-1)}` : 'Casas ainda não cadastradas'}</small></span>
                      <ChevronRight />
                    </button>
                  </article>
                )
              })}
              {!block?.streets?.length && <div className="inline-alert"><Info /> As ruas desta quadra ainda não foram cadastradas.</div>}
            </div>
          </section>
        )}

        {blockName && streetName && street && (
          <section className="territory-content">
            <div className="street-actions">
              <div><p className="eyebrow">Casas</p><h2>{houseNumbers(street.houses).length} endereços cadastrados</h2></div>
              <div>
                {street.mapLink && <a className="button button--ghost button--small" href={street.mapLink} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir rota</a>}
                <button className="button button--secondary button--small" onClick={() => setMapOpen((value) => !value)}><Map size={16} /> {mapOpen ? 'Ocultar mapa' : 'Ver mapa'}</button>
              </div>
            </div>
            {mapOpen && <Suspense fallback={<LoadingState message="Abrindo mapa…" />}><StreetTerritoryMap data={streetMap} /></Suspense>}
            <div className="legend"><span><i className="legend-pending" /> Pendente</span><span><i className="legend-done" /> Visitada</span><span><i className="legend-dnd" /> Não bater</span></div>
            <div className="house-grid">
              {houseNumbers(street.houses).map((house) => {
                const status = territory.status?.[blockName]?.[streetName]?.[house] ?? null
                return (
                  <button
                    key={house}
                    className={`house-button house-button--${status?.toLowerCase() || 'pending'}`}
                    onClick={() => status === 'DND' ? toast('Esta casa está marcada como “não bater”.') : setPendingHouse({ block: blockName, street: streetName, house, current: status })}
                    title={`${house}: ${houseStatusLabel(status)}`}
                  >
                    {status === 'DONE' && <Check size={18} />}
                    <strong>{['F', 'T', 'C', 'JW'].includes(status || '') ? status : house}</strong>
                    <small>{houseStatusLabel(status)}</small>
                  </button>
                )
              })}
            </div>
            {!houseNumbers(street.houses).length && <div className="inline-alert"><Info /> Os números desta rua ainda não foram cadastrados.</div>}
          </section>
        )}
      </main>

      <MapImageModal territoryId={territory.id} open={imageOpen} onClose={() => setImageOpen(false)} />
      <Modal title="Como usar este território" open={infoOpen} onClose={() => setInfoOpen(false)}>
        <div className="prose"><p>Abra uma quadra, escolha a rua e toque no número da casa para marcar ou desmarcar a visita.</p><p>Casas em vermelho estão marcadas como “não bater” e não podem ser alteradas pelo portal público.</p></div>
      </Modal>
      <Modal title={pendingHouse?.current === 'DONE' ? 'Desmarcar esta casa?' : 'Marcar como visitada?'} open={Boolean(pendingHouse)} onClose={() => setPendingHouse(undefined)}>
        <div className="confirm-content"><p>Casa <strong>{pendingHouse?.house}</strong>, {pendingHouse?.street}.</p><div><button className="button button--ghost" onClick={() => setPendingHouse(undefined)}>Cancelar</button><button className="button button--primary" disabled={saving} onClick={confirmHouseChange}>{saving ? 'Salvando…' : 'Confirmar'}</button></div></div>
      </Modal>
    </div>
  )
}
