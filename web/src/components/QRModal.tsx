import { useEffect, useState } from 'react'
import Modal from './Modal'
import { api } from '../api/client'
import type { InventoryItem } from '../types'

interface LocationQR {
  location_id: string
  zone: string
  aisle: string | null
  bin: string | null
  quantity: number
  qr_data: string
}

interface QRModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
}

export default function QRModal({ open, onClose, item }: QRModalProps) {
  const [locationQRs, setLocationQRs] = useState<LocationQR[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && item) {
      setLoading(true)
      setSelected(new Set())
      api.getItemLocationQRs(item.id)
        .then(qrs => {
          setLocationQRs(qrs)
          setSelected(new Set(qrs.map(q => q.location_id)))
        })
        .catch(() => setLocationQRs([]))
        .finally(() => setLoading(false))
    }
  }, [open, item])

  if (!item) return null

  const locLabel = (loc: LocationQR) => [loc.zone, loc.aisle, loc.bin].filter(Boolean).join(' / ')

  const handleDownload = (qr: LocationQR) => {
    const a = document.createElement('a')
    a.href = qr.qr_data
    a.download = `qr-${item.sku}-${qr.zone}${qr.aisle ? '-' + qr.aisle : ''}${qr.bin ? '-' + qr.bin : ''}.png`
    a.click()
  }

  const handleDownloadSingle = () => {
    if (!item.qr_code_data) return
    const a = document.createElement('a')
    a.href = item.qr_code_data
    a.download = `qr-${item.sku}.png`
    a.click()
  }

  const toggleSelect = (locationId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(locationId)) next.delete(locationId)
      else next.add(locationId)
      return next
    })
  }

  const handlePrintSelected = () => {
    const selectedQRs = locationQRs.filter(q => selected.has(q.location_id))
    const html = `<!DOCTYPE html><html><head><style>
      body { margin: 0; font-family: sans-serif; }
      .page { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; }
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; width: 160px; }
      img { width: 120px; height: 120px; }
      .name { font-size: 11px; font-weight: 600; margin-top: 6px; }
      .loc { font-size: 10px; color: #555; }
      .sku { font-size: 10px; color: #888; font-family: monospace; }
    </style></head><body><div class="page">${selectedQRs.map(q => `
      <div class="card">
        <img src="${q.qr_data}" />
        <div class="name">${item.name}</div>
        <div class="sku">${item.sku}</div>
        <div class="loc">${locLabel(q)}</div>
        <div class="loc">Qty: ${q.quantity}</div>
      </div>`).join('')}</div></body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  // Fallback to single QR if no locations
  const hasLocations = locationQRs.length > 0

  return (
    <Modal open={open} onClose={onClose} title={`QR Code — ${item.name}`} maxWidth={hasLocations ? 'max-w-lg' : 'max-w-xs'}>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Loading location QR codes…</div>
      ) : hasLocations ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Select locations to print. Each QR code encodes SKU + location for automatic stock transactions when scanned.</p>

          {/* Select all / none */}
          <div className="flex gap-3 text-xs">
            <button className="text-primary-600 hover:underline" onClick={() => setSelected(new Set(locationQRs.map(q => q.location_id)))}>Select all</button>
            <button className="text-gray-400 hover:underline" onClick={() => setSelected(new Set())}>None</button>
          </div>

          {/* Location QR list */}
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {locationQRs.map(qr => (
              <div
                key={qr.location_id}
                className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${selected.has(qr.location_id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'}`}
                onClick={() => toggleSelect(qr.location_id)}
              >
                <img src={qr.qr_data} alt={`QR ${locLabel(qr)}`} className="w-24 h-24 rounded-lg" />
                <p className="text-xs font-semibold text-center text-gray-800">{locLabel(qr)}</p>
                <p className="text-xs text-gray-400">Qty: {qr.quantity}</p>
                <button
                  className="text-xs text-primary-600 hover:underline mt-0.5"
                  onClick={e => { e.stopPropagation(); handleDownload(qr) }}
                >
                  ⬇ Download
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className="btn-primary flex-1 text-sm"
              onClick={handlePrintSelected}
              disabled={selected.size === 0}
            >
              🖨 Print Selected ({selected.size})
            </button>
            <button className="btn-secondary text-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      ) : (
        /* No locations — show item-level QR */
        <div className="flex flex-col items-center gap-4">
          {item.qr_code_data ? (
            <img
              src={item.qr_code_data}
              alt={`QR code for ${item.name}`}
              className="w-52 h-52 rounded-xl border border-gray-200"
            />
          ) : (
            <div className="w-52 h-52 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
              No QR code
            </div>
          )}
          <div className="w-full text-center space-y-1">
            <p className="text-sm font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-500 font-mono">SKU: {item.sku}</p>
          </div>
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 w-full text-center">
            No locations assigned. Add stock IN to a location to generate per-location QR codes.
          </div>
          <div className="flex gap-2 w-full">
            <button className="btn-secondary flex-1 text-xs" onClick={handleDownloadSingle} disabled={!item.qr_code_data}>
              ⬇ Download PNG
            </button>
            <button className="btn-secondary flex-1 text-xs" onClick={() => window.print()}>
              🖨 Print
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
