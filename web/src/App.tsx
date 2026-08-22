import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { queryClient } from './queryClient'
import { theme } from './theme'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/LoginPage'
import PublicInvoiceLookupPage from './pages/PublicInvoiceLookupPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import InvoicesPage from './pages/InvoicesPage'
import WooCommerceOrdersPage from './pages/WooCommerceOrdersPage'
import CustomersPage from './pages/CustomersPage'
import CategoriesPage from './pages/CategoriesPage'
import MaterialsPage from './pages/MaterialsPage'
import BackboardsPage from './pages/BackboardsPage'
import SubBackboardsPage from './pages/SubBackboardsPage'
import FramesPage from './pages/FramesPage'
import InventoryTransactionsPage from './pages/InventoryTransactionsPage'
import PricingPage from './pages/PricingPage'
import ReportsPage from './pages/ReportsPage'
import AccountsPage from './pages/AccountsPage'
import SettingsPage from './pages/SettingsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import AppErrorBoundary from './components/AppErrorBoundary'
import NetworkStatusBanner from './components/NetworkStatusBanner'

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NetworkStatusBanner />
          <AuthProvider>
            <BrowserRouter>
            <Routes>
              {/* Entry Screen */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/tra-cuu-hoa-don" element={<PublicInvoiceLookupPage />} />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected App Shell & Nav Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Category Group */}
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/frames" element={<FramesPage />} />
                <Route path="/backboards" element={<BackboardsPage />} />
                <Route path="/sub-backboards" element={<SubBackboardsPage />} />
                <Route path="/materials" element={<MaterialsPage />} />

                {/* Operations Group */}
                <Route path="/inventory" element={<InventoryTransactionsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/woocommerce-orders" element={<WooCommerceOrdersPage />} />

                {/* Administration Group (Admin Only) */}
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/audit" element={<AuditLogsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
