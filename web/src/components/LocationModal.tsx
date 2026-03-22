import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from './Modal'
import type { Location, LocationFormData } from '../types'

interface LocationModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: LocationFormData) => Promise<void>
  location?: Location | null
  loading?: boolean
}

export default function LocationModal({ open, onClose, onSubmit, location, loading }: LocationModalProps) {
  const isEdit = !!location
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LocationFormData>({
    defaultValues: { zone: '', aisle: '', bin: '' },
  })

  useEffect(() => {
    if (open) reset({ zone: location?.zone ?? '', aisle: location?.aisle ?? '', bin: location?.bin ?? '' })
  }, [open, location, reset])

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Location' : 'Add Location'} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Zone *</label>
          <input
            className="input"
            placeholder="e.g. Warehouse A"
            {...register('zone', { required: 'Zone is required' })}
          />
          {errors.zone && <p className="mt-1 text-xs text-red-600">{errors.zone.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Aisle</label>
            <input className="input" placeholder="e.g. A3" {...register('aisle')} />
          </div>
          <div>
            <label className="label">Bin</label>
            <input className="input" placeholder="e.g. Shelf 2" {...register('bin')} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Location'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
