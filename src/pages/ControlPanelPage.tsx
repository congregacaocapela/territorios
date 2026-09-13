import {
  Archive,
  CalendarDays,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  Link2,
  ListChecks,
  MessageCircle,
  RotateCcw,
  Settings2,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../components/AsyncState'
import { Modal } from '../components/Modal'
import { useControlData } from '../contexts/ControlDataContext'
import { useToast } from '../contexts/ToastContext'
import { formatDateBr } from '../lib/territory'
import type { AssignmentConfig, ControlTerritory, MainState, SundaySelection } from '../types'

const dayOffsets: Record<string, number> = { SEGUNDA: 0, TERÇA: 1, QUARTA: 2, QUINTA: 3, SEXTA: 4 }

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function assignmentStart(value: string, mode: 'weekday' | 'weekend') {
  const date = new Date(`${value}T12:00:00Z`)
  const day = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() + (mode === 'weekday' ? (day === 0 ? -6 : 1 - day) : 6 - day))
  return date
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function sundayValue(state: MainState): SundaySelection {
  const value = state.weekendSelections.DOMINGO
  return value && !Array.isArray(value) ? value : { name: '', territories: [] }
}

export function ControlPanelPage() {
  const data = useControlData()
  const toast = useToast()
  const [selectedDate, setSelectedDate] = useState(todayInput())
  const [showArchived, setShowArchived] = useState(false)
  const [statusItem, setStatusItem] = useState<ControlTerritory>()
  const [selectionKey, setSelectionKey] = useState<string>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [configDraft, setConfigDraft] = useState<AssignmentConfig>()
  const [linksDraft, setLinksDraft] = useState<Record<string, string>>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const visibleTerritories = useMemo(() => data.territories.filter((territory) => showArchived
    ? data.mainState.archived.includes(territory.id)
    : !data.mainState.archived.includes(territory.id)), [data.mainState.archived, data.territories, showArchived])

  const startDate = assignmentStart(selectedDate, data.mainState.mode)
  const endDate = new Date(startDate)
  endDate.setUTCDate(startDate.getUTCDate() + (data.mainState.mode === 'weekday' ? 4 : 1))
  const periodText = data.mainState.mode === 'weekday'
    ? `${formatDateBr(isoDate(startDate))} a ${formatDateBr(isoDate(endDate))}`
    : `${formatDateBr(isoDate(startDate))} e ${formatDateBr(isoDate(endDate))}`

  function progress(territory: ControlTerritory) {
    const current = data.mainState.status[String(territory.id)] ?? {}
    const done = territory.blocks.filter((block) => current[block]).length
    return { done, total: territory.blocks.length, percent: territory.blocks.length ? Math.round(done / territory.blocks.length * 100) : 0 }
  }

  async function persist(next: MainState, success?: string) {
    setBusy(true)
    try {
      await data.saveMainState(next)
      if (success) toast(success, 'success')
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : 'Não foi possível salvar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function setMode(mode: 'weekday' | 'weekend') {
    await persist({ ...data.mainState, mode })
  }

  async function toggleBlock(territory: ControlTerritory, block: string, checked: boolean) {
    const status = { ...data.mainState.status, [territory.id]: { ...(data.mainState.status[territory.id] ?? {}), [block]: checked } }
    await persist({ ...data.mainState, status })
  }

  async function toggleAllBlocks(territory: ControlTerritory, checked: boolean) {
    const territoryStatus = Object.fromEntries(territory.blocks.map((block) => [block, checked]))
    const status = { ...data.mainState.status, [territory.id]: territoryStatus }
    await persist({ ...data.mainState, status })
  }

  async function savePersonalAssignment(territory: ControlTerritory, name: string) {
    const personalAssignments = { ...data.mainState.personalAssignments }
    if (name) personalAssignments[territory.id] = name
    else delete personalAssignments[territory.id]
    await persist({ ...data.mainState, personalAssignments }, name ? 'Designação pessoal salva.' : 'Designação pessoal removida.')
  }

  async function archiveTerritory(territory: ControlTerritory) {
    if (data.mainState.archived.includes(territory.id)) {
      await persist({ ...data.mainState, archived: data.mainState.archived.filter((id) => id !== territory.id) }, 'Território restaurado.')
      return
    }
    if (progress(territory).percent < 100) return toast('Conclua todas as quadras antes de arquivar.', 'error')

    const personalName = data.mainState.personalAssignments[territory.id]
    const assignment = data.mainState.assignmentLog[territory.id]
    if (!personalName && !assignment) return toast('Gere a mensagem de designação antes de arquivar este território.', 'error')

    if (!personalName && assignment) {
      const responsible = data.config.weekendGroupNames[assignment.name] || assignment.name
      const next = structuredClone(data.s13Data)
      next[territory.id] = [...(next[territory.id] ?? []), { name: responsible, start: assignment.date, end: todayInput() }]
      await data.saveS13Data(next)
    }

    const assignmentLog = { ...data.mainState.assignmentLog }
    delete assignmentLog[territory.id]
    await persist({ ...data.mainState, archived: [...data.mainState.archived, territory.id], assignmentLog }, 'Território arquivado e S-13 atualizado.')
  }

  function currentSelections(key: string) {
    if (data.mainState.mode === 'weekday') return data.mainState.weekdaySelections[key] ?? []
    if (key === 'DOMINGO') return sundayValue(data.mainState).territories
    const value = data.mainState.weekendSelections[key]
    return Array.isArray(value) ? value : []
  }

  async function saveSelections(key: string, ids: Array<number | string>) {
    if (data.mainState.mode === 'weekday') {
      await persist({ ...data.mainState, weekdaySelections: { ...data.mainState.weekdaySelections, [key]: ids } })
    } else if (key === 'DOMINGO') {
      await persist({ ...data.mainState, weekendSelections: { ...data.mainState.weekendSelections, DOMINGO: { ...sundayValue(data.mainState), territories: ids } } })
    } else {
      await persist({ ...data.mainState, weekendSelections: { ...data.mainState.weekendSelections, [key]: ids } })
    }
    setSelectionKey(undefined)
  }

  async function generateMessage() {
    let text = `${new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'} irmãos, espero que todos estejam bem!\n\nSegue a programação de território referente a ${periodText}.\n\n`
    const assignmentLog = { ...data.mainState.assignmentLog }
    const designated: number[] = []
    let hasAssignments = false

    const territoryLine = (id: number | string) => {
      if (typeof id !== 'number') return id
      const territory = data.territories.find((item) => item.id === id)
      if (!territory) return `${id} (não encontrado)`
      const pending = territory.blocks.filter((block) => !data.mainState.status[id]?.[block])
      if (!pending.length) return `${id} (Completo)`
      return pending.length < territory.blocks.length ? `${id} (${pending.join(', ')})` : String(id)
    }

    if (data.mainState.mode === 'weekday') {
      for (const [day, person] of Object.entries(data.config.weekday)) {
        const selections = data.mainState.weekdaySelections[day] ?? []
        if (!selections.length) continue
        hasAssignments = true
        const date = new Date(startDate)
        date.setUTCDate(startDate.getUTCDate() + (dayOffsets[day] ?? 0))
        selections.forEach((id) => {
          if (typeof id === 'number') {
            designated.push(id)
            if (!data.mainState.personalAssignments[id]) assignmentLog[id] = { name: person, date: isoDate(date) }
          }
        })
        text += `${day} - @${person}\nTERRITÓRIO: ${selections.map(territoryLine).join(', ')}\n\n`
      }
    } else {
      const saturdayParts: string[] = []
      for (const [key, title] of Object.entries(data.config.weekend)) {
        if (!key.startsWith('SABADO')) continue
        const selections = currentSelections(key)
        if (!selections.length) continue
        hasAssignments = true
        selections.forEach((id) => {
          if (typeof id === 'number') {
            designated.push(id)
            if (!data.mainState.personalAssignments[id]) assignmentLog[id] = { name: key, date: isoDate(startDate) }
          }
        })
        saturdayParts.push(`${title.toUpperCase()}\nTERRITÓRIO: ${selections.map(territoryLine).join(', ')}`)
      }
      if (saturdayParts.length) text += `SÁBADO:\n${saturdayParts.join('\n\n')}\n\n`
      const sunday = sundayValue(data.mainState)
      if (sunday.territories.length) {
        hasAssignments = true
        const sundayDate = new Date(startDate)
        sundayDate.setUTCDate(startDate.getUTCDate() + 1)
        sunday.territories.forEach((id) => {
          if (typeof id === 'number') {
            designated.push(id)
            if (!data.mainState.personalAssignments[id]) assignmentLog[id] = { name: sunday.name || 'DOMINGO', date: isoDate(sundayDate) }
          }
        })
        text += `DOMINGO - @${sunday.name || 'Responsável'}\nTERRITÓRIO: ${sunday.territories.map(territoryLine).join(', ')}\n\n`
      }
    }

    if (!hasAssignments) return toast('Adicione ao menos um território à programação.', 'error')
    text += `Portal: ${window.location.origin}/portal\n`
    if (designated.length) text += `\nTerritórios designados: ${[...new Set(designated)].join(', ')}`
    await Promise.all([data.saveMainState({ ...data.mainState, assignmentLog }), data.addHistory(text, periodText)])
    setMessage(text)
    setMessageOpen(true)
  }

  async function clearAssignments() {
    if (!window.confirm('Limpar as designações do período atual?')) return
    if (data.mainState.mode === 'weekday') {
      const weekdaySelections = Object.fromEntries(Object.keys(data.mainState.weekdaySelections).map((key) => [key, []]))
      await persist({ ...data.mainState, weekdaySelections }, 'Designações limpas.')
    } else {
      const weekendSelections = Object.fromEntries(Object.keys(data.mainState.weekendSelections).map((key) => [key, key === 'DOMINGO' ? { ...sundayValue(data.mainState), territories: [] } : []]))
      await persist({ ...data.mainState, weekendSelections }, 'Designações limpas.')
    }
  }

  async function resetArchived() {
    if (!window.confirm('Zerar o progresso e restaurar todos os territórios arquivados?')) return
    const status = structuredClone(data.mainState.status)
    data.mainState.archived.forEach((id) => {
      const territory = data.territories.find((item) => item.id === id)
      status[id] = Object.fromEntries((territory?.blocks ?? []).map((block) => [block, false]))
    })
    await persist({ ...data.mainState, status, archived: [] }, 'Territórios arquivados restaurados.')
  }

  if (data.loading) return <LoadingState message="Carregando painel…" />
  if (data.error) return <ErrorState message={data.error} />

  const assignmentEntries = data.mainState.mode === 'weekday' ? Object.entries(data.config.weekday) : Object.entries(data.config.weekend)

  return (
    <div className="admin-content">
      <section className="admin-heading">
        <div><p className="eyebrow">Programação e progresso</p><h1>Painel de controle</h1><p>Acompanhe quadras, organize designações e atualize o S-13.</p></div>
        <div className="admin-heading__actions"><button className="button button--ghost" onClick={() => setHistoryOpen(true)}><Clock3 size={18} /> Histórico</button><button className="button button--ghost" onClick={() => { setLinksDraft({ ...data.links }); setLinksOpen(true) }}><Link2 size={18} /> Links</button><button className="button button--primary" onClick={() => { setConfigDraft(structuredClone(data.config)); setSettingsOpen(true) }}><Settings2 size={18} /> Configurar</button></div>
      </section>

      <section className="schedule-panel">
        <div className="schedule-panel__header">
          <div><p className="eyebrow">Designação da programação</p><h2>{periodText}</h2></div>
          <label className="date-field"><CalendarDays size={18} /><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
        </div>
        <div className="mode-tabs"><button className={data.mainState.mode === 'weekday' ? 'is-active' : ''} onClick={() => setMode('weekday')}>Dias de semana</button><button className={data.mainState.mode === 'weekend' ? 'is-active' : ''} onClick={() => setMode('weekend')}>Final de semana</button></div>
        <div className="assignment-grid">{assignmentEntries.map(([key, title]) => {
          const selections = currentSelections(key)
          const isSunday = key === 'DOMINGO'
          return <article className="assignment-card" key={key}><div><small>{key.startsWith('SABADO') ? 'SÁBADO' : key}</small><strong>{title}</strong>{isSunday && <select value={sundayValue(data.mainState).name} onChange={(event) => persist({ ...data.mainState, weekendSelections: { ...data.mainState.weekendSelections, DOMINGO: { ...sundayValue(data.mainState), name: event.target.value } } })}><option value="">Escolha um responsável</option>{data.publishers.map((name) => <option key={name}>{name}</option>)}</select>}</div><div className="assignment-badges">{selections.map((id) => <span key={String(id)}>T-{id}</span>)}{!selections.length && <em>Nenhum território</em>}</div><button className="text-button" onClick={() => setSelectionKey(key)}>+ Adicionar territórios</button></article>
        })}</div>
        <div className="schedule-actions"><button className="button button--ghost" onClick={clearAssignments}><Trash2 size={17} /> Limpar</button><button className="button button--primary" onClick={generateMessage}><MessageCircle size={18} /> Gerar mensagem</button></div>
      </section>

      <section className="admin-toolbar"><div><h2>{showArchived ? 'Territórios arquivados' : 'Territórios ativos'}</h2><p>{visibleTerritories.length} itens</p></div><div><button className="button button--ghost button--small" onClick={resetArchived}><RotateCcw size={16} /> Restaurar arquivados</button><button className="button button--secondary button--small" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'Mostrar ativos' : 'Mostrar arquivados'}</button></div></section>
      <section className="control-grid">{visibleTerritories.map((territory) => {
        const itemProgress = progress(territory)
        const personal = data.mainState.personalAssignments[territory.id]
        return <article className="control-card" key={territory.id}><button className="control-card__main" onClick={() => setStatusItem(territory)}><div><span className="territory-number territory-number--small">{territory.id}</span><div><strong>Território {territory.id}</strong>{personal && <small><UserRound size={13} /> {personal}</small>}</div></div><span className={`status-pill status-pill--${itemProgress.percent === 100 ? 'done' : itemProgress.percent ? 'progress' : 'pending'}`}>{itemProgress.percent === 100 ? 'Concluído' : itemProgress.percent ? 'Em andamento' : 'Pendente'}</span><p>{itemProgress.done} de {itemProgress.total} quadras</p><span className="progress-track"><i style={{ width: `${itemProgress.percent}%` }} /></span></button>{(showArchived || itemProgress.percent === 100) && <button className="button button--secondary button--small" onClick={() => archiveTerritory(territory)}>{showArchived ? <RotateCcw size={15} /> : <Archive size={15} />}{showArchived ? 'Restaurar' : 'Arquivar'}</button>}</article>
      })}</section>

      <StatusModal key={statusItem?.id ?? 'status'} territory={statusItem} open={Boolean(statusItem)} onClose={() => setStatusItem(undefined)} state={data.mainState} publishers={data.publishers} onToggle={toggleBlock} onToggleAll={toggleAllBlocks} onPersonal={savePersonalAssignment} busy={busy} />
      <SelectionModal key={selectionKey ?? 'selection'} open={Boolean(selectionKey)} title={selectionKey ?? ''} territories={data.territories} selected={selectionKey ? currentSelections(selectionKey) : []} onClose={() => setSelectionKey(undefined)} onSave={(ids) => selectionKey && saveSelections(selectionKey, ids)} />
      <SettingsModal open={settingsOpen} draft={configDraft} onChange={setConfigDraft} onClose={() => setSettingsOpen(false)} onSave={async () => { if (!configDraft) return; await data.saveConfig(configDraft); setSettingsOpen(false); toast('Configurações salvas.', 'success') }} />
      <LinksModal open={linksOpen} links={linksDraft} territories={data.territories} onChange={setLinksDraft} onClose={() => setLinksOpen(false)} onSave={async () => { await data.saveLinks(linksDraft ?? {}); setLinksOpen(false); toast('Links salvos.', 'success') }} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} items={data.history} />
      <Modal title="Mensagem pronta" open={messageOpen} onClose={() => setMessageOpen(false)}><textarea className="message-output" value={message} readOnly /><div className="modal-footer"><button className="button button--ghost" onClick={async () => { await navigator.clipboard.writeText(message); toast('Mensagem copiada.', 'success') }}><Clipboard size={17} /> Copiar</button><a className="button button--primary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Enviar no WhatsApp <ExternalLink size={16} /></a></div></Modal>
    </div>
  )
}

function StatusModal({ territory, open, onClose, state, publishers, onToggle, onToggleAll, onPersonal, busy }: { territory?: ControlTerritory; open: boolean; onClose: () => void; state: MainState; publishers: string[]; onToggle: (territory: ControlTerritory, block: string, checked: boolean) => void; onToggleAll: (territory: ControlTerritory, checked: boolean) => void; onPersonal: (territory: ControlTerritory, name: string) => void; busy: boolean }) {
  const [name, setName] = useState('')
  if (!territory) return null
  const current = state.status[territory.id] ?? {}
  const personal = state.personalAssignments[territory.id] ?? ''
  return <Modal title={`Território ${territory.id}`} open={open} onClose={onClose}><div className="block-check-list"><label className="check-row check-row--all"><input type="checkbox" disabled={busy} checked={territory.blocks.length > 0 && territory.blocks.every((block) => current[block])} onChange={(event) => onToggleAll(territory, event.target.checked)} /><span>Selecionar todas as quadras</span></label>{territory.blocks.map((block) => <label className="check-row" key={block}><input type="checkbox" disabled={busy} checked={Boolean(current[block])} onChange={(event) => onToggle(territory, block, event.target.checked)} /><span>Quadra {block}</span>{current[block] && <Check size={17} />}</label>)}</div><div className="personal-box"><p><UserRound size={17} /> Designação pessoal</p><select value={name || personal} onChange={(event) => setName(event.target.value)}><option value="">Sem designação pessoal</option>{publishers.map((publisher) => <option key={publisher}>{publisher}</option>)}</select><button className="button button--secondary button--small" disabled={busy} onClick={() => onPersonal(territory, name || personal)}>Salvar</button>{personal && <button className="text-button text-button--danger" onClick={() => { setName(''); onPersonal(territory, '') }}>Remover designação</button>}</div></Modal>
}

function SelectionModal({ open, title, territories, selected, onClose, onSave }: { open: boolean; title: string; territories: ControlTerritory[]; selected: Array<number | string>; onClose: () => void; onSave: (ids: Array<number | string>) => void }) {
  const [draft, setDraft] = useState<Array<number | string>>(selected)
  return <Modal title={`Selecionar para ${title}`} open={open} onClose={onClose}><div className="selection-grid">{territories.map((territory) => <label key={territory.id} className={draft.includes(territory.id) ? 'is-selected' : ''}><input type="checkbox" checked={draft.includes(territory.id)} onChange={(event) => setDraft((current) => event.target.checked ? [...current, territory.id] : current.filter((id) => id !== territory.id))} /><span>{territory.id}</span></label>)}</div><div className="modal-footer"><button className="button button--ghost" onClick={onClose}>Cancelar</button><button className="button button--primary" onClick={() => onSave(draft)}>Confirmar ({draft.length})</button></div></Modal>
}

function SettingsModal({ open, draft, onChange, onClose, onSave }: { open: boolean; draft?: AssignmentConfig; onChange: (value: AssignmentConfig) => void; onClose: () => void; onSave: () => void }) {
  if (!draft) return null
  return <Modal title="Configurar responsáveis" open={open} onClose={onClose}><div className="settings-columns"><section><h3>Dias de semana</h3>{Object.entries(draft.weekday).map(([key, value]) => <label key={key}>{key}<input value={value} onChange={(event) => onChange({ ...draft, weekday: { ...draft.weekday, [key]: event.target.value } })} /></label>)}</section><section><h3>Final de semana</h3>{Object.entries(draft.weekend).map(([key, value]) => <label key={key}>{key}<input value={value} onChange={(event) => onChange({ ...draft, weekend: { ...draft.weekend, [key]: event.target.value } })} /></label>)}</section><section><h3>Responsáveis dos grupos</h3>{Object.entries(draft.weekendGroupNames).map(([key, value]) => <label key={key}>{key}<input value={value} onChange={(event) => onChange({ ...draft, weekendGroupNames: { ...draft.weekendGroupNames, [key]: event.target.value } })} /></label>)}</section></div><div className="modal-footer"><button className="button button--ghost" onClick={onClose}>Cancelar</button><button className="button button--primary" onClick={onSave}>Salvar</button></div></Modal>
}

function LinksModal({ open, links, territories, onChange, onClose, onSave }: { open: boolean; links?: Record<string, string>; territories: ControlTerritory[]; onChange: (value: Record<string, string>) => void; onClose: () => void; onSave: () => void }) {
  if (!links) return null
  return <Modal title="Links dos territórios" open={open} onClose={onClose}><div className="link-list">{territories.map((territory) => <label key={territory.id}><span>T-{territory.id}</span><input value={links[territory.id] ?? ''} onChange={(event) => onChange({ ...links, [territory.id]: event.target.value })} placeholder={`${window.location.origin}/territorio/${territory.id}`} /></label>)}</div><div className="modal-footer"><button className="button button--ghost" onClick={onClose}>Cancelar</button><button className="button button--primary" onClick={onSave}>Salvar links</button></div></Modal>
}

function HistoryModal({ open, onClose, items }: { open: boolean; onClose: () => void; items: Array<{ id: string; message: string; periodText: string; timestamp?: unknown }> }) {
  return <Modal title="Histórico de designações" open={open} onClose={onClose}><div className="history-list">{items.map((item) => <article key={item.id}><div><Clock3 size={16} /><strong>{item.periodText || 'Período não informado'}</strong></div><pre>{item.message}</pre></article>)}{!items.length && <p>Nenhuma designação registrada.</p>}</div></Modal>
}
