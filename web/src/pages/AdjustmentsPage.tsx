import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { TransactionFormData, TransactionType, TransferFormData, ItemLocation, StockTransfer } from '../types'

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

function locLabel(zone?: string | null, aisle?: string | null, bin?: string | null) {
  const parts = [zone, aisle, bin].filter(Boolean)
  return parts.join(' › ') || '—'
}

// ─────────────────────────────────────────────────────────────────────────────
//  Transfer tab
// ─────────────────────────────────────────────────────────────────────────────
function TransferTab() {
  const qc = useQueryClient()
  const [itemId, setItemId] = useState('')

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } =
    useForm<TransferFormData>({ defaultValues: { item_id: '', from_location_id: '', to_location_id: '', quantity: 1, notes: '' } })

  const fromLocationId = watch('from_location_id')
  const transferQty    = watch('quantity')

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: api.getItems })

  const { data: itemLocs = [] } = useQuery<ItemLocation[]>({
    queryKey: ['item-locations', itemId],
    queryFn: () => api.getItemLocations(itemId),
    enabled: !!itemId,
  })

  const { data: allLocations = [] } = useQuery({ queryKey: ['locations'], queryFn: api.getLocations })

  const { data: transferHistory = [], isFetching: histLoading } = useQuery<StockTransfer[]>({
    queryKey: ['transfers', itemId],
    queryFn: () => itemId ? api.getItemTransfers(itemId) : api.getTransfers(),
    enabled: true,
  })

  const selectedItem = items.find(i => i.id === itemId) ?? null

  const sourceLocation = itemLocs.find(il => il.location_id === fromLocationId)
  const maxQty = sourceLocation?.quantity ?? 0

  const destLocations = allLocations.filter(l => l.id !== fromLocationId)

  const toLocationId = watch('to_location_id')
  const toLocObj = allLocations.find(l => l.id === toLocationId)
  const fromLocObj = allLocations.find(l => l.id === fromLocationId)

  const mutation = useMutation({
    mutationFn: (data: TransferFormData) => api.createTransfer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      qc.invalidateQueries({ queryKey: ['item-locations', itemId] })
      qc.invalidateQueries({ queryKey: ['transfers', itemId] })
      reset({ item_id: itemId, from_location_id: '', to_location_id: '', quantity: 1, notes: '' })
      toast.success('Stock transferred successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSubmit = (data: TransferFormData) => {
    mutation.mutate({ ...data, item_id: itemId })
  }

  const handleItemChange = (id: string) => {
    setItemId(id)
    reset({ item_id: id, from_location_id: '', to_location_id: '', quantity: 1, notes: '' })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

      {/* ── Transfer form ── */}
      <div className="lg:col-span-2 card p-6 space-y-5 h-fit">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Transfer Stock</h2>

        {/* Item selector */}
        <div>
          <label className="label">Item *</label>
          <select
            className="input"
            value={itemId}
            onChange={e => handleItemChange(e.target.value)}
          >
            <option value="">— Select an item —</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}  ·  {item.sku}  ·  qty: {item.quantity}
              </option>
            ))}
          </select>
        </div>

        {/* Location breakdown */}
        {selectedItem && itemLocs.length > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Stock by location</p>
            {itemLocs.map(il => (
              <div key={il.id} className="flex items-center justify-between text-sm">
                <span className="text-blue-800">{locLabel(il.zone, il.aisle, il.bin)}</span>
                <span className="font-bold text-blue-900">{il.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {selectedItem && itemLocs.length === 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
            No location data for this item. Assign it to a location first.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* From location */}
          <div>
            <label className="label">From Location *</label>
            <select
              className="input"
              disabled={!itemId || itemLocs.length === 0}
              {...register('from_location_id', { required: 'Source location is required' })}
              onChange={e => {
                setValue('from_location_id', e.target.value)
                setValue('to_location_id', '')
                setValue('quantity', 1)
              }}
            >
              <option value="">— Select source location —</option>
              {itemLocs.map(il => (
                <option key={il.location_id} value={il.location_id}>
                  {locLabel(il.zone, il.aisle, il.bin)}  (qty: {il.quantity})
                </option>
              ))}
            </select>
            {errors.from_location_id && (
              <p className="mt-1 text-xs text-red-600">{errors.from_location_id.message}</p>
            )}
          </div>

          {/* To location */}
          <div>
            <label className="label">To Location *</label>
            <select
              className="input"
              disabled={!fromLocationId}
              {...register('to_location_id', { required: 'Destination location is required' })}
            >
              <option value="">— Select destination —</option>
              {destLocations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {locLabel(loc.zone, loc.aisle, loc.bin)}
                </option>
              ))}
            </select>
            {errors.to_location_id && (
              <p className="mt-1 text-xs text-red-600">{errors.to_location_id.message}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="label">
              Quantity * {fromLocationId && <span className="text-gray-400 font-normal">(max: {maxQty})</span>}
            </label>
            <input
              type="number"
              min={1}
              max={maxQty || undefined}
              className="input text-lg font-semibold"
              disabled={!fromLocationId}
              {...register('quantity', {
                valueAsNumber: true,
                required: 'Quantity is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: maxQty > 0 ? { value: maxQty, message: `Max available: ${maxQty}` } : undefined,
              })}
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
            )}
          </div>

          {/* Transfer preview */}
          {fromLocationId && toLocationId && Number(transferQty) > 0 && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Preview</p>
              <p className="text-indigo-900 font-medium">
                Moving <span className="font-bold">{transferQty}</span> unit{Number(transferQty) !== 1 ? 's' : ''}
              </p>
              <p className="text-indigo-700 mt-0.5">
                {locLabel(fromLocObj?.zone, fromLocObj?.aisle, fromLocObj?.bin)}
                {' → '}
                {locLabel(toLocObj?.zone, toLocObj?.aisle, toLocObj?.bin)}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <input
              className="input"
              placeholder="Reason for transfer, reference…"
              {...register('notes')}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center py-3"
            disabled={!itemId || !fromLocationId || mutation.isPending}
          >
            {mutation.isPending ? 'Transferring…' : '⇄ Transfer Stock'}
          </button>
        </form>
      </div>

      {/* ── Transfer history ── */}
      <div className="lg:col-span-3 card overflow-hidden h-fit">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {selectedItem ? `Transfer History — ${selectedItem.name}` : 'Recent Transfers'}
          </h2>
          {histLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
          )}
        </div>
        {transferHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-gray-400">
            <span className="text-4xl">⇄</span>
            <p className="text-sm">No transfers yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {transferHistory.map(tx => (
              <div key={tx.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="mt-0.5 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                  ⇄
                </div>
                <div className="flex-1 min-w-0">
                  {!selectedItem && tx.item_name && (
                    <p className="text-sm font-semibold text-gray-800 truncate">{tx.item_name}</p>
                  )}
                  <p className="text-sm text-gray-700">
                    {locLabel(tx.from_zone, tx.from_aisle, tx.from_bin)}
                    <span className="mx-1 text-gray-400">→</span>
                    {locLabel(tx.to_zone, tx.to_aisle, tx.to_bin)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
                  {tx.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.notes}</p>}
                </div>
                <span className="text-lg font-bold text-indigo-700 flex-shrink-0">{tx.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Adjustments page (with tabs)
// ─────────────────────────────────────────────────────────────────────────────
export default function AdjustmentsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'transaction' | 'transfer'>('transaction')
  const [selectedId, setSelectedId] = useState('')

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: api.getItems })
  const selectedItem = items.find(i => i.id === selectedId) ?? null

  const { data: history = [], isFetching: historyLoading } = useQuery({
    queryKey: ['transactions', selectedId],
    queryFn: () => api.getTransactions(selectedId),
    enabled: !!selectedId,
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TransactionFormData>({
    defaultValues: { type: 'IN', quantity_delta: 1, notes: '', job_number: null },
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
      reset({ type: txType, quantity_delta: 1, notes: '', job_number: null })
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
        <p className="text-sm text-gray-500">Record stock changes or transfer stock between locations</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('transaction')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'transaction'
              ? 'bg-white border border-gray-200 border-b-white -mb-px text-primary-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Record Transaction
        </button>
        <button
          onClick={() => setTab('transfer')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'transfer'
              ? 'bg-white border border-gray-200 border-b-white -mb-px text-primary-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⇄ Transfer Stock
        </button>
      </div>

      {tab === 'transfer' ? (
        <TransferTab />
      ) : (

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

            {/* Job Number */}
            <div>
              <label className="label">Job Number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input"
                placeholder="e.g. JOB-2024-001"
                {...register('job_number')}
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
                      {tx.job_number && <p className="text-xs text-indigo-600 mt-0.5 font-medium">Job: {tx.job_number}</p>}
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
    )}
  </div>
  )
}
