import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { Supplier, SupplierFormData } from '../types'
import SupplierModal from '../components/SupplierModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null)

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: api.getSuppliers,
  })

  const createMut = useMutation({
    mutationFn: (d: SupplierFormData) => api.createSupplier(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier added')
      setModalOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupplierFormData> }) =>
      api.updateSupplier(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier updated')
      setModalOpen(false)
      setSelected(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteSupplier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted')
      setConfirmDelete(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSubmit = async (data: SupplierFormData) => {
    if (selected) {
      await updateMut.mutateAsync({ id: selected.id, data })
    } else {
      await createMut.mutateAsync(data)
    }
  }

  const openEdit = (s: Supplier) => { setSelected(s); setModalOpen(true) }
  const openCreate = () => { setSelected(null); setModalOpen(true) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product suppliers</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Supplier</button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">🏢</span>
          <p className="text-gray-500">No suppliers yet.</p>
          <button className="btn-primary mt-4" onClick={openCreate}>Add your first supplier</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Company', 'Contact', 'Email', 'Phone', 'Address', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.contact_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.email ? (
                      <a href={`mailto:${s.email}`} className="text-primary-700 hover:underline">{s.email}</a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{s.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-sm text-primary-700 hover:text-primary-900 font-medium mr-3"
                      onClick={() => openEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm text-red-500 hover:text-red-700 font-medium"
                      onClick={() => setConfirmDelete(s)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SupplierModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null) }}
        onSubmit={handleSubmit}
        supplier={selected}
        loading={createMut.isPending || updateMut.isPending}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Supplier"
        message={`Remove "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}
