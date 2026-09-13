import { useEffect, useMemo } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import { MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { streetMapPoints } from '../lib/territory'
import type { GlobalMapData, GeoPoint, StreetMapData } from '../types'

const fallbackCenter: [number, number] = [-23.466, -47.74]

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) map.setView(points[0], 17)
    else map.fitBounds(latLngBounds(points), { padding: [36, 36], maxZoom: 18 })
  }, [map, points])
  return null
}

function normalizePolygon(polygon: { points?: GeoPoint[] } | GeoPoint[]) {
  const points = Array.isArray(polygon) ? polygon : polygon.points ?? []
  return points.map((point) => [point.lat, point.lng] as [number, number])
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
}

export function GlobalTerritoryMap({ data, onBlockSelect }: { data?: GlobalMapData; onBlockSelect?: (block: string) => void }) {
  const polygons = useMemo(() => (data?.polygons ?? []).map(normalizePolygon).filter((item) => item.length > 2), [data])
  const allPoints = useMemo(() => polygons.flat(), [polygons])

  return (
    <div className="map-frame">
      <MapContainer center={allPoints[0] ?? fallbackCenter} zoom={16} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {polygons.map((points, index) => (
          <Polygon key={index} positions={points} pathOptions={{ color: '#1f7a62', fillColor: '#46a98d', fillOpacity: 0.25, weight: 3 }} />
        ))}
        {(data?.labels ?? []).map((label, index) => (
          <Marker
            key={`${label.text}-${index}`}
            position={[label.lat, label.lng]}
            icon={divIcon({ className: 'map-block-label', html: `<span>${escapeHtml(label.text)}</span>`, iconSize: [42, 28], iconAnchor: [21, 14] })}
            eventHandlers={{ click: () => onBlockSelect?.(label.text) }}
          >
            <Tooltip>{`Quadra ${label.text}`}</Tooltip>
          </Marker>
        ))}
        <FitToPoints points={allPoints} />
      </MapContainer>
    </div>
  )
}

export function StreetTerritoryMap({ data }: { data?: StreetMapData }) {
  const points = useMemo(() => streetMapPoints(data), [data])
  return (
    <div className="map-frame">
      <MapContainer center={points[0] ?? fallbackCenter} zoom={18} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {points.length > 1 && <Polyline positions={points} pathOptions={{ color: '#d85535', weight: 7, opacity: 0.8 }} />}
        <FitToPoints points={points} />
      </MapContainer>
      {!points.length && <p className="map-empty">Este trajeto ainda não possui coordenadas.</p>}
    </div>
  )
}
