import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ItemsPage from './pages/ItemsPage'
import CategoriesPage from './pages/CategoriesPage'
import LocationsPage from './pages/LocationsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AdjustmentsPage from './pages/AdjustmentsPage'
import SuppliersPage from './pages/SuppliersPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import ReplenishmentPage from './pages/ReplenishmentPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="adjustments" element={<AdjustmentsPage />} />
          <Route path="replenishment" element={<ReplenishmentPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
