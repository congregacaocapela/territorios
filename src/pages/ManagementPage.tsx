import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download,
  Edit3,
  FileSpreadsheet,
  Info,
  ListRestart,
  MapPinned,
  Plus,
  Settings2,
  ShieldOff,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/AsyncState'
import { Modal } from '../components/Modal'
import { useToast } from '../contexts/ToastContext'
import { useTerritories } from '../hooks/useTerritories'
import { csvCell, downloadText } from '../lib/downloads'
import { houseNumbers, normalizeId, territoryHouseStats } from '../lib/territory'
import {
  createTerritory,
  deleteTerritory,
  resetTerritoryProgress,
  saveTerritoryCore,
  setHouseStatus,
  swapTerritories,
} from '../lib/territoryRepository'
import type { Territory, TerritoryBlock } from '../types'

function parseIds(input: string, available: string[]) {
  if (!input.trim()) return available
  const ids = new Set<string>()
  input.split(',').forEach((part) => {
    const value = part.trim()
    if (value.includes('-')) {
      const [start, end] = value.split('-').map(Number)
      if (Number.isFinite(start) && Number.isFinite(end)) {
        for (let id = start; id <= end; id += 1) ids.add(String(id))
      }
    } else if (value) ids.add(String(Number(value)))
  })
  return [...ids].filter((id) => available.includes(id))
}

function cloneTerritory(territory: Territory) {
  return structuredClone(territory)
}

export function ManagementPage() {
  const { territories, loading, error } = useTerritories()
  const toast = useToast()
  const [editItem, setEditItem] = useState<Territory>()
  const [detailItem, setDetailItem] = useState<Territory>()
  const [manageOpen, setManageOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [selection, setSelection] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'DONE' | 'DND' | 'EMPTY'>('all')
  const [busy, setBusy] = useState(false)

  const totals = useMemo(() => territories.reduce((acc, territory) => {
    const stats = territoryHouseStats(territory)
    acc.houses += stats.total
    acc.done += stats.done
    acc.dnd += stats.dnd
    return acc
  }, { houses: 0, done: 0, dnd: 0 }), [territories])

  async function saveEdit() {
    if (!editItem) return
    const name = editItem.name.trim()
    const blocks = editItem.blocks
      .map((block) => ({
        name: String(block.name).trim(),
        streets: (block.streets ?? []).map((street) => ({
          name: street.name.trim(),
          houses: street.houses?.trim() ?? '',
          mapLink: street.mapLink?.trim() ?? '',
        })).filter((street) => street.name),
      }))
      .filter((block) => block.name)
    if (!name) return toast('Informe o nome do território.', 'error')
    setBusy(true)
    try {
      await saveTerritoryCore(editItem.id, name, blocks)
      toast('Território atualizado.', 'success')
      setEditItem(undefined)
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao salvar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function addTerritory() {
    if (!newName.trim()) return
    const maxId = territories.reduce((max, item) => Math.max(max, Number(item.id)), 0)
    setBusy(true)
    try {
      await createTerritory(String(maxId + 1), newName.trim())
      setNewName('')
      setAddOpen(false)
      toast(`Território ${maxId + 1} criado.`, 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao criar território.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function removeTerritory(item: Territory) {
    if (!window.confirm(`Excluir o território ${item.id} – ${item.name}? Essa ação remove o documento do Firestore.`)) return
    try {
      await deleteTerritory(item.id)
      toast('Território excluído.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao excluir.', 'error')
    }
  }

  async function moveTerritory(index: number, direction: -1 | 1) {
    const target = territories[index + direction]
    if (!target) return
    try {
      await swapTerritories(territories[index].id, target.id)
      toast('Ordem atualizada.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao reordenar.', 'error')
    }
  }

  async function toggleDnd(territory: Territory, block: string, street: string, house: string) {
    const current = territory.status?.[block]?.[street]?.[house]
    try {
      await setHouseStatus(territory.id, block, street, house, current === 'DND' ? null : 'DND')
      toast(current === 'DND' ? 'Restrição removida.' : 'Casa marcada como “não bater”.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao atualizar.', 'error')
    }
  }

  function reportRows() {
    const ids = parseIds(selection, territories.map((item) => item.id))
    return territories.filter((item) => ids.includes(item.id)).flatMap((territory) => territory.blocks.flatMap((block) => {
      const blockName = String(block.name)
      return (block.streets ?? []).flatMap((street) => houseNumbers(street.houses).map((house) => {
        const status = territory.status?.[blockName]?.[street.name]?.[house] || 'EMPTY'
        return { territory, blockName, street, house, status }
      }))
    })).filter((row) => statusFilter === 'all' || row.status === statusFilter)
  }

  function exportCsv() {
    const header = ['Território ID', 'Nome', 'Quadra', 'Rua', 'Casa', 'Status']
    const rows = reportRows().map((row) => [
      row.territory.id,
      row.territory.name,
      row.blockName,
      row.street.name,
      row.house,
      row.status === 'DONE' ? 'Visitada' : row.status === 'DND' ? 'Não bater' : 'Pendente',
    ])
    downloadText([header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'), 'relatorio-casas.csv', 'text/csv;charset=utf-8')
    toast('Planilha gerada.', 'success')
  }

  async function resetSelected() {
    const ids = parseIds(selection, territories.map((item) => item.id))
    if (!ids.length) return toast('Nenhum território selecionado.', 'error')
    setBusy(true)
    try {
      await resetTerritoryProgress(ids)
      setResetOpen(false)
      toast('Casas visitadas foram zeradas; restrições “não bater” foram preservadas.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao zerar progresso.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState message="Carregando gestão…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="admin-content">
      <section className="admin-heading">
        <div><p className="eyebrow">Gestão de quadras e casas</p><h1>Visão geral dos territórios</h1><p>Dados sincronizados em tempo real com o banco atual.</p></div>
        <div className="admin-heading__actions">
          <button className="button button--ghost" onClick={() => setReportOpen(true)}><FileSpreadsheet size={18} /> Relatórios</button>
          <button className="button button--ghost" onClick={() => setManageOpen(true)}><Settings2 size={18} /> Organizar</button>
          <button className="button button--primary" onClick={() => setAddOpen(true)}><Plus size={18} /> Novo território</button>
        </div>
      </section>

      <section className="metric-grid">
        <article><span><MapPinned /></span><div><small>TERRITÓRIOS</small><strong>{territories.length}</strong></div></article>
        <article><span><BarChart3 /></span><div><small>CASAS CADASTRADAS</small><strong>{totals.houses}</strong></div></article>
        <article><span><Info /></span><div><small>VISITADAS</small><strong>{totals.done}</strong></div></article>
        <article><span><ShieldOff /></span><div><small>NÃO BATER</small><strong>{totals.dnd}</strong></div></article>
      </section>

      <section className="admin-toolbar"><h2>Todos os territórios</h2><button className="button button--danger-soft button--small" onClick={() => { setSelection(''); setResetOpen(true) }}><ListRestart size={16} /> Zerar progresso</button></section>
      <section className="manage-grid">
        {territories.map((territory) => {
          const stats = territoryHouseStats(territory)
          return (
            <article className="manage-card" key={territory.id}>
              <div className="manage-card__header"><span>{normalizeId(territory.id)}</span><button className="icon-button" onClick={() => setDetailItem(territory)}><Info size={18} /></button></div>
              <h3>{territory.name}</h3>
              <p>{territory.blocks.length} quadras · {stats.total} casas</p>
              <div className="progress-row"><span><i style={{ width: `${stats.progress}%` }} /></span><strong>{stats.progress}%</strong></div>
              <div className="manage-card__stats"><span><b>{stats.done}</b> visitadas</span><span><b>{stats.pending}</b> pendentes</span><span><b>{stats.dnd}</b> não bater</span></div>
              <div className="manage-card__actions"><button className="button button--ghost button--small" onClick={() => setEditItem(cloneTerritory(territory))}><Edit3 size={16} /> Editar</button><Link className="button button--secondary button--small" to={`/territorio/${territory.id}`}>Abrir</Link></div>
            </article>
          )
        })}
      </section>

      <Modal title={editItem ? `Editar território ${editItem.id}` : 'Editar território'} open={Boolean(editItem)} onClose={() => setEditItem(undefined)}>
        {editItem && <TerritoryEditor territory={editItem} onChange={setEditItem} />}
        <div className="modal-footer"><button className="button button--ghost" onClick={() => setEditItem(undefined)}>Cancelar</button><button className="button button--primary" disabled={busy} onClick={saveEdit}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
      </Modal>

      <Modal title="Detalhes e restrições" open={Boolean(detailItem)} onClose={() => setDetailItem(undefined)}>
        {detailItem && <div className="restriction-list">
          <p>Marque as casas nas quais não se deve bater. Essa informação é preservada ao zerar o progresso.</p>
          {detailItem.blocks.map((block) => <section key={String(block.name)}><h3>Quadra {String(block.name)}</h3>{block.streets?.map((street) => <div key={street.name}><strong>{street.name}</strong><div>{houseNumbers(street.houses).map((house) => {
            const isDnd = detailItem.status?.[String(block.name)]?.[street.name]?.[house] === 'DND'
            return <button key={house} className={isDnd ? 'is-dnd' : ''} onClick={() => toggleDnd(detailItem, String(block.name), street.name, house)}>{house}</button>
          })}</div></div>)}</section>)}
        </div>}
      </Modal>

      <Modal title="Organizar territórios" open={manageOpen} onClose={() => setManageOpen(false)}>
        <div className="manage-list">{territories.map((territory, index) => <div key={territory.id}><span className="territory-number territory-number--small">{territory.id}</span><strong>{territory.name}</strong><div><button className="icon-button" disabled={index === 0} onClick={() => moveTerritory(index, -1)}><ArrowUp /></button><button className="icon-button" disabled={index === territories.length - 1} onClick={() => moveTerritory(index, 1)}><ArrowDown /></button><button className="icon-button icon-button--danger" onClick={() => removeTerritory(territory)}><Trash2 /></button></div></div>)}</div>
      </Modal>

      <Modal title="Adicionar território" open={addOpen} onClose={() => setAddOpen(false)}>
        <div className="form-stack"><label>Nome do novo território<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex.: Bairro Novo" autoFocus /></label><p className="form-hint">O próximo número disponível será usado. Depois você poderá cadastrar quadras e ruas.</p></div>
        <div className="modal-footer"><button className="button button--ghost" onClick={() => setAddOpen(false)}>Cancelar</button><button className="button button--primary" disabled={busy || !newName.trim()} onClick={addTerritory}>Criar território</button></div>
      </Modal>

      <Modal title="Relatório de casas" open={reportOpen} onClose={() => setReportOpen(false)}>
        <ReportFilters selection={selection} onSelection={setSelection} status={statusFilter} onStatus={setStatusFilter} />
        <div className="report-preview"><strong>{reportRows().length}</strong><span>casas no resultado</span></div>
        <div className="modal-footer"><button className="button button--ghost" onClick={() => setReportOpen(false)}>Fechar</button><button className="button button--primary" onClick={exportCsv}><Download size={17} /> Baixar CSV</button></div>
      </Modal>

      <Modal title="Zerar casas visitadas" open={resetOpen} onClose={() => setResetOpen(false)}>
        <div className="inline-alert inline-alert--warning"><ListRestart /> Esta ação remove apenas o status “visitada”. Casas “não bater” são mantidas.</div>
        <ReportFilters selection={selection} onSelection={setSelection} hideStatus />
        <div className="modal-footer"><button className="button button--ghost" onClick={() => setResetOpen(false)}>Cancelar</button><button className="button button--danger" disabled={busy} onClick={resetSelected}>{busy ? 'Processando…' : 'Confirmar'}</button></div>
      </Modal>
    </div>
  )
}

function ReportFilters({ selection, onSelection, status = 'all', onStatus, hideStatus }: { selection: string; onSelection: (value: string) => void; status?: string; onStatus?: (value: 'all' | 'DONE' | 'DND' | 'EMPTY') => void; hideStatus?: boolean }) {
  return <div className="form-grid"><label>Territórios<input value={selection} onChange={(event) => onSelection(event.target.value)} placeholder="Todos ou ex.: 1, 3-5, 8" /></label>{!hideStatus && <label>Status<select value={status} onChange={(event) => onStatus?.(event.target.value as 'all' | 'DONE' | 'DND' | 'EMPTY')}><option value="all">Todos</option><option value="DONE">Visitadas</option><option value="EMPTY">Pendentes</option><option value="DND">Não bater</option></select></label>}</div>
}

function TerritoryEditor({ territory, onChange }: { territory: Territory; onChange: (value: Territory) => void }) {
  function updateBlock(index: number, block: TerritoryBlock) {
    const blocks = territory.blocks.map((item, itemIndex) => itemIndex === index ? block : item)
    onChange({ ...territory, blocks })
  }
  function removeBlock(index: number) {
    onChange({ ...territory, blocks: territory.blocks.filter((_, itemIndex) => itemIndex !== index) })
  }
  return <div className="territory-editor">
    <label>Nome<input value={territory.name} onChange={(event) => onChange({ ...territory, name: event.target.value })} /></label>
    <div className="editor-heading"><h3>Quadras e ruas</h3><button className="button button--secondary button--small" onClick={() => onChange({ ...territory, blocks: [...territory.blocks, { name: '', streets: [] }] })}><Plus size={15} /> Quadra</button></div>
    {territory.blocks.map((block, blockIndex) => <section className="block-editor" key={blockIndex}>
      <div className="block-editor__title"><label>Quadra<input value={String(block.name)} onChange={(event) => updateBlock(blockIndex, { ...block, name: event.target.value })} /></label><button className="icon-button icon-button--danger" onClick={() => removeBlock(blockIndex)}><Trash2 /></button></div>
      <div className="street-edit-list">{(block.streets ?? []).map((street, streetIndex) => <div className="street-editor" key={streetIndex}>
        <label>Rua<input value={street.name} onChange={(event) => updateBlock(blockIndex, { ...block, streets: block.streets?.map((item, index) => index === streetIndex ? { ...item, name: event.target.value } : item) })} /></label>
        <label>Casas<input value={street.houses ?? ''} onChange={(event) => updateBlock(blockIndex, { ...block, streets: block.streets?.map((item, index) => index === streetIndex ? { ...item, houses: event.target.value } : item) })} placeholder="1, 3, 5, 7" /></label>
        <label>Link do mapa<input value={street.mapLink ?? ''} onChange={(event) => updateBlock(blockIndex, { ...block, streets: block.streets?.map((item, index) => index === streetIndex ? { ...item, mapLink: event.target.value } : item) })} placeholder="https://…" /></label>
        <button className="icon-button icon-button--danger" onClick={() => updateBlock(blockIndex, { ...block, streets: block.streets?.filter((_, index) => index !== streetIndex) })}><X /></button>
      </div>)}</div>
      <button className="text-button" onClick={() => updateBlock(blockIndex, { ...block, streets: [...(block.streets ?? []), { name: '', houses: '', mapLink: '' }] })}><Plus size={15} /> Adicionar rua</button>
    </section>)}
  </div>
}
