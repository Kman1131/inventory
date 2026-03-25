import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Modal from './Modal'
import { api } from '../api/client'
import type { InventoryItem, TransactionFormData, ItemLocation } from '../types'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TransactionFormData) => Promise<void>
  item: InventoryItem | null
  loading?: boolean
}

export default function TransactionModal({ open, onClose, onSubmit, item, loading }: TransactionModalProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransactionFormData>({
    defaultValues: { type: 'IN', quantity_delta: 1, notes: '', location_id: null },
  })
  const txType = watch('type')
  const locationId = watch('location_id')

  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([])
  const [allLocations, setAllLocations] = useState<{ id: string; zone: string; aisle: string | null; bin: string | null }[]>([])

  useEffect(() => {
    if (open) {
      reset({ type: 'IN', quantity_delta: 1, notes: '', location_id: null })
      setItemLocations([])
      if (item) {
        api.getItemLocations(item.id).then(locs => setItemLocations(locs)).catch(() => {})
        api.getLocations().then(locs => setAllLocations(locs)).catch(() => {})
      }
    }
  }, [open, item, reset])

  // reset location when type changes
  useEffect(() => {
    setValue('location_id', null)
  }, [txType, setValue])

  if (!item) return null

  const selectedLocQty = itemLocations.find(l => l.location_id === locationId)?.quantity ?? null

  const newQty = () => {
    const delta = Number(watch('quantity_delta')) || 0
    if (txType === 'IN')  return item.quantity + Math.abs(delta)
    if (txType === 'OUT') return item.quantity - Math.abs(delta)
    return item.quantity + delta
  }

  const locLabel = (loc: { zone?: string; aisle?: string | null; bin?: string | null }) =>
    [loc.zone, loc.aisle, loc.bin].filter(Boolean).join(' / ')

  // For OUT: only show locations that have stock
  const outLocations = itemLocations.filter(l => l.quantity > 0)

  return (
    <Modal open={open} onClose={onClose} title="Record Stock Transaction" maxWidth="max-w-md">
      {/* Item summary */}
      <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Current stock</p>
          <p className="text-xl font-bold text-gray-900">{item.quantity}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type */}
        <div>
          <label className="label">Transaction Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['IN', 'OUT', 'ADJUSTMENT'] as const).map(t => (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  txType === t
                    ? t === 'IN'  ? 'border-green-500 bg-green-50 text-green-700'
                    : t === 'OUT' ? 'border-red-500 bg-red-50 text-red-700'
                    :               'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <input type="radio" value={t} className="sr-only" {...register('type')} />
                {t === 'IN' ? '+ IN' : t === 'OUT' ? '− OUT' : '± ADJ'}
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="label">
            Location {(txType === 'IN' || txType === 'OUT') ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(optional)</span>}
          </label>
          {txType === 'OUT' ? (
            outLocations.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">No locations with stock found</p>
            ) : (
              <select
                className="input"
                {...register('location_id', { required: 'Location is required for OUT transactions' })}
              >
                <option value="">Select location…</option>
                {outLocations.map(l => (
                  <option key={l.location_id} value={l.location_id}>
                    {locLabel(l)} — {l.quantity} in stock
                  </option>
                ))}
              </select>
            )
          ) : (
            <select
              className="input"
              {...register('location_id', { required: txType === 'IN' ? 'Location is required for IN transactions' : false })}
            >
              <option value="">
                {txType === 'IN' ? 'Select destination location…' : 'No specific location (total only)'}
              </option>
              {allLocations.map(l => (
                <option key={l.id} value={l.id}>
                  {locLabel(l)}
                </option>
              ))}
            </select>
          )}
          {errors.location_id && (
            <p className="mt-1 text-xs text-red-600">{errors.location_id.message}</p>
          )}
          {selectedLocQty !== null && txType !== 'IN' && (
            <p className="mt-1 text-xs text-gray-500">Stock at this location: <strong>{selectedLocQty}</strong></p>
          )}
        </div>

        {/* Delta */}
        <div>
          <label className="label">
            {txType === 'ADJUSTMENT' ? 'Delta (+ add, − remove)' : 'Quantity'}
          </label>
          <input
            type="number"
            className="input"
            min={txType === 'ADJUSTMENT' ? undefined : 1}
            {...register('quantity_delta', {
              valueAsNumber: true,
              required: 'Quantity is required',
              validate: v => {
                if (txType === 'OUT') {
                  const cap = selectedLocQty !== null ? selectedLocQty : item.quantity
                  if (Math.abs(v) > cap)
                    return `Cannot remove more than available stock (${cap})`
                }
                return true
              },
            })}
          />
          {errors.quantity_delta && (
            <p className="mt-1 text-xs text-red-600">{errors.quantity_delta.message}</p>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-lg bg-primary-50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-primary-700 font-medium">New total stock level</span>
          <span className={`text-xl font-bold ${newQty() < item.min_threshold ? 'text-red-600' : 'text-green-700'}`}>
            {newQty()}
          </span>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" placeholder="Reason, reference, etc." {...register('notes')} />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
