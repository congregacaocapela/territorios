import { collection, doc, onSnapshot, setDoc, type DocumentData, type Unsubscribe } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { ensureTerritoriesSession, territoriesDb } from '../lib/firebase'
import type { Territory } from '../types'

function toTerritory(id: string, data: DocumentData): Territory {
  return {
    id,
    name: data.name || `Território ${id}`,
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
    status: data.status || {},
    mapData: data.mapData || {},
  }
}

export function useTerritories() {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined
    let cancelled = false

    ensureTerritoriesSession()
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        unsubscribe = onSnapshot(
          collection(territoriesDb, 'territories'),
          (snapshot) => {
            const next = snapshot.docs
              .map((item) => toTerritory(item.id, item.data()))
              .sort((a, b) => Number(a.id) - Number(b.id))
            setTerritories(next)
            setLoading(false)
            setError(undefined)
          },
          (reason) => {
            setError(reason.message)
            setLoading(false)
          },
        )
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return { territories, loading, error }
}

export function useTerritory(id?: string) {
  const [territory, setTerritory] = useState<Territory>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let unsubscribe: Unsubscribe | undefined
    let cancelled = false

    ensureTerritoriesSession()
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        unsubscribe = onSnapshot(
          doc(territoriesDb, 'territories', id),
          (snapshot) => {
            setTerritory(snapshot.exists() ? toTerritory(snapshot.id, snapshot.data()) : undefined)
            setLoading(false)
            setError(undefined)
          },
          (reason) => {
            setError(reason.message)
            setLoading(false)
          },
        )
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [id])

  return { territory, loading, error }
}

export async function saveStreetMap(territoryId: string, blockName: string, streetName: string, points: Array<{ lat: number; lng: number }>) {
  await ensureTerritoriesSession()
  await setDoc(
    doc(territoriesDb, 'territories', territoryId),
    { mapData: { [blockName]: { [streetName]: points } } },
    { merge: true },
  )
}

export async function saveGlobalMap(territoryId: string, data: unknown) {
  await ensureTerritoriesSession()
  await setDoc(doc(territoriesDb, 'territories', territoryId), { mapData: { global: data } }, { merge: true })
}

