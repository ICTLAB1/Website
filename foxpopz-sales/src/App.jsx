import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/Login'
import RepShell from './components/RepShell'
import AdminShell from './components/AdminShell'

import RepHome from './pages/rep/RepHome'
import Shopkeepers from './pages/rep/Shopkeepers'
import ShopkeeperDetail from './pages/rep/ShopkeeperDetail'
import NewShopkeeper from './pages/rep/NewShopkeeper'
import NewOrder from './pages/rep/NewOrder'
import Orders from './pages/rep/Orders'
import DeliverOrder from './pages/rep/DeliverOrder'
import RecordPayment from './pages/rep/RecordPayment'
import Ledger from './pages/rep/Ledger'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminReps from './pages/admin/AdminReps'
import AdminShopkeepers from './pages/admin/AdminShopkeepers'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminPayments from './pages/admin/AdminPayments'
import AdminReports from './pages/admin/AdminReports'

function Gate({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  const { role, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (role === 'admin' || role === 'manager') return <Navigate to="/admin" replace />
  return <Navigate to="/rep" replace />
}

function FullScreenLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-[var(--color-brand)] font-semibold tracking-wide">Loading…</div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Gate><RoleRedirect /></Gate>} />

      <Route path="/rep" element={<Gate><RepShell /></Gate>}>
        <Route index element={<RepHome />} />
        <Route path="orders" element={<Orders />} />
        <Route path="deliver/:id" element={<DeliverOrder />} />
        <Route path="shopkeepers" element={<Shopkeepers />} />
        <Route path="shopkeepers/new" element={<NewShopkeeper />} />
        <Route path="shopkeepers/:id" element={<ShopkeeperDetail />} />
        <Route path="new-order" element={<NewOrder />} />
        <Route path="record-payment" element={<RecordPayment />} />
        <Route path="ledger" element={<Ledger />} />
      </Route>

      <Route path="/admin" element={<Gate><AdminShell /></Gate>}>
        <Route index element={<AdminDashboard />} />
        <Route path="reps" element={<AdminReps />} />
        <Route path="shopkeepers" element={<AdminShopkeepers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
