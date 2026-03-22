import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { api } from '../api/client'
import StatCard from '../components/StatCard'

export default function DashboardPage() {
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: api.getItems,
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-900 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Loading inventory…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-base font-semibold text-red-700">Cannot reach server</p>
        <p className="mt-1 text-sm text-red-500">{(error as Error).message}</p>
        <p className="mt-3 text-xs text-gray-500">
          Check the URL and API key in{' '}
          <Link to="/settings" className="underline text-primary-700">Settings</Link>.
        </p>
      </div>
    )
  }

  const lowStockItems = items.filter(i => i.quantity < i.min_threshold)
  const totalValue    = items.reduce((s, i) => s + i.quantity * i.price, 0)

  // Chart data: stock value per category
  const catMap = new Map<string, number>()
  items.forEach(item => {
    const name = item.category_name ?? 'Uncategorised'
    catMap.set(name, (catMap.get(name) ?? 0) + item.quantity * item.price)
  })
  const chartData = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your inventory</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Items"     value={items.length}        icon="📦" />
        <StatCard
          title="Low Stock"
          value={lowStockItems.length}
          icon="⚠️"
          color={lowStockItems.length > 0 ? 'red' : 'green'}
          subtitle={lowStockItems.length > 0 ? 'Need restocking' : 'All stocked'}
        />
        <StatCard
          title="Inventory Value"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="💰"
          color="green"
        />
        <StatCard title="Categories" value={categories.length} icon="🏷️" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Value by Category</h2>
          {chartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Value']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? '#3f51b5' : '#7986cb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low stock panel */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Low Stock Alerts</h2>
            {lowStockItems.length > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {lowStockItems.length}
              </span>
            )}
          </div>

          {lowStockItems.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              ✓  All items are well stocked
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {lowStockItems.map(item => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sku} · {item.category_name ?? '—'}</p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-base font-bold text-red-600">{item.quantity}</p>
                    <p className="text-xs text-gray-400">min {item.min_threshold}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {lowStockItems.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <Link to="/items" className="text-xs font-medium text-primary-700 hover:underline">
                View all items →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Items */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">All Items Summary</h2>
          <Link to="/items" className="text-xs font-medium text-primary-700 hover:underline">
            Manage inventory →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">SKU</th>
                <th className="table-th">Name</th>
                <th className="table-th">Category</th>
                <th className="table-th">Qty</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.slice(0, 10).map(item => {
                const isLow = item.quantity < item.min_threshold
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-mono text-xs">{item.sku}</td>
                    <td className="table-td font-medium">{item.name}</td>
                    <td className="table-td text-gray-500">{item.category_name ?? '—'}</td>
                    <td className="table-td">
                      <span className={`font-bold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={isLow ? 'badge-low' : 'badge-ok'}>
                        {isLow ? 'LOW' : 'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {items.length > 10 && (
            <div className="border-t border-gray-100 px-4 py-3 text-center">
              <Link to="/items" className="text-xs font-medium text-primary-700 hover:underline">
                +{items.length - 10} more items →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
