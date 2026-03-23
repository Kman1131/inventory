import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { PurchaseOrder, POFormData } from '../types'
import PurchaseOrderModal from '../components/PurchaseOrderModal'
import ConfirmDialog from '../components/ConfirmDialog'

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-yellow-100 text-yellow-800',
  sent:      'bg-blue-100 text-blue-800',
  received:  'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function PurchaseOrdersPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PurchaseOrder | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders'],
    queryFn: api.getPurchaseOrders,
  })

  const createMut = useMutation({
    mutationFn: (d: POFormData) => api.createPurchaseOrder(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order created')
      setModalOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ status: string; notes: string; supplier_id: string }> }) =>
      api.updatePurchaseOrder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order updated')
      setModalOpen(false)
      setSelected(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deletePurchaseOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order deleted')
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const autoGenMut = useMutation({
    mutationFn: () => api.autoGeneratePOs(),
    onSuccess: (pos) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(`${pos.length} PO(s) auto-generated from low stock`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSubmit = async (data: POFormData) => {
    if (selected) {
      await updateMut.mutateAsync({ id: selected.id, data: { status: (data as any).status, notes: data.notes, supplier_id: data.supplier_id } })
    } else {
      await createMut.mutateAsync(data)
    }
  }

  const handleSendEmail = async (po: PurchaseOrder) => {
    setSendingId(po.id)
    try {
      const res = await api.sendPOEmail(po.id)
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success(res.message || 'Email sent')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSendingId(null)
    }
  }

  const openEdit = (po: PurchaseOrder) => { setSelected(po); setModalOpen(true) }
  const openCreate = () => { setSelected(null); setModalOpen(true) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Track orders to your suppliers</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => autoGenMut.mutate()}
            disabled={autoGenMut.isPending}
          >
            {autoGenMut.isPending ? '⟳ Generating…' : '⚡ Auto-generate from Low Stock'}
          </button>
          <button className="btn-primary" onClick={openCreate}>+ New PO</button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">🛒</span>
          <p className="text-gray-500">No purchase orders yet.</p>
          <p className="text-sm text-gray-400 mt-1">Create one manually or auto-generate from low stock items.</p>
          <button className="btn-primary mt-4" onClick={openCreate}>Create PO</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['PO #', 'Supplier', 'Status', 'Items', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(po => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-primary-800">{po.po_number}</td>
                  <td className="px-4 py-3 text-gray-700">{po.supplier_name ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[po.status] ?? ''}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {po.items ? po.items.length : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(po.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={api.getPOPdfUrl(po.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-600 hover:text-primary-700 font-medium"
                        title="Download PDF"
                      >
                        📄 PDF
                      </a>
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        onClick={() => handleSendEmail(po)}
                        disabled={sendingId === po.id}
                        title="Send email to supplier"
                      >
                        {sendingId === po.id ? '⟳ Sending…' : '✉ Email'}
                      </button>
                      <button
                        className="text-xs text-primary-700 hover:text-primary-900 font-medium"
                        onClick={() => openEdit(po)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                        onClick={() => setConfirmDelete(po)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PurchaseOrderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null) }}
        onSubmit={handleSubmit}
        po={selected}
        loading={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Purchase Order"
        message={`Delete "${confirmDelete?.po_number}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}
