import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import Modal from './Modal'
import { api } from '../api/client'
import type { InventoryItem, ItemFormData } from '../types'

interface ItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ItemFormData) => Promise<void>
  item?: InventoryItem | null
  loading?: boolean
}

export default function ItemModal({ open, onClose, onSubmit, item, loading }: ItemModalProps) {
  const isEdit = !!item

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemFormData>({
    defaultValues: {
      sku: '', name: '', description: '',
      quantity: 0, min_threshold: 5, price: 0,
      category_id: '', location_id: '',
    },
  })

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: api.getCategories })
  const { data: locations = []  } = useQuery({ queryKey: ['locations'],  queryFn: api.getLocations  })

  useEffect(() => {
    if (open) {
      reset(item
        ? {
            sku: item.sku, name: item.name,
            description: item.description ?? '',
            quantity: item.quantity,
            min_threshold: item.min_threshold,
            price: item.price,
            category_id: item.category_id ?? '',
            location_id: item.location_id ?? '',
          }
        : { sku: '', name: '', description: '', quantity: 0, min_threshold: 5, price: 0, category_id: '', location_id: '' }
      )
    }
  }, [open, item, reset])

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Item' : 'Add New Item'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* SKU */}
          <div>
            <label className="label">SKU *</label>
            <input
              className="input"
              placeholder="e.g. WDG-001"
              {...register('sku', { required: 'SKU is required' })}
            />
            {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
          </div>
          {/* Name */}
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              placeholder="Item name"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Optional description…"
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Quantity — only shown on create */}
          {!isEdit && (
            <div>
              <label className="label">Initial Qty</label>
              <input
                type="number"
                className="input"
                min={0}
                {...register('quantity', { valueAsNumber: true, min: 0 })}
              />
            </div>
          )}
          <div>
            <label className="label">Min Threshold</label>
            <input
              type="number"
              className="input"
              min={0}
              {...register('min_threshold', { valueAsNumber: true, min: 0 })}
            />
          </div>
          <div>
            <label className="label">Unit Price ($)</label>
            <input
              type="number"
              className="input"
              step="0.01"
              min={0}
              {...register('price', { valueAsNumber: true, min: 0 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select className="input" {...register('category_id')}>
              <option value="">— None —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {/* Location */}
          <div>
            <label className="label">Location</label>
            <select className="input" {...register('location_id')}>
              <option value="">— None —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.zone}{l.aisle ? ` › ${l.aisle}` : ''}{l.bin ? ` › ${l.bin}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEdit && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            ℹ Quantity can only be changed by recording a transaction (IN / OUT / ADJUSTMENT).
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
