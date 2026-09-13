import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const territoriesConfig = {
  apiKey: import.meta.env.VITE_TERRITORIES_API_KEY,
  authDomain: import.meta.env.VITE_TERRITORIES_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_TERRITORIES_PROJECT_ID,
  storageBucket: import.meta.env.VITE_TERRITORIES_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_TERRITORIES_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_TERRITORIES_APP_ID,
}

const controlConfig = {
  apiKey: import.meta.env.VITE_CONTROL_API_KEY,
  authDomain: import.meta.env.VITE_CONTROL_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_CONTROL_PROJECT_ID,
  storageBucket: import.meta.env.VITE_CONTROL_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_CONTROL_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_CONTROL_APP_ID,
}

function validateConfig(label: string, config: Record<string, unknown>) {
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) {
    throw new Error(`Configuração do Firebase (${label}) incompleta: ${missing.join(', ')}.`)
  }
}

validateConfig('territórios', territoriesConfig)
validateConfig('painel', controlConfig)

const territoriesApp = getApps().find((app) => app.name === 'territories-v2') ?? initializeApp(territoriesConfig, 'territories-v2')
const controlApp = getApps().find((app) => app.name === 'control-v2') ?? initializeApp(controlConfig, 'control-v2')

export const territoriesDb = getFirestore(territoriesApp)
export const controlDb = getFirestore(controlApp)
export const territoriesAuth = getAuth(territoriesApp)
export const controlAuth = getAuth(controlApp)

let anonymousSession: Promise<void> | null = null

export function ensureTerritoriesSession() {
  if (territoriesAuth.currentUser) return Promise.resolve()
  if (!anonymousSession) {
    anonymousSession = signInAnonymously(territoriesAuth)
      .then(() => undefined)
      .catch((error) => {
        anonymousSession = null
        throw error
      })
  }
  return anonymousSession
}

export function getNamedFirebaseApp(name: 'territories-v2' | 'control-v2') {
  return getApp(name)
}
