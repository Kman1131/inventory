import Modal from './Modal'
import type { InventoryItem } from '../types'

interface QRModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
}

export default function QRModal({ open, onClose, item }: QRModalProps) {
  if (!item) return null

  const handleDownload = () => {
    if (!item.qr_code_data) return
    const a = document.createElement('a')
    a.href = item.qr_code_data
    a.download = `qr-${item.sku}.png`
    a.click()
  }

  return (
    <Modal open={open} onClose={onClose} title={`QR Code — ${item.name}`} maxWidth="max-w-xs">
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
          <p className="text-xs text-gray-400 font-mono break-all">ID: {item.id}</p>
        </div>

        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 w-full text-center">
          Scan with mobile app to view live stock
        </div>

        <div className="flex gap-2 w-full">
          <button className="btn-secondary flex-1 text-xs" onClick={handleDownload} disabled={!item.qr_code_data}>
            ⬇ Download PNG
          </button>
          <button className="btn-secondary flex-1 text-xs" onClick={() => window.print()}>
            🖨 Print
          </button>
        </div>
      </div>
    </Modal>
  )
}
