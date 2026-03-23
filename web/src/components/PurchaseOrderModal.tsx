import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import Modal from './Modal'
import { api } from '../api/client'
import type { PurchaseOrder, POFormData, Supplier } from '../types'

interface POModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: POFormData) => Promise<void>
  po?: PurchaseOrder | null      // if provided → edit mode (status / notes only)
  loading?: boolean
}

export default function PurchaseOrderModal({ open, onClose, onSubmit, po, loading }: POModalProps) {
  const isEdit = !!po
  const [itemSearch, setItemSearch] = useState('')

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: api.getSuppliers,
  })

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['items'],
    queryFn: api.getItems,
    enabled: !isEdit,
  })

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<POFormData>({
    defaultValues: {
      supplier_id: '',
      notes: '',
      items: [{ item_id: '', sku: '', name: '', quantity_ordered: 1, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (open) {
      if (isEdit && po) {
        reset({
          supplier_id: po.supplier_id ?? '',
          notes: po.notes ?? '',
          items: po.items?.length
            ? po.items.map(i => ({
                item_id: i.item_id ?? '',
                sku: i.sku,
                name: i.name,
                quantity_ordered: i.quantity_ordered,
                unit_price: i.unit_price,
              }))
            : [{ item_id: '', sku: '', name: '', quantity_ordered: 1, unit_price: 0 }],
        })
      } else {
        reset({ supplier_id: '', notes: '', items: [{ item_id: '', sku: '', name: '', quantity_ordered: 1, unit_price: 0 }] })
      }
    }
  }, [open, isEdit, po, reset])

  const handleSelectInventoryItem = (index: number, itemId: string) => {
    const inv = inventoryItems.find(i => i.id === itemId)
    if (inv) {
      setValue(`items.${index}.item_id`, inv.id)
      setValue(`items.${index}.sku`, inv.sku)
      setValue(`items.${index}.name`, inv.name)
      setValue(`items.${index}.unit_price`, inv.price)
    }
    setItemSearch('')
  }

  const statusOptions = ['draft', 'sent', 'received', 'cancelled'] as const

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit PO — ${po?.po_number}` : 'New Purchase Order'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Supplier + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" {...register('supplier_id')}>
              <option value="">— None —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status' as any)}>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Delivery instructions, reference…"
            {...register('notes')}
          />
        </div>

        {/* Line items (create mode only) */}
        {!isEdit && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <button
                type="button"
                className="text-xs text-primary-700 hover:text-primary-900 font-medium"
                onClick={() => append({ item_id: '', sku: '', name: '', quantity_ordered: 1, unit_price: 0 })}
              >
                + Add Row
              </button>
            </div>

            {/* Inventory quick-search */}
            <div className="mb-3">
              <input
                className="input text-sm"
                placeholder="🔍 Search inventory to prefill a row…"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
              />
              {itemSearch.length >= 2 && (
                <ul className="border rounded-lg divide-y mt-1 max-h-40 overflow-y-auto bg-white shadow-sm text-sm">
                  {inventoryItems
                    .filter(i =>
                      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
                    )
                    .slice(0, 8)
                    .map(i => (
                      <li key={i.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          onClick={() => handleSelectInventoryItem(fields.length - 1, i.id)}
                        >
                          <span className="font-medium">{i.name}</span>
                          <span className="ml-2 text-gray-400 text-xs">{i.sku}</span>
                        </button>
                      </li>
                    ))}
                  {inventoryItems.filter(i =>
                    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                    i.sku.toLowerCase().includes(itemSearch.toLowerCase())
                  ).length === 0 && (
                    <li className="px-3 py-2 text-gray-400">No matches</li>
                  )}
                </ul>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-1">
                    <label className="label text-xs">SKU</label>
                    <input className="input text-sm" placeholder="SKU" {...register(`items.${index}.sku`, { required: true })} />
                  </div>
                  <div className="col-span-4">
                    <label className="label text-xs">Name *</label>
                    <input
                      className="input text-sm"
                      placeholder="Item name"
                      {...register(`items.${index}.name`, { required: 'Name required' })}
                    />
                    {errors.items?.[index]?.name && (
                      <p className="text-xs text-red-600">{errors.items[index]?.name?.message}</p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <label className="label text-xs">Qty *</label>
                    <input
                      type="number"
                      className="input text-sm"
                      min={1}
                      {...register(`items.${index}.quantity_ordered`, { valueAsNumber: true, min: 1 })}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label text-xs">Unit Price</label>
                    <input
                      type="number"
                      className="input text-sm"
                      step="0.01"
                      min={0}
                      {...register(`items.${index}.unit_price`, { valueAsNumber: true, min: 0 })}
                    />
                  </div>
                  <div className="col-span-1 pb-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                        onClick={() => remove(index)}
                        title="Remove row"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <input type="hidden" {...register(`items.${index}.item_id`)} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create PO'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
