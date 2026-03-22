import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import Modal from './Modal'
import { api } from '../api/client'
import type { Category, CategoryFormData } from '../types'

interface CategoryModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CategoryFormData) => Promise<void>
  category?: Category | null
  loading?: boolean
}

export default function CategoryModal({ open, onClose, onSubmit, category, loading }: CategoryModalProps) {
  const isEdit = !!category
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    defaultValues: { name: '', parent_id: '' },
  })

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: api.getCategories })
  // Exclude the current category from parent options to prevent cycles
  const parentOptions = categories.filter(c => c.id !== category?.id)

  useEffect(() => {
    if (open) reset({ name: category?.name ?? '', parent_id: category?.parent_id ?? '' })
  }, [open, category, reset])

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Category' : 'Add Category'} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Category Name *</label>
          <input
            className="input"
            placeholder="e.g. Electronics"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Parent Category</label>
          <select className="input" {...register('parent_id')}>
            <option value="">— None (top-level) —</option>
            {parentOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
