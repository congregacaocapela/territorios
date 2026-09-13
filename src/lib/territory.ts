import type { HouseStatus, StreetMapData, Territory } from '../types'

export function houseNumbers(houses?: string) {
  return (houses ?? '')
    .split(',')
    .map((house) => house.trim())
    .filter(Boolean)
}

export function territoryHouseStats(territory: Territory) {
  let total = 0
  let done = 0
  let dnd = 0

  territory.blocks.forEach((block) => {
    const blockName = String(block.name)
    block.streets?.forEach((street) => {
      houseNumbers(street.houses).forEach((house) => {
        total += 1
        const status = territory.status?.[blockName]?.[street.name]?.[house]
        if (status === 'DONE') done += 1
        if (status === 'DND') dnd += 1
      })
    })
  })

  const workable = Math.max(0, total - dnd)
  return {
    total,
    done,
    dnd,
    pending: Math.max(0, workable - done),
    progress: workable ? Math.round((done / workable) * 100) : 0,
  }
}

export function houseStatusLabel(status?: HouseStatus) {
  if (status === 'DONE') return 'Visitada'
  if (status === 'DND') return 'Não bater'
  if (status) return String(status)
  return 'Pendente'
}

export function streetMapPoints(data?: StreetMapData): [number, number][] {
  if (!data) return []
  if (Array.isArray(data)) return data.map((point) => [point.lat, point.lng])
  if (data.start && data.end) {
    return [
      [data.start.lat, data.start.lng],
      [data.end.lat, data.end.lng],
    ]
  }
  return []
}

export function formatDateBr(value?: string) {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value
}

export function normalizeId(id: string | number) {
  return String(id).padStart(2, '0')
}

