import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { TransactionFormData, TransactionType } from '../types'

const TYPE_CONFIG = {
  IN:         { label: '+ Stock In',   bg: 'bg-green-50',  border: 'border-green-500', text: 'text-green-700',  badge: 'bg-green-100 text-green-800' },
  OUT:        { label: '− Stock Out',  bg: 'bg-red-50',    border: 'border-red-500',   text: 'text-red-700',    badge: 'bg-red-100 text-red-800'     },
  ADJUSTMENT: { label: '± Adjustment', bg: 'bg-amber-50',  border: 'border-amber-500', text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-800'  },
} as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdjustmentsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState('')

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: api.getItems })
  const selectedItem = items.find(i => i.id === selectedId) ?? null

  const { data: history = [], isFetching: historyLoading } = useQuery({
    queryKey: ['transactions', selectedId],
    queryFn: () => api.getTransactions(selectedId),
    enabled: !!selectedId,
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TransactionFormData>({
    defaultValues: { type: 'IN', quantity_delta: 1, notes: '' },
  })

  const txType   = watch('type') as TransactionType
  const rawDelta = watch('quantity_delta')

  const previewQty = (() => {
    if (!selectedItem) return null
    const delta = Number(rawDelta) || 0
    if (txType === 'IN')         return selectedItem.quantity + Math.abs(delta)
    if (txType === 'OUT')        return selectedItem.quantity - Math.abs(delta)
    return selectedItem.quantity + delta
  })()

  const mutation = useMutation({
    mutationFn: (data: TransactionFormData) => api.createTransaction(selectedId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['transactions', selectedId] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      reset({ type: txType, quantity_delta: 1, notes: '' })
      toast.success('Transaction recorded')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (data: TransactionFormData) => {
    if (!selectedId) { toast.error('Select an item first'); return }
    mutation.mutate(data)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Adjustments</h1>
        <p className="text-sm text-gray-500">Record stock in, out, or manual corrections</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* ── Form ── */}
        <div className="lg:col-span-2 card p-6 space-y-5 h-fit">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Record Transaction</h2>

          {/* Item selector */}
          <div>
            <label className="label">Item *</label>
            <select
              className="input"
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value)
                reset({ type: 'IN', quantity_delta: 1, notes: '' })
              }}
            >
              <option value="">— Select an item —</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}  ·  {item.sku}  ·  qty: {item.quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Current stock pill */}
          {selectedItem && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{selectedItem.name}</p>
                <p className="text-xs text-gray-500">SKU: {selectedItem.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Current</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{selectedItem.quantity}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Type toggle */}
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_CONFIG) as TransactionType[]).map(t => {
                  const cfg = TYPE_CONFIG[t]
                  const active = txType === t
                  return (
                    <label
                      key={t}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-xs font-bold transition-all ${
                        active ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <input type="radio" value={t} className="sr-only" {...register('type')} />
                      <span className="text-lg leading-none mb-1">
                        {t === 'IN' ? '⬆' : t === 'OUT' ? '⬇' : '⇅'}
                      </span>
                      <span>{t === 'IN' ? 'Stock In' : t === 'OUT' ? 'Stock Out' : 'Adjust'}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="label">
                {txType === 'ADJUSTMENT' ? 'Delta (negative to reduce)' : 'Quantity'}
              </label>
              <input
                type="number"
                className="input text-lg font-semibold"
                {...register('quantity_delta', {
                  valueAsNumber: true,
                  required: 'Quantity is required',
                  validate: v => {
                    if (!selectedItem) return true
                    if (txType === 'OUT' && Math.abs(Number(v)) > selectedItem.quantity)
                      return `Max removable: ${selectedItem.quantity}`
                    if (txType === 'ADJUSTMENT' && selectedItem.quantity + Number(v) < 0)
                      return 'Result cannot be negative'
                    return true
                  },
                })}
              />
              {errors.quantity_delta && (
                <p className="mt-1 text-xs text-red-600">{errors.quantity_delta.message}</p>
              )}
            </div>

            {/* Preview */}
            {selectedItem && previewQty !== null && (
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
                previewQty < selectedItem.min_threshold
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div>
                  <p className="text-xs font-medium text-gray-500">New stock level</p>
                  {previewQty < selectedItem.min_threshold && (
                    <p className="text-xs text-red-500 mt-0.5">Below minimum threshold ({selectedItem.min_threshold})</p>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-sm text-gray-400 line-through">{selectedItem.quantity}</span>
                  <span className={`text-3xl font-bold leading-none ${
                    previewQty < selectedItem.min_threshold ? 'text-red-600' : 'text-green-700'
                  }`}>{previewQty}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <input
                className="input"
                placeholder="PO number, reason, reference…"
                {...register('notes')}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-3"
              disabled={!selectedId || mutation.isPending}
            >
              {mutation.isPending
                ? 'Saving…'
                : txType === 'IN'  ? '⬆ Record Stock In'
                : txType === 'OUT' ? '⬇ Record Stock Out'
                :                   '⇅ Record Adjustment'}
            </button>
          </form>
        </div>

        {/* ── History ── */}
        <div className="lg:col-span-3 card overflow-hidden h-fit">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {selectedItem ? `History — ${selectedItem.name}` : 'Transaction History'}
            </h2>
            {historyLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
            )}
          </div>

          {!selectedId ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-gray-400">
              <span className="text-4xl">⇅</span>
              <p className="text-sm">Select an item to see its history</p>
            </div>
          ) : history.length === 0 && !historyLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-gray-400">
              <span className="text-4xl">📋</span>
              <p className="text-sm">No transactions yet for this item</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {history.map(tx => {
                const cfg = TYPE_CONFIG[tx.type]
                const sign = tx.type === 'IN'
                  ? `+${Math.abs(tx.quantity_delta)}`
                  : tx.type === 'OUT'
                  ? `−${Math.abs(tx.quantity_delta)}`
                  : (tx.quantity_delta >= 0 ? `+${tx.quantity_delta}` : `${tx.quantity_delta}`)
                return (
                  <div key={tx.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    {/* Type badge */}
                    <span className={`mt-0.5 flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${cfg.badge}`}>
                      {tx.type}
                    </span>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                      {tx.notes && <p className="text-sm text-gray-700 mt-0.5 truncate">{tx.notes}</p>}
                      {tx.device_id && <p className="text-xs text-gray-400 mt-0.5">via {tx.device_id}</p>}
                    </div>

                    {/* Delta */}
                    <span className={`text-xl font-bold flex-shrink-0 ${cfg.text}`}>{sign}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
