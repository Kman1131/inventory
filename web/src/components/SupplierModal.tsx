import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from './Modal'
import type { Supplier, SupplierFormData } from '../types'

interface SupplierModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: SupplierFormData) => Promise<void>
  supplier?: Supplier | null
  loading?: boolean
}

export default function SupplierModal({ open, onClose, onSubmit, supplier, loading }: SupplierModalProps) {
  const isEdit = !!supplier

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>({
    defaultValues: { name: '', contact_name: '', email: '', phone: '', address: '', notes: '' },
  })

  useEffect(() => {
    if (open) {
      reset(supplier
        ? {
            name: supplier.name,
            contact_name: supplier.contact_name ?? '',
            email: supplier.email ?? '',
            phone: supplier.phone ?? '',
            address: supplier.address ?? '',
            notes: supplier.notes ?? '',
          }
        : { name: '', contact_name: '', email: '', phone: '', address: '', notes: '' }
      )
    }
  }, [open, supplier, reset])

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Supplier' : 'Add Supplier'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Company Name *</label>
          <input
            className="input"
            placeholder="Supplier Co."
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contact Name</label>
            <input className="input" placeholder="Jane Smith" {...register('contact_name')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+1 555 0100" {...register('phone')} />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="orders@supplier.com"
            {...register('email')}
          />
        </div>

        <div>
          <label className="label">Address</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="123 Warehouse St, City, State"
            {...register('address')}
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Payment terms, lead times…"
            {...register('notes')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
