import { Download, Plus, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ErrorState, LoadingState } from '../components/AsyncState'
import { Modal } from '../components/Modal'
import { useControlData } from '../contexts/ControlDataContext'
import { useToast } from '../contexts/ToastContext'
import { formatDateBr, normalizeId } from '../lib/territory'

const maxAssignments = 4
const serviceYear = 2025

export function S13Page() {
  const data = useControlData()
  const toast = useToast()
  const [publishersOpen, setPublishersOpen] = useState(false)
  const [territoryId, setTerritoryId] = useState('')
  const [publisher, setPublisher] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [newPublisher, setNewPublisher] = useState('')
  const [busy, setBusy] = useState(false)

  const ids = useMemo(() => {
    const values = [
      ...data.territories.map((item) => item.id),
      ...Object.keys(data.s13Data).map(Number),
    ].filter((id) => Number.isFinite(id) && id > 0)
    const max = Math.max(0, ...values)
    return Array.from({ length: max }, (_, index) => index + 1)
  }, [data.s13Data, data.territories])

  const recordCount = useMemo(
    () => Object.values(data.s13Data).reduce((sum, records) => sum + records.length, 0),
    [data.s13Data],
  )

  function clearRecordForm() {
    setTerritoryId('')
    setPublisher('')
    setStart('')
    setEnd('')
  }

  async function saveRecord() {
    const id = Number(territoryId)
    const name = publisher.trim()
    if (!Number.isInteger(id) || id < 1 || id > ids.length || !name || !start || !end) {
      toast('Preencha território, publicador e as duas datas.', 'error')
      return
    }
    if (end < start) {
      toast('A data de conclusão não pode ser anterior à data de designação.', 'error')
      return
    }

    const records = data.s13Data[id] ?? []
    if (records.length >= maxAssignments) {
      toast(`O território ${normalizeId(id)} já possui quatro designações.`, 'error')
      return
    }

    setBusy(true)
    try {
      const next = structuredClone(data.s13Data)
      next[id] = [...records, { name, start, end }]
      await data.saveS13Data(next)
      clearRecordForm()
      toast('Registro S-13 adicionado.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao salvar registro.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteRecord(id: number, index: number) {
    if (!window.confirm(`Remover este registro do território ${normalizeId(id)}?`)) return
    try {
      const next = structuredClone(data.s13Data)
      next[id] = (next[id] ?? []).filter((_, itemIndex) => itemIndex !== index)
      await data.saveS13Data(next)
      toast('Registro removido.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao remover registro.', 'error')
    }
  }

  async function addPublisher() {
    const value = newPublisher.trim().toLocaleUpperCase('pt-BR')
    if (!value) return
    if (data.publishers.some((item) => item.toLocaleLowerCase('pt-BR') === value.toLocaleLowerCase('pt-BR'))) {
      toast('Este publicador já está cadastrado.', 'error')
      return
    }
    try {
      await data.savePublishers([...data.publishers, value].sort((a, b) => a.localeCompare(b, 'pt-BR')))
      setNewPublisher('')
      toast('Publicador cadastrado.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao cadastrar publicador.', 'error')
    }
  }

  async function removePublisher(name: string) {
    if (!window.confirm(`Remover ${name} da lista de publicadores? Os registros antigos serão mantidos.`)) return
    try {
      await data.savePublishers(data.publishers.filter((item) => item !== name))
      toast('Publicador removido.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao remover publicador.', 'error')
    }
  }

  function exportPdf() {
    const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = document.internal.pageSize.getWidth()
    document.setFont('helvetica', 'bold')
    document.setFontSize(16)
    document.text('Registro de Territórios S-13', pageWidth / 2, 11, { align: 'center' })
    document.setFontSize(10)
    document.text(`Ano de Serviço: ${serviceYear}`, pageWidth / 2, 17, { align: 'center' })

    const head = [
      [
        { content: 'Terr. n.º', rowSpan: 2 },
        { content: 'Última data concluída', rowSpan: 2 },
        { content: 'Designado para', colSpan: 2 },
        { content: 'Designado para', colSpan: 2 },
        { content: 'Designado para', colSpan: 2 },
        { content: 'Designado para', colSpan: 2 },
      ],
      [
        'Data da desig.', 'Data da conclusão',
        'Data da desig.', 'Data da conclusão',
        'Data da desig.', 'Data da conclusão',
        'Data da desig.', 'Data da conclusão',
      ],
    ]
    const body = ids.flatMap((id) => {
      const records = (data.s13Data[id] ?? []).slice(0, maxAssignments)
      const lastRecord = records.at(-1)
      const names = Array.from({ length: maxAssignments }, (_, index) => ({
        content: records[index]?.name ?? '',
        colSpan: 2,
      }))
      const dates = records.flatMap((record) => [formatDateBr(record.start), formatDateBr(record.end)])
      while (dates.length < maxAssignments * 2) dates.push('')
      return [
        [
          { content: normalizeId(id), rowSpan: 2 },
          { content: lastRecord ? formatDateBr(lastRecord.end) : '', rowSpan: 2 },
          ...names,
        ],
        dates,
      ]
    })

    autoTable(document, {
      head,
      body,
      startY: 21,
      margin: { left: 8, right: 8 },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.5,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 6.5,
        textColor: [31, 41, 55],
      },
      headStyles: {
        fillColor: [229, 231, 235],
        textColor: [31, 41, 55],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [229, 231, 235] },
      columnStyles: {
        0: { cellWidth: 13 },
        1: { cellWidth: 26 },
      },
      didParseCell: (hook) => {
        if (hook.section === 'body') {
          const territoryIndex = Math.floor(hook.row.index / 2)
          hook.cell.styles.fillColor = territoryIndex % 2 === 1 ? [229, 231, 235] : [255, 255, 255]
          if (hook.column.index === 0) {
            hook.cell.styles.fillColor = [229, 231, 235]
            hook.cell.styles.fontStyle = 'bold'
          }
        }
      },
    })
    document.save(`REGISTRO_DE_TERRITORIO_S13_${serviceYear}.pdf`)
    toast('PDF preenchido gerado.', 'success')
  }

  async function resetAll() {
    if (!window.confirm('Apagar todos os registros S-13? O backup local anterior à migração continuará preservado.')) return
    try {
      await data.saveS13Data({})
      toast('Registros S-13 zerados.', 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Erro ao zerar registros.', 'error')
    }
  }

  if (data.loading) return <LoadingState message="Carregando S-13…" />
  if (data.error) return <ErrorState message={data.error} />

  return (
    <div className="s13-page">
      <header className="s13-page__header">
        <h1>Registro de Territórios S-13</h1>
      </header>

      <div className="s13-page__name-action">
        <button className="s13-button s13-button--gray" onClick={() => setPublishersOpen(true)}><Users size={17} /> Gerenciar Nomes</button>
      </div>

      <section className="s13-form-card">
        <h2>Adicionar Novo Registro</h2>
        <div className="s13-form-grid">
          <label>Número do Território<input type="number" min="1" max={ids.length} value={territoryId} onChange={(event) => setTerritoryId(event.target.value)} placeholder={`1-${ids.length}`} /></label>
          <label>Designado para (Nome)<select value={publisher} onChange={(event) => setPublisher(event.target.value)}><option value="">Selecione um nome</option>{data.publishers.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Data da Designação<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label>Data da Conclusão<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          <button className="s13-button s13-button--indigo" onClick={saveRecord} disabled={busy}><Plus size={17} /> {busy ? 'Salvando…' : 'Adicionar à Planilha'}</button>
        </div>
      </section>

      <section className="s13-sheet-card">
        <div className="s13-sheet-title">Ano de Serviço: {serviceYear}</div>
        <div className="s13-sheet-scroll">
          <table className="s13-spreadsheet">
            <thead>
              <tr>
                <th rowSpan={2}>Terr. n.º</th>
                <th rowSpan={2}>Última data concluída</th>
                {Array.from({ length: maxAssignments }, (_, index) => <th key={index} colSpan={2}>Designado para</th>)}
              </tr>
              <tr>
                {Array.from({ length: maxAssignments }, (_, index) => [
                  <th key={`start-${index}`}>Data da desig.</th>,
                  <th key={`end-${index}`}>Data da conclusão</th>,
                ]).flat()}
              </tr>
            </thead>
            <tbody>
              {ids.flatMap((id) => {
                const records = (data.s13Data[id] ?? []).slice(0, maxAssignments)
                const lastRecord = records.at(-1)
                const rowClass = id % 2 === 0 ? 's13-row s13-row--even' : 's13-row s13-row--odd'
                return [
                  <tr key={`${id}-names`} className={rowClass}>
                    <td rowSpan={2} className="s13-territory-number">{id}</td>
                    <td rowSpan={2}>{lastRecord ? formatDateBr(lastRecord.end) : ''}</td>
                    {Array.from({ length: maxAssignments }, (_, index) => <td key={index} colSpan={2} className="s13-name-cell">{records[index]?.name ?? ''}{records[index] && <button className="s13-delete-button" onClick={() => deleteRecord(id, index)} title="Remover registro" aria-label={`Remover registro ${index + 1} do território ${id}`}><Trash2 size={12} /></button>}</td>)}
                  </tr>,
                  <tr key={`${id}-dates`} className={rowClass}>
                    {Array.from({ length: maxAssignments }, (_, index) => [
                      <td key={`start-${index}`}>{records[index] ? formatDateBr(records[index].start) : ''}</td>,
                      <td key={`end-${index}`}>{records[index] ? formatDateBr(records[index].end) : ''}</td>,
                    ]).flat()}
                  </tr>,
                ]
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="s13-page__download"><button className="s13-button s13-button--green" onClick={exportPdf}><Download size={17} /> Baixar PDF preenchido</button></div>
      <div className="s13-page__meta">{ids.length} territórios · {recordCount} registros salvos <button className="s13-reset-button" onClick={resetAll}><RotateCcw size={14} /> Zerar registros</button></div>

      <Modal title="Gerenciar Publicadores" open={publishersOpen} onClose={() => setPublishersOpen(false)}>
        <div className="s13-publisher-form"><input value={newPublisher} onChange={(event) => setNewPublisher(event.target.value)} placeholder="Digite um novo nome para cadastrar" onKeyDown={(event) => event.key === 'Enter' && addPublisher()} /><button className="s13-button s13-button--blue" onClick={addPublisher}><UserPlus size={16} /> Cadastrar</button></div>
        <h3 className="s13-publisher-title">Nomes Cadastrados:</h3>
        <div className="s13-publisher-list">{data.publishers.map((name) => <div key={name}><span>{name}</span><button className="s13-delete-button" onClick={() => removePublisher(name)} title={`Remover ${name}`} aria-label={`Remover ${name}`}><Trash2 size={14} /></button></div>)}</div>
      </Modal>
    </div>
  )
}
