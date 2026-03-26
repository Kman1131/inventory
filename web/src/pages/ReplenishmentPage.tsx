import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import type { ItemLocation } from '../types'

function locLabel(zone?: string | null, aisle?: string | null, bin?: string | null) {
  return [zone, aisle, bin].filter(Boolean).join(' › ') || '—'
}

function MinQtyCell({ il }: { il: ItemLocation }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(il.min_qty ?? 0))

  const mut = useMutation({
    mutationFn: (min_qty: number) =>
      api.updateItemLocation(il.item_id, { location_id: il.location_id, quantity: il.quantity, min_qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-item-locations'] })
      qc.invalidateQueries({ queryKey: ['item-locations', il.item_id] })
      setEditing(false)
      toast.success('Min qty updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={e => { e.preventDefault(); mut.mutate(parseInt(draft) || 0) }}
      >
        <input
          type="number"
          min={0}
          className="w-16 text-xs border border-blue-400 rounded px-1 py-0.5 text-center"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoFocus
        />
        <button type="submit" className="text-xs text-blue-600 font-semibold px-1" disabled={mut.isPending}>✓</button>
        <button type="button" className="text-xs text-gray-400 px-1" onClick={() => { setEditing(false); setDraft(String(il.min_qty ?? 0)) }}>✕</button>
      </form>
    )
  }
  return (
    <button
      className={`text-xs underline underline-offset-2 ${(il.min_qty ?? 0) === 0 ? 'text-gray-400 hover:text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
      onClick={() => { setDraft(String(il.min_qty ?? 0)); setEditing(true) }}
      title="Click to edit"
    >
      {il.min_qty ?? 0}
    </button>
  )
}

export default function ReplenishmentPage() {
  const [tab, setTab] = useState<'report' | 'configure'>('report')
  const [locationId, setLocationId] = useState<string>('')

  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: api.getLocations })
  const { data: allItemLocs = [], isLoading: configLoading } = useQuery({
    queryKey: ['all-item-locations'],
    queryFn: api.getAllItemLocations,
    enabled: tab === 'configure',
  })

  const reportUrl = api.getReplenishmentUrl(locationId || undefined)

  // Group by item for configure view
  const byItem = allItemLocs.reduce<Record<string, ItemLocation[]>>((acc, il) => {
    if (!acc[il.item_id]) acc[il.item_id] = []
    acc[il.item_id].push(il)
    return acc
  }, {})

  const alertCount = allItemLocs.filter(il => (il.min_qty ?? 0) > 0 && il.quantity < (il.min_qty ?? 0)).length

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Replenishment</h1>
          <p className="text-sm text-gray-500">
            Monitor stock levels and configure minimums per location
          </p>
        </div>
        {alertCount > 0 && (
          <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-sm font-semibold">
            ⚠ {alertCount} location{alertCount !== 1 ? 's' : ''} need restocking
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('report')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'report'
              ? 'bg-white border border-gray-200 border-b-white -mb-px text-primary-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Replenishment Report
        </button>
        <button
          onClick={() => setTab('configure')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === 'configure'
              ? 'bg-white border border-gray-200 border-b-white -mb-px text-primary-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚙ Configure Min Quantities
        </button>
      </div>

      {tab === 'report' ? (
        <>
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="label">Filter by Location</label>
                <select
                  className="input"
                  value={locationId}
                  onChange={e => setLocationId(e.target.value)}
                >
                  <option value="">— All locations —</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {locLabel(loc.zone, loc.aisle, loc.bin)}
                    </option>
                  ))}
                </select>
              </div>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-2.5 px-5 no-underline whitespace-nowrap"
              >
                🖨 Open Printable Report
              </a>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
              <strong>How it works:</strong> Set a minimum quantity per item per location using the{' '}
              <button onClick={() => setTab('configure')} className="underline font-semibold">
                Configure tab
              </button>
              . When stock at a location falls below its minimum, it appears here as a transfer instruction.
            </div>
          </div>
          <div className="card overflow-hidden" style={{ height: '70vh' }}>
            <iframe
              src={reportUrl}
              title="Replenishment Report"
              className="w-full h-full border-0"
              key={reportUrl}
            />
          </div>
        </>
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Min Quantities by Item &amp; Location
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any value in the <strong>Min Qty</strong> column to edit it.
              When stock drops below the minimum, the item appears in the Replenishment Report.
            </p>
          </div>

          {configLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
            </div>
          ) : allItemLocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-gray-400">
              <span className="text-4xl">📍</span>
              <p className="text-sm">No item locations configured yet.</p>
              <p className="text-xs">Assign stock to locations via the Inventory page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Qty</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Qty</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(byItem).map(([, locs]) =>
                    locs.map((il, idx) => {
                      const needsReplen = (il.min_qty ?? 0) > 0 && il.quantity < (il.min_qty ?? 0)
                      const notConfigured = (il.min_qty ?? 0) === 0
                      return (
                        <tr key={il.id} className="hover:bg-gray-50 transition-colors">
                          {idx === 0 ? (
                            <td className="px-5 py-3 align-top" rowSpan={locs.length}>
                              <div className="font-medium text-gray-900">{il.item_name}</div>
                              <div className="text-xs font-mono text-gray-400">{il.item_sku}</div>
                            </td>
                          ) : null}
                          <td className="px-5 py-3 text-gray-600">
                            📍 {locLabel(il.zone, il.aisle, il.bin)}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-900">{il.quantity}</td>
                          <td className="px-5 py-3 text-right">
                            <MinQtyCell il={il} />
                          </td>
                          <td className="px-5 py-3 text-center">
                            {notConfigured ? (
                              <span className="text-xs text-gray-400">— not set</span>
                            ) : needsReplen ? (
                              <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">
                                ⚠ Low
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                                ✓ OK
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

