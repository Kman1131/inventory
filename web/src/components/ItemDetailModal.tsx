import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { api } from '../api/client'
import type { InventoryItem, ItemFormData, TransactionFormData, ItemLocation } from '../types'
import { useState } from 'react'
import ItemModal from './ItemModal'
import TransactionModal from './TransactionModal'
import QRModal from './QRModal'

interface ItemDetailModalProps {
  open: boolean
  onClose: () => void
  item: InventoryItem | null
  onDeleted?: () => void
}

function LocationMinQtyRow({ il, itemId, isPrimary }: { il: ItemLocation; itemId: string; isPrimary: boolean }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(il.min_qty ?? 0))

  const mut = useMutation({
    mutationFn: (min_qty: number) =>
      api.updateItemLocation(itemId, { location_id: il.location_id, quantity: il.quantity, min_qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-locations', itemId] })
      setEditing(false)
      toast.success('Min qty updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const locParts = [il.zone, il.aisle, il.bin].filter(Boolean)
  const locLabel = locParts.join(' › ') || '—'

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/50">
      <span className="text-xs text-gray-700 flex-1">
        📍 {locLabel}
        {isPrimary && <span className="ml-1 text-[10px] text-blue-600 font-medium">(primary)</span>}
      </span>
      <span className="text-xs font-semibold text-gray-900 mr-3">{il.quantity} units</span>
      <span className="text-[10px] text-gray-400 mr-1">min:</span>
      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={e => { e.preventDefault(); mut.mutate(parseInt(draft) || 0) }}
        >
          <input
            type="number"
            min={0}
            className="w-14 text-xs border border-blue-400 rounded px-1 py-0.5 text-center"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
          <button type="submit" className="text-xs text-blue-600 font-medium px-1" disabled={mut.isPending}>✓</button>
          <button type="button" className="text-xs text-gray-400 px-1" onClick={() => { setEditing(false); setDraft(String(il.min_qty ?? 0)) }}>✕</button>
        </form>
      ) : (
        <button
          className="text-xs text-gray-600 hover:text-blue-600 underline underline-offset-2"
          onClick={() => { setDraft(String(il.min_qty ?? 0)); setEditing(true) }}
        >
          {il.min_qty ?? 0}
        </button>
      )}
    </div>
  )
}

export default function ItemDetailModal({ open, onClose, item, onDeleted }: ItemDetailModalProps) {
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)

  const { data: itemLocations = [], isLoading: locsLoading } = useQuery({
    queryKey: ['item-locations', item?.id],
    queryFn: () => api.getItemLocations(item!.id),
    enabled: !!item && open,
  })

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions', item?.id],
    queryFn: () => api.getTransactions(item!.id),
    enabled: !!item && open,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ItemFormData> }) => api.updateItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['item-locations', item?.id] })
      setEditOpen(false)
      toast.success('Item updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const txMut = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: TransactionFormData }) => api.createTransaction(itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['transactions', item?.id] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      setTxOpen(false)
      toast.success('Transaction recorded')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      toast.success('Item deleted')
      onClose()
      onDeleted?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!item) return null

  const isLow = item.quantity < item.min_threshold
  const locLabel = item.location_zone
    ? [item.location_zone, item.location_aisle, item.location_bin].filter(Boolean).join(' › ')
    : null

  const handleDelete = () => {
    if (confirm(`Delete "${item.name}" (${item.sku})? All transaction history will also be deleted.`)) {
      deleteMut.mutate(item.id)
    }
  }

  const recentTx = transactions.slice(0, 10)

  return (
    <>
      <Modal open={open} onClose={onClose} title="Item Details" maxWidth="max-w-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isLow ? '⚠ LOW' : '✓ OK'}
              </span>
              {!item.location_id && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
                  ⚠ No Location
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-gray-500 mt-0.5">{item.sku}</p>
            {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
          </div>
          {item.qr_code_data && (
            <button onClick={() => setQrOpen(true)} title="View QR Code" className="flex-shrink-0">
              <img src={item.qr_code_data} alt="QR" className="w-20 h-20 rounded-lg border border-gray-200 hover:border-primary-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'In Stock', value: item.quantity, highlight: isLow },
            { label: 'Min Level', value: item.min_threshold },
            { label: 'Unit Price', value: `$${item.price.toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-gray-50 p-3 text-center">
              <p className={`text-2xl font-bold ${s.highlight ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mb-5">
          {item.category_name && <span>📁 {item.category_name}</span>}
          {locLabel && <span>📍 {locLabel}</span>}
          {(item as any).supplier_name && <span>🏢 {(item as any).supplier_name}</span>}
        </div>

        {/* All Locations breakdown */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Stock Locations</h3>
          {locsLoading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : itemLocations.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              {item.location_id ? 'All stock in primary location' : 'No location assigned'}
            </p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
              {itemLocations.map((il: ItemLocation) => (
                <LocationMinQtyRow key={il.id} il={il} itemId={item.id} isPrimary={item.location_id === il.location_id} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Transactions</h3>
          {txLoading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : recentTx.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden max-h-40 overflow-y-auto">
              {recentTx.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <span className={`font-semibold w-20 flex-shrink-0 ${tx.type === 'IN' ? 'text-green-700' : tx.type === 'OUT' ? 'text-red-600' : 'text-blue-700'}`}>
                    {tx.type}
                  </span>
                  <span className="font-mono text-gray-700 w-12 flex-shrink-0">
                    {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : '±'}{Math.abs(tx.quantity_delta)}
                  </span>
                  <span className="text-gray-500 truncate flex-1">{tx.notes ?? '—'}</span>
                  <span className="text-gray-400 flex-shrink-0">{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          <button className="btn-primary text-sm" onClick={() => setEditOpen(true)}>✎ Edit</button>
          <button className="btn-secondary text-sm" onClick={() => setTxOpen(true)}>⇅ Transaction</button>
          <button
            className="btn-secondary text-sm"
            onClick={() => window.open(api.getLabelsUrl([item.id]), '_blank')}
          >
            🏷 Print Label
          </button>
          {item.qr_code_data && (
            <button className="btn-secondary text-sm" onClick={() => setQrOpen(true)}>▦ QR Code</button>
          )}
          <div className="flex-1" />
          <button
            className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? 'Deleting…' : '✕ Delete'}
          </button>
        </div>
      </Modal>

      {/* Edit sub-modal */}
      <ItemModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={async (data) => { if (item) await updateMut.mutateAsync({ id: item.id, data }) }}
        item={item}
        loading={updateMut.isPending}
      />

      {/* Transaction sub-modal */}
      <TransactionModal
        open={txOpen}
        onClose={() => setTxOpen(false)}
        onSubmit={async (data) => { if (item) await txMut.mutateAsync({ itemId: item.id, data }) }}
        item={item}
        loading={txMut.isPending}
      />

      {/* QR sub-modal */}
      <QRModal open={qrOpen} onClose={() => setQrOpen(false)} item={item} />
    </>
  )
}
