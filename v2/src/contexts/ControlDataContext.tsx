import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { controlDb } from '../lib/firebase'
import type {
  AssignmentConfig,
  AssignmentHistoryItem,
  ControlTerritory,
  MainState,
  S13Data,
} from '../types'

const defaultConfig: AssignmentConfig = {
  weekday: {
    SEGUNDA: 'Silvino Amorim',
    TERÇA: 'Vitor ou Wagner',
    QUARTA: 'Getulio Rodrigues',
    QUINTA: 'Ivo Janson',
    SEXTA: 'Francisco Godoy',
  },
  weekend: {
    'SABADO-1': 'GRUPOS 1, 2 e 3',
    'SABADO-2': 'GRUPOS 4 e 5',
    'SABADO-3': 'GRUPOS 6, 7 e 8',
    DOMINGO: 'Responsável do Domingo',
  },
  weekendGroupNames: {
    'SABADO-1': 'Marcio Arruda',
    'SABADO-2': 'Francisco Godoy',
    'SABADO-3': 'Willian Lindem',
  },
}

const defaultMainState: MainState = {
  status: {},
  weekdaySelections: {},
  weekendSelections: { DOMINGO: { name: '', territories: [] } },
  archived: [],
  assignmentLog: {},
  personalAssignments: {},
  mode: 'weekday',
}

interface ControlDataValue {
  territories: ControlTerritory[]
  mainState: MainState
  config: AssignmentConfig
  history: AssignmentHistoryItem[]
  links: Record<string, string>
  publishers: string[]
  s13Data: S13Data
  loading: boolean
  error?: string
  saveMainState: (state: MainState) => Promise<void>
  saveConfig: (config: AssignmentConfig) => Promise<void>
  saveTerritories: (territories: ControlTerritory[]) => Promise<void>
  saveLinks: (links: Record<string, string>) => Promise<void>
  savePublishers: (publishers: string[]) => Promise<void>
  saveS13Data: (data: S13Data) => Promise<void>
  addHistory: (message: string, periodText: string) => Promise<void>
}

const ControlDataContext = createContext<ControlDataValue | null>(null)

export function ControlDataProvider({ children }: { children: ReactNode }) {
  const [territories, setTerritories] = useState<ControlTerritory[]>([])
  const [mainState, setMainState] = useState<MainState>(defaultMainState)
  const [config, setConfig] = useState<AssignmentConfig>(defaultConfig)
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([])
  const [links, setLinks] = useState<Record<string, string>>({})
  const [publishers, setPublishers] = useState<string[]>([])
  const [s13Data, setS13Data] = useState<S13Data>({})
  const [ready, setReady] = useState(new Set<string>())
  const [error, setError] = useState<string>()

  useEffect(() => {
    const subscriptions: Unsubscribe[] = []
    const markReady = (key: string) => setReady((current) => new Set(current).add(key))
    const fail = (reason: Error) => setError(reason.message)

    subscriptions.push(
      onSnapshot(doc(controlDb, 'appState', 'territoryList'), (snapshot) => {
        const data = snapshot.data()?.territories
        setTerritories(Array.isArray(data) ? data : [])
        markReady('territories')
      }, fail),
      onSnapshot(doc(controlDb, 'appState', 'mainState'), (snapshot) => {
        const data = snapshot.data() ?? {}
        setMainState({
          status: data.status ?? {},
          weekdaySelections: data.weekdaySelections ?? {},
          weekendSelections: data.weekendSelections ?? { DOMINGO: { name: '', territories: [] } },
          archived: data.archived ?? [],
          assignmentLog: data.assignmentLog ?? {},
          personalAssignments: data.personalAssignments ?? {},
          mode: data.mode === 'weekend' ? 'weekend' : 'weekday',
        })
        markReady('main')
      }, fail),
      onSnapshot(doc(controlDb, 'appState', 'assignmentsConfig'), (snapshot) => {
        const data = snapshot.data() ?? {}
        setConfig({
          weekday: { ...defaultConfig.weekday, ...(data.weekday ?? {}) },
          weekend: { ...defaultConfig.weekend, ...(data.weekend ?? {}) },
          weekendGroupNames: { ...defaultConfig.weekendGroupNames, ...(data.weekendGroupNames ?? {}) },
        })
        markReady('config')
      }, fail),
      onSnapshot(doc(controlDb, 'appState', 'territoryLinks'), (snapshot) => {
        setLinks(snapshot.data()?.links ?? {})
        markReady('links')
      }, fail),
      onSnapshot(doc(controlDb, 'appState', 'publishers'), (snapshot) => {
        setPublishers(snapshot.data()?.names ?? [])
        markReady('publishers')
      }, fail),
      onSnapshot(doc(controlDb, 'appState', 's13Data'), (snapshot) => {
        setS13Data(snapshot.data()?.data ?? {})
        markReady('s13')
      }, fail),
      onSnapshot(query(collection(controlDb, 'assignmentHistory'), orderBy('timestamp', 'desc')), (snapshot) => {
        setHistory(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AssignmentHistoryItem))
        markReady('history')
      }, fail),
    )

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [])

  const saveMainState = useCallback(async (state: MainState) => {
    await setDoc(doc(controlDb, 'appState', 'mainState'), state, { merge: true })
  }, [])
  const saveConfig = useCallback(async (value: AssignmentConfig) => {
    await setDoc(doc(controlDb, 'appState', 'assignmentsConfig'), value, { merge: true })
  }, [])
  const saveTerritories = useCallback(async (value: ControlTerritory[]) => {
    await setDoc(doc(controlDb, 'appState', 'territoryList'), { territories: value })
  }, [])
  const saveLinks = useCallback(async (value: Record<string, string>) => {
    await setDoc(doc(controlDb, 'appState', 'territoryLinks'), { links: value })
  }, [])
  const savePublishers = useCallback(async (value: string[]) => {
    await setDoc(doc(controlDb, 'appState', 'publishers'), { names: value }, { merge: true })
  }, [])
  const saveS13Data = useCallback(async (value: S13Data) => {
    await setDoc(doc(controlDb, 'appState', 's13Data'), { data: value })
  }, [])
  const addHistory = useCallback(async (message: string, periodText: string) => {
    await addDoc(collection(controlDb, 'assignmentHistory'), { message, periodText, timestamp: serverTimestamp() })
  }, [])

  const value = useMemo<ControlDataValue>(() => ({
    territories,
    mainState,
    config,
    history,
    links,
    publishers,
    s13Data,
    loading: ready.size < 7,
    error,
    saveMainState,
    saveConfig,
    saveTerritories,
    saveLinks,
    savePublishers,
    saveS13Data,
    addHistory,
  }), [territories, mainState, config, history, links, publishers, s13Data, ready, error, saveMainState, saveConfig, saveTerritories, saveLinks, savePublishers, saveS13Data, addHistory])

  return <ControlDataContext.Provider value={value}>{children}</ControlDataContext.Provider>
}

export function useControlData() {
  const value = useContext(ControlDataContext)
  if (!value) throw new Error('useControlData deve ser usado dentro de ControlDataProvider')
  return value
}
