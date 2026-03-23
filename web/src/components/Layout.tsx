import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const NAV = [
  { to: '/',                label: 'Dashboard',       icon: '◼' },
  { to: '/items',           label: 'Inventory',       icon: '📦' },
  { to: '/adjustments',     label: 'Adjustments',     icon: '⇅'  },
  { to: '/categories',      label: 'Categories',      icon: '🏷️' },
  { to: '/locations',       label: 'Locations',       icon: '📍' },
  { to: '/suppliers',       label: 'Suppliers',       icon: '🏢' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: '🛒' },
  { to: '/reports',         label: 'Reports',         icon: '📄' },
  { to: '/settings',        label: 'Settings',        icon: '⚙️' },
]

export default function Layout() {
  const { data: lowStock = [] } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.getLowStock(),
    refetchInterval: 60_000,
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-primary-900 text-white shadow-xl flex-shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-800">
          <span className="text-2xl">📦</span>
          <div>
            <div className="text-sm font-bold tracking-wide">Inventory</div>
            <div className="text-xs text-primary-300">Manager</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-primary-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
              {label === 'Inventory' && lowStock.length > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {lowStock.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-primary-800">
          <p className="text-xs text-primary-400">Local Inventory System</p>
          <p className="text-xs text-primary-500 mt-0.5">v1.0.0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
