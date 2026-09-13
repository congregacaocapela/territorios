import { Maximize2, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from './Modal'

export function MapImageModal({ territoryId, open, onClose }: { territoryId?: string; open: boolean; onClose: () => void }) {
  const [extension, setExtension] = useState<'png' | 'jpg'>('png')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (open) {
      setExtension('png')
      setZoom(1)
    }
  }, [open, territoryId])

  return (
    <Modal title={`Mapa do território ${territoryId ?? ''}`} open={open} onClose={onClose}>
      <div className="image-modal-tools">
        <button className="icon-button" onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))} aria-label="Diminuir"><Minus /></button>
        <button className="icon-button" onClick={() => setZoom(1)} aria-label="Tamanho original"><Maximize2 /></button>
        <button className="icon-button" onClick={() => setZoom((value) => Math.min(3, value + 0.2))} aria-label="Aumentar"><Plus /></button>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div className="map-image-scroll">
        {territoryId && (
          <img
            src={`/territories/territorio${territoryId}.${extension}`}
            alt={`Mapa do território ${territoryId}`}
            style={{ transform: `scale(${zoom})` }}
            onError={() => extension === 'png' && setExtension('jpg')}
          />
        )}
      </div>
    </Modal>
  )
}
