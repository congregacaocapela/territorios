export type HouseStatus = 'DONE' | 'DND' | 'F' | 'T' | 'C' | 'JW' | string | null

export interface Street {
  name: string
  houses?: string
  mapLink?: string
}

export interface TerritoryBlock {
  name: string | number
  streets?: Street[]
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface MapPolygon {
  points: GeoPoint[]
}

export interface MapLabel extends GeoPoint {
  text: string
}

export interface GlobalMapData {
  polygons?: Array<MapPolygon | GeoPoint[]>
  labels?: MapLabel[]
}

export type StreetMapData = GeoPoint[] | { start: GeoPoint; end: GeoPoint }

export interface TerritoryMapData {
  global?: GlobalMapData
  [blockName: string]: GlobalMapData | Record<string, StreetMapData> | undefined
}

export interface Territory {
  id: string
  name: string
  blocks: TerritoryBlock[]
  status?: Record<string, Record<string, Record<string, HouseStatus>>>
  mapData?: TerritoryMapData
}

export interface ControlTerritory {
  id: number
  blocks: string[]
}

export interface AssignmentConfig {
  weekday: Record<string, string>
  weekend: Record<string, string>
  weekendGroupNames: Record<string, string>
}

export interface SundaySelection {
  name: string
  territories: Array<number | string>
}

export interface AssignmentLogItem {
  name: string
  date: string
}

export interface MainState {
  status: Record<string, Record<string, boolean>>
  weekdaySelections: Record<string, Array<number | string>>
  weekendSelections: Record<string, Array<number | string> | SundaySelection>
  archived: number[]
  assignmentLog: Record<string, AssignmentLogItem>
  personalAssignments: Record<string, string>
  mode: 'weekday' | 'weekend'
}

export interface AssignmentHistoryItem {
  id: string
  message: string
  periodText: string
  timestamp?: unknown
}

export interface S13Record {
  name: string
  start: string
  end: string
}

export type S13Data = Record<string, S13Record[]>

