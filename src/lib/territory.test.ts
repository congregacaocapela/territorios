import { describe, expect, it } from 'vitest'
import { formatDateBr, houseNumbers, houseStatusLabel, normalizeId, streetMapPoints, territoryHouseStats } from './territory'
import type { Territory } from '../types'

describe('territory helpers', () => {
  it('normaliza listas de casas separadas por vírgula', () => {
    expect(houseNumbers('1, 2, , 4A')).toEqual(['1', '2', '4A'])
  })

  it('calcula o progresso sem contar casas DND como pendentes', () => {
    const territory: Territory = {
      id: '1',
      name: 'Teste',
      blocks: [{ name: 'A', streets: [{ name: 'Rua 1', houses: '1,2,3,4' }] }],
      status: { A: { 'Rua 1': { '1': 'DONE', '2': 'DONE', '3': 'DND' } } },
    }

    expect(territoryHouseStats(territory)).toEqual({
      total: 4,
      done: 2,
      dnd: 1,
      pending: 1,
      progress: 67,
    })
  })

  it('aceita os dois formatos de coordenadas preservados no banco antigo', () => {
    expect(streetMapPoints([{ lat: -23, lng: -46 }, { lat: -24, lng: -47 }])).toEqual([
      [-23, -46],
      [-24, -47],
    ])
    expect(streetMapPoints({ start: { lat: 1, lng: 2 }, end: { lat: 3, lng: 4 } })).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('mantém rótulos e formatos usados pela interface', () => {
    expect(houseStatusLabel('DONE')).toBe('Visitada')
    expect(houseStatusLabel('DND')).toBe('Não bater')
    expect(formatDateBr('2026-09-13')).toBe('13/09/26')
    expect(normalizeId(7)).toBe('07')
  })
})
