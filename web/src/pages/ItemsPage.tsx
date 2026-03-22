import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import ItemModal from '../components/ItemModal'
import TransactionModal from '../components/TransactionModal'
import ConfirmDialog from '../components/ConfirmDialog'
import QRModal from '../components/QRModal'
import type { InventoryItem, ItemFormData, TransactionFormData } from '../types'

export default function ItemsPage() {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({ queryKey: ['items'], queryFn: api.getItems })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: api.getCategories })

  // Search + filter
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'ok'>('all')

  const filtered = useMemo(() => items.filter(item => {
    const q = search.toLowerCase()
    const matchText = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
    const matchCat  = !filterCat || item.category_id === filterCat
    const matchStock = filterStock === 'all' ? true
      : filterStock === 'low' ? item.quantity < item.min_threshold
      : item.quantity >= item.min_threshold
    return matchText && matchCat && matchStock
  }), [items, search, filterCat, filterStock])

  // Modal state
  const [itemModal, setItemModal]   = useState(false)
  const [editItem, setEditItem]     = useState<InventoryItem | null>(null)
  const [txItem, setTxItem]         = useState<InventoryItem | null>(null)
  const [qrItem, setQrItem]         = useState<InventoryItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null)

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<ItemFormData>) => api.createItem(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); setItemModal(false); toast.success('Item created') },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ItemFormData> }) => api.updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setEditItem(null); toast.success('Item updated') },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); setDeleteItem(null); toast.success('Item deleted') },
    onError: (e: Error) => toast.error(e.message),
  })
  const txMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: TransactionFormData }) => api.createTransaction(itemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); qc.invalidateQueries({ queryKey: ['low-stock'] }); setTxItem(null); toast.success('Transaction recorded') },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleCreate = async (data: ItemFormData) => { await createMutation.mutateAsync(data) }
  const handleUpdate = async (data: ItemFormData) => { if (editItem) await updateMutation.mutateAsync({ id: editItem.id, data }) }
  const handleDelete = async () => { if (deleteItem) await deleteMutation.mutateAsync(deleteItem.id) }
  const handleTx     = async (data: TransactionFormData) => { if (txItem) await txMutation.mutateAsync({ itemId: txItem.id, data }) }

  if (isLoading) return <div className="flex h-64 items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full"></div></div>
  if (error) return <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-700">{(error as Error).message}</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{items.length} items total</p>
        </div>
        <button className="btn-primary" onClick={() => setItemModal(true)}>+ Add Item</button>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <input
          className="input w-64"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['all', 'low', 'ok'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStock(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStock === s ? 'bg-primary-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s === 'low' ? '⚠ Low' : '✓ OK'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">SKU</th>
                <th className="table-th">Name</th>
                <th className="table-th">Category</th>
                <th className="table-th">Location</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th text-right">Min</th>
                <th className="table-th text-right">Price</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-gray-400">
                    No items found
                  </td>
                </tr>
              ) : filtered.map(item => {
                const isLow = item.quantity < item.min_threshold
                const locLabel = item.location_zone
                  ? [item.location_zone, item.location_aisle, item.location_bin].filter(Boolean).join(' › ')
                  : '—'
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-red-50/40' : ''}`}>
                    <td className="table-td font-mono text-xs text-gray-500">{item.sku}</td>
                    <td className="table-td">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>}
                    </td>
                    <td className="table-td text-gray-500">{item.category_name ?? '—'}</td>
                    <td className="table-td text-xs text-gray-500">{locLabel}</td>
                    <td className="table-td text-right">
                      <span className={`font-bold text-base ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity}</span>
                    </td>
                    <td className="table-td text-right text-gray-400">{item.min_threshold}</td>
                    <td className="table-td text-right text-gray-600">${item.price.toFixed(2)}</td>
                    <td className="table-td text-center">
                      <span className={isLow ? 'badge-low' : 'badge-ok'}>{isLow ? 'LOW' : 'OK'}</span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setTxItem(item)}
                          className="btn-ghost btn-sm rounded-lg text-primary-700 hover:bg-primary-50"
                          title="Record Transaction"
                        >⇅</button>
                        <button
                          onClick={() => setQrItem(item)}
                          className="btn-ghost btn-sm rounded-lg"
                          title="View QR Code"
                        >▦</button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="btn-ghost btn-sm rounded-lg"
                          title="Edit"
                        >✎</button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="btn-ghost btn-sm rounded-lg text-red-500 hover:bg-red-50"
                          title="Delete"
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ItemModal
        open={itemModal}
        onClose={() => setItemModal(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
      />
      <ItemModal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSubmit={handleUpdate}
        item={editItem}
        loading={updateMutation.isPending}
      />
      <TransactionModal
        open={!!txItem}
        onClose={() => setTxItem(null)}
        onSubmit={handleTx}
        item={txItem}
        loading={txMutation.isPending}
      />
      <QRModal open={!!qrItem} onClose={() => setQrItem(null)} item={qrItem} />
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        message={`Delete "${deleteItem?.name}" (${deleteItem?.sku})? This will also delete all transaction history for this item.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
