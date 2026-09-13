import { ChevronLeft, ChevronRight, Download, Plus, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ErrorState, LoadingState } from '../components/AsyncState'
import { Modal } from '../components/Modal'
import { useControlData } from '../contexts/ControlDataContext'
import { useToast } from '../contexts/ToastContext'
import { formatDateBr } from '../lib/territory'
import type { S13Record } from '../types'

const pageSize = 10

export function S13Page() {
  const data = useControlData()
  const toast = useToast()
  const [page, setPage] = useState(0)
  const [recordOpen, setRecordOpen] = useState(false)
  const [publishersOpen, setPublishersOpen] = useState(false)
  const [territoryId, setTerritoryId] = useState('')
  const [publisher, setPublisher] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [newPublisher, setNewPublisher] = useState('')
  const [busy, setBusy] = useState(false)

  const ids = useMemo(() => {
    const fromList = data.territories.map((item) => item.id)
    const fromRecords = Object.keys(data.s13Data).map(Number)
    const max = Math.max(0, ...fromList, ...fromRecords)
    return Array.from({ length: max }, (_, index) => index + 1)
  }, [data.s13Data, data.territories])
  const pageCount = Math.max(1, Math.ceil(ids.length / pageSize))
  const visibleIds = ids.slice(page * pageSize, (page + 1) * pageSize)

  async function saveRecord() {
    const id = Number(territoryId)
    if (!id || !publisher || !start) return toast('Preencha território, publicador e data de início.', 'error')
    setBusy(true)
    try {
      const next = structuredClone(data.s13Data)
      next[id] = [...(next[id] ?? []), { name: publisher, start, end }]
      await data.saveS13Data(next)
      setRecordOpen(false)
      setTerritoryId('')
      setPublisher('')
      setStart('')
      setEnd('')
      toast('Registro S-13 adicionado.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao salvar registro.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteRecord(id: number, index: number) {
    if (!window.confirm(`Remover este registro do território ${id}?`)) return
    const next = structuredClone(data.s13Data)
    next[id] = (next[id] ?? []).filter((_, itemIndex) => itemIndex !== index)
    await data.saveS13Data(next)
    toast('Registro removido.', 'success')
  }

  async function addPublisher() {
    const value = newPublisher.trim()
    if (!value || data.publishers.includes(value)) return
    await data.savePublishers([...data.publishers, value].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    setNewPublisher('')
    toast('Publicador cadastrado.', 'success')
  }

  async function removePublisher(name: string) {
    if (!window.confirm(`Remover ${name} da lista de publicadores? Os registros antigos serão mantidos.`)) return
    await data.savePublishers(data.publishers.filter((item) => item !== name))
  }

  function exportPdf() {
    const document = new jsPDF({ orientation: 'landscape' })
    document.setFontSize(16)
    document.text('Registro de Designação de Território — S-13', 14, 16)
    const rows = ids.flatMap((id) => {
      const records = data.s13Data[id] ?? []
      return records.length
        ? records.map((record) => [id, record.name, formatDateBr(record.start), formatDateBr(record.end)])
        : [[id, '', '', '']]
    })
    autoTable(document, {
      head: [['Território', 'Publicador', 'Designado em', 'Concluído em']],
      body: rows,
      startY: 23,
      styles: { fontSize: 9, cellPadding: 2.6 },
      headStyles: { fillColor: [22, 59, 51] },
      alternateRowStyles: { fillColor: [243, 240, 232] },
    })
    document.save('registro-s13.pdf')
    toast('PDF gerado.', 'success')
  }

  async function resetAll() {
    if (!window.confirm('Apagar todos os registros S-13? O backup local anterior à migração continuará preservado.')) return
    await data.saveS13Data({})
    toast('Registros S-13 zerados.', 'success')
  }

  if (data.loading) return <LoadingState message="Carregando S-13…" />
  if (data.error) return <ErrorState message={data.error} />

  return (
    <div className="admin-content">
      <section className="admin-heading">
        <div><p className="eyebrow">Registro de designações</p><h1>Territórios S-13</h1><p>Histórico de quem trabalhou cada território e em quais datas.</p></div>
        <div className="admin-heading__actions"><button className="button button--ghost" onClick={() => setPublishersOpen(true)}><Users size={18} /> Publicadores</button><button className="button button--ghost" onClick={exportPdf}><Download size={18} /> Exportar PDF</button><button className="button button--primary" onClick={() => setRecordOpen(true)}><Plus size={18} /> Novo registro</button></div>
      </section>

      <section className="s13-summary"><article><small>TERRITÓRIOS</small><strong>{ids.length}</strong></article><article><small>REGISTROS</small><strong>{Object.values(data.s13Data).reduce((sum, records) => sum + records.length, 0)}</strong></article><article><small>PUBLICADORES</small><strong>{data.publishers.length}</strong></article><button className="button button--danger-soft button--small" onClick={resetAll}><RotateCcw size={16} /> Zerar registros</button></section>

      <section className="table-card">
        <div className="table-scroll"><table className="s13-table"><thead><tr><th>Território</th><th>Publicador</th><th>Designado em</th><th>Concluído em</th><th aria-label="Ações" /></tr></thead><tbody>{visibleIds.flatMap((id) => {
          const records = data.s13Data[id] ?? []
          if (!records.length) return <tr key={id}><td><strong>{String(id).padStart(2, '0')}</strong></td><td colSpan={3}><span className="muted">Nenhum registro</span></td><td /></tr>
          return records.map((record, index) => <RecordRow key={`${id}-${index}`} id={id} record={record} first={index === 0} rowSpan={records.length} onDelete={() => deleteRecord(id, index)} />)
        })}</tbody></table></div>
        <div className="pagination"><button className="icon-button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><span>Página <strong>{page + 1}</strong> de {pageCount}</span><button className="icon-button" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div>
      </section>

      <Modal title="Adicionar registro S-13" open={recordOpen} onClose={() => setRecordOpen(false)}>
        <div className="form-grid"><label>Território<input type="number" min="1" max={ids.length} value={territoryId} onChange={(event) => setTerritoryId(event.target.value)} /></label><label>Publicador<select value={publisher} onChange={(event) => setPublisher(event.target.value)}><option value="">Selecione</option>{data.publishers.map((name) => <option key={name}>{name}</option>)}</select></label><label>Data de início<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Data de conclusão<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>
        <div className="modal-footer"><button className="button button--ghost" onClick={() => setRecordOpen(false)}>Cancelar</button><button className="button button--primary" disabled={busy} onClick={saveRecord}>{busy ? 'Salvando…' : 'Adicionar'}</button></div>
      </Modal>

      <Modal title="Gerenciar publicadores" open={publishersOpen} onClose={() => setPublishersOpen(false)}>
        <div className="publisher-add"><input value={newPublisher} onChange={(event) => setNewPublisher(event.target.value)} placeholder="Nome do publicador" onKeyDown={(event) => event.key === 'Enter' && addPublisher()} /><button className="button button--primary" onClick={addPublisher}><UserPlus size={17} /> Cadastrar</button></div>
        <div className="publisher-list">{data.publishers.map((name) => <div key={name}><span>{name}</span><button className="icon-button icon-button--danger" onClick={() => removePublisher(name)}><Trash2 /></button></div>)}</div>
      </Modal>
    </div>
  )
}

function RecordRow({ id, record, first, rowSpan, onDelete }: { id: number; record: S13Record; first: boolean; rowSpan: number; onDelete: () => void }) {
  return <tr>{first && <td rowSpan={rowSpan}><strong>{String(id).padStart(2, '0')}</strong></td>}<td>{record.name}</td><td>{formatDateBr(record.start)}</td><td>{formatDateBr(record.end)}</td><td><button className="icon-button icon-button--danger" onClick={onDelete} title="Excluir registro"><Trash2 size={16} /></button></td></tr>
}
