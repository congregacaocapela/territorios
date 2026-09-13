import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const v2Dir = resolve(scriptDir, '..')
const legacyDir = resolve(v2Dir, '..')
const backupDir = join(v2Dir, '.local-backups')

async function readFirebaseConfig(fileName) {
  const source = await readFile(join(legacyDir, fileName), 'utf8')
  const get = (key) => {
    const value = source.match(new RegExp(`${key}:\\s*["']([^"']+)["']`))?.[1]
    if (!value) throw new Error(`Configuração ${key} não encontrada em ${fileName}`)
    return value
  }

  return { apiKey: get('apiKey'), projectId: get('projectId') }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${details}`)
  }
  return response.json()
}

function firestoreBase(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
}

async function listDocuments(config, collectionPath) {
  const documents = []
  let pageToken

  do {
    const params = new URLSearchParams({
      key: config.apiKey,
      pageSize: '1000',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const data = await fetchJson(`${firestoreBase(config.projectId)}/${collectionPath}?${params}`)
    documents.push(...(data.documents ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return documents
}

async function backupDatabase(label, config, collectionPaths) {
  const collections = {}

  for (const collectionPath of collectionPaths) {
    collections[collectionPath] = await listDocuments(config, collectionPath)
  }

  return {
    label,
    projectId: config.projectId,
    collectionCount: Object.keys(collections).length,
    documentCount: Object.values(collections).reduce((sum, docs) => sum + docs.length, 0),
    collections,
  }
}

const [territoriesConfig, controlPanelConfig] = await Promise.all([
  readFirebaseConfig('gestaodequadras.html'),
  readFirebaseConfig('paineldecontrole.html'),
])

const createdAt = new Date()
const backup = {
  format: 'firestore-rest-v1',
  createdAt: createdAt.toISOString(),
  databases: await Promise.all([
    backupDatabase('territories', territoriesConfig, ['territories']),
    backupDatabase('control-panel', controlPanelConfig, ['appState', 'assignmentHistory']),
  ]),
}

await mkdir(backupDir, { recursive: true })
const timestamp = createdAt.toISOString().replaceAll(':', '-').replaceAll('.', '-')
const outputPath = join(backupDir, `firestore-backup-${timestamp}.json`)
await writeFile(outputPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')

console.log(`Backup salvo em ${outputPath}`)
for (const database of backup.databases) {
  console.log(`${database.projectId}: ${database.collectionCount} coleções, ${database.documentCount} documentos`)
}
