import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import LocationModal from '../components/LocationModal'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Location, LocationFormData } from '../types'

export default function LocationsPage() {
  const qc = useQueryClient()
  const { data: locations = [], isLoading } = useQuery({ queryKey: ['locations'], queryFn: api.getLocations })
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: api.getItems })

  const [modal, setModal]           = useState(false)
  const [editLoc, setEditLoc]       = useState<Location | null>(null)
  const [deleteLoc, setDeleteLoc]   = useState<Location | null>(null)

  const locItemCount = (locId: string) => items.filter(i => i.location_id === locId).length

  const createM = useMutation({
    mutationFn: (d: LocationFormData) => api.createLocation(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setModal(false); toast.success('Location created') },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateM = useMutation({
    mutationFn: ({ id, d }: { id: string; d: LocationFormData }) => api.updateLocation(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setEditLoc(null); toast.success('Location updated') },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteM = useMutation({
    mutationFn: (id: string) => api.deleteLocation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); qc.invalidateQueries({ queryKey: ['items'] }); setDeleteLoc(null); toast.success('Location deleted') },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500">{locations.length} locations</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Add Location</button>
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
                <th className="table-th">Zone</th>
                <th className="table-th">Aisle</th>
                <th className="table-th">Bin</th>
                <th className="table-th text-right">Items</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {locations.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">No locations yet</td></tr>
              ) : locations.map(loc => (
                <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td font-medium">{loc.zone}</td>
                  <td className="table-td text-gray-500">{loc.aisle ?? '—'}</td>
                  <td className="table-td text-gray-500">{loc.bin ?? '—'}</td>
                  <td className="table-td text-right">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {locItemCount(loc.id)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditLoc(loc)} className="btn-ghost btn-sm rounded-lg" title="Edit">✎</button>
                      <button onClick={() => setDeleteLoc(loc)} className="btn-ghost btn-sm rounded-lg text-red-500 hover:bg-red-50" title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <LocationModal open={modal}    onClose={() => setModal(false)}   onSubmit={async d => { await createM.mutateAsync(d) }} loading={createM.isPending} />
      <LocationModal open={!!editLoc} onClose={() => setEditLoc(null)} onSubmit={async d => { if (editLoc) await updateM.mutateAsync({ id: editLoc.id, d }) }} location={editLoc} loading={updateM.isPending} />
      <ConfirmDialog
        open={!!deleteLoc}
        onClose={() => setDeleteLoc(null)}
        onConfirm={async () => { if (deleteLoc) await deleteM.mutateAsync(deleteLoc.id) }}
        message={`Delete location "${deleteLoc?.zone}"? Items here will become unlocated.`}
        loading={deleteM.isPending}
      />
    </div>
  )
}
