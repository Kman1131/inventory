import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export default function ReplenishmentPage() {
  const [locationId, setLocationId] = useState<string>('')
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: api.getLocations })

  function locLabel(zone?: string | null, aisle?: string | null, bin?: string | null) {
    return [zone, aisle, bin].filter(Boolean).join(' › ') || '—'
  }

  const reportUrl = api.getReplenishmentUrl(locationId || undefined)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Replenishment</h1>
        <p className="text-sm text-gray-500">
          View items that need stock transferred from their primary location to secondary locations
        </p>
      </div>

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
          <strong>How it works:</strong> Each location can have a minimum quantity per item (set via item
          locations). When a location's stock falls below that minimum, it appears here — recommend
          transferring from the primary location to restock it.
        </div>
      </div>

      {/* Inline preview iframe */}
      <div className="card overflow-hidden" style={{ height: '70vh' }}>
        <iframe
          src={reportUrl}
          title="Replenishment Report"
          className="w-full h-full border-0"
          key={reportUrl}
        />
      </div>
    </div>
  )
}
