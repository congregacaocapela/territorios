import {
  FieldPath,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { ensureTerritoriesSession, territoriesDb } from './firebase'
import type { HouseStatus, Territory, TerritoryBlock } from '../types'

export async function setHouseStatus(
  territoryId: string,
  blockName: string,
  streetName: string,
  houseNumber: string,
  status: HouseStatus,
) {
  await ensureTerritoriesSession()
  const reference = doc(territoriesDb, 'territories', territoryId)
  const path = new FieldPath('status', blockName, streetName, houseNumber)

  try {
    await updateDoc(reference, path, status === null ? deleteField() : status)
  } catch (error) {
    if (status === null) throw error
    await setDoc(
      reference,
      { status: { [blockName]: { [streetName]: { [houseNumber]: status } } } },
      { merge: true },
    )
  }
}

export async function saveTerritoryCore(id: string, name: string, blocks: TerritoryBlock[]) {
  await ensureTerritoriesSession()
  await setDoc(doc(territoriesDb, 'territories', id), { name, blocks }, { merge: true })
}

export async function createTerritory(id: string, name: string) {
  await ensureTerritoriesSession()
  await setDoc(doc(territoriesDb, 'territories', id), { name, blocks: [], status: {} })
}

export async function deleteTerritory(id: string) {
  await ensureTerritoriesSession()
  await deleteDoc(doc(territoriesDb, 'territories', id))
}

export async function swapTerritories(firstId: string, secondId: string) {
  await ensureTerritoriesSession()
  const firstRef = doc(territoriesDb, 'territories', firstId)
  const secondRef = doc(territoriesDb, 'territories', secondId)
  const [first, second] = await Promise.all([getDoc(firstRef), getDoc(secondRef)])
  if (!first.exists() || !second.exists()) throw new Error('Um dos territórios não foi encontrado.')
  const batch = writeBatch(territoriesDb)
  batch.set(firstRef, second.data())
  batch.set(secondRef, first.data())
  await batch.commit()
}

export async function resetTerritoryProgress(ids: string[]) {
  await ensureTerritoriesSession()
  const snapshots = await Promise.all(ids.map((id) => getDoc(doc(territoriesDb, 'territories', id))))
  const batch = writeBatch(territoriesDb)

  snapshots.forEach((snapshot) => {
    if (!snapshot.exists()) return
    const status = structuredClone(snapshot.data().status ?? {}) as Territory['status']
    Object.values(status ?? {}).forEach((streets) => {
      Object.values(streets).forEach((houses) => {
        Object.keys(houses).forEach((house) => {
          if (houses[house] === 'DONE') delete houses[house]
        })
      })
    })
    batch.set(snapshot.ref, { status: status ?? {} }, { merge: true })
  })

  await batch.commit()
}

export async function readAllTerritories(): Promise<Territory[]> {
  await ensureTerritoriesSession()
  const snapshot = await getDocs(collection(territoriesDb, 'territories'))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Territory)
    .sort((a, b) => Number(a.id) - Number(b.id))
}

