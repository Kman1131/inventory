import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/client'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: api.getItems })
  const lowStock = items.filter(i => i.quantity < i.min_threshold)
  const totalValue = items.reduce((s, i) => s + i.quantity * i.price, 0)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const url = api.getReportUrl()
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server returned ${res.status}`)
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `stock-report-${new Date().toISOString().slice(0, 10)}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Report downloaded')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    setLoading(true)
    try {
      const url = api.getReportUrl()
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const win = window.open(blobUrl)
      if (win) {
        win.onload = () => { win.print(); URL.revokeObjectURL(blobUrl) }
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and download stock reports</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Items</p>
        </div>
        <div className={`card p-4 text-center ${lowStock.length > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStock.length}</p>
          <p className="text-xs text-gray-500 mt-1">Low Stock</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-700">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">Total Value</p>
        </div>
      </div>

      {/* Report card */}
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Stock Report (PDF)</h2>
          <p className="mt-1 text-sm text-gray-500">
            A full inventory report with every item's SKU, name, category, current quantity, and stock status.
            Low-stock items are highlighted in red. Generated live from the database.
          </p>
        </div>

        {/* Preview mockup */}
        <div className="rounded-xl border border-gray-200 overflow-hidden font-mono text-xs">
          <div className="bg-primary-900 text-white px-4 py-2 text-center font-bold tracking-widest text-xs">
            INVENTORY STOCK REPORT
          </div>
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 font-semibold text-gray-500 uppercase text-xs tracking-wide">
              <span>SKU</span><span>Name</span><span>Qty</span><span>Status</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-2 bg-red-50 text-red-700">
              <span>EX-001</span><span>Sample A</span><span>2</span><span className="font-bold">LOW ⚠</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-2">
              <span>EX-002</span><span>Sample B</span><span>47</span><span className="text-green-700 font-bold">OK</span>
            </div>
            <div className="px-4 py-2 text-gray-400 text-right">Page 1 of 1</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="btn-primary flex-1"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? <><span className="animate-spin inline-block mr-2">⟳</span>Generating…</> : '⬇ Download PDF'}
          </button>
          <button
            className="btn-secondary"
            onClick={handlePrint}
            disabled={loading}
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* Low stock preview */}
      {lowStock.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 flex items-center gap-2">
            <span className="text-red-600 font-semibold text-sm">⚠ Items to Restock ({lowStock.length})</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th">SKU</th>
                <th className="table-th">Name</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th text-right">Min</th>
                <th className="table-th text-right">Deficit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lowStock.map(item => (
                <tr key={item.id} className="hover:bg-red-50/40">
                  <td className="table-td font-mono text-xs">{item.sku}</td>
                  <td className="table-td font-medium">{item.name}</td>
                  <td className="table-td text-right font-bold text-red-600">{item.quantity}</td>
                  <td className="table-td text-right text-gray-500">{item.min_threshold}</td>
                  <td className="table-td text-right font-bold text-red-700">
                    −{item.min_threshold - item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
