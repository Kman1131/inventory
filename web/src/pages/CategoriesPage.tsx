import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import CategoryModal from '../components/CategoryModal'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Category, CategoryFormData } from '../types'

export default function CategoriesPage() {
  const qc = useQueryClient()
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: api.getItems })

  const [modal, setModal]       = useState(false)
  const [editCat, setEditCat]   = useState<Category | null>(null)
  const [deleteCat, setDeleteCat] = useState<Category | null>(null)

  const catItemCount = (catId: string) => items.filter(i => i.category_id === catId).length
  const catMap = new Map(categories.map(c => [c.id, c.name]))

  const createMutation = useMutation({
    mutationFn: (d: CategoryFormData) => api.createCategory(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setModal(false); toast.success('Category created') },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: CategoryFormData }) => api.updateCategory(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditCat(null); toast.success('Category updated') },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['items'] }); setDeleteCat(null); toast.success('Category deleted') },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{categories.length} categories</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Add Category</button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="animate-spin h-6 w-6 border-4 border-primary-900 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">Name</th>
                <th className="table-th">Parent</th>
                <th className="table-th text-right">Items</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-sm text-gray-400">No categories yet</td></tr>
              ) : categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-medium">{cat.name}</td>
                  <td className="table-td text-gray-500">{cat.parent_id ? catMap.get(cat.parent_id) ?? '—' : '—'}</td>
                  <td className="table-td text-right">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {catItemCount(cat.id)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditCat(cat)} className="btn-ghost btn-sm rounded-lg" title="Edit">✎</button>
                      <button onClick={() => setDeleteCat(cat)} className="btn-ghost btn-sm rounded-lg text-red-500 hover:bg-red-50" title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CategoryModal open={modal}    onClose={() => setModal(false)}   onSubmit={async d => { await createMutation.mutateAsync(d) }} loading={createMutation.isPending} />
      <CategoryModal open={!!editCat} onClose={() => setEditCat(null)} onSubmit={async d => { if (editCat) await updateMutation.mutateAsync({ id: editCat.id, d }) }} category={editCat} loading={updateMutation.isPending} />
      <ConfirmDialog
        open={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={async () => { if (deleteCat) await deleteMutation.mutateAsync(deleteCat.id) }}
        message={`Delete category "${deleteCat?.name}"? Items in this category will become uncategorised.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
