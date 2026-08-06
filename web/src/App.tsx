import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { queryClient } from './queryClient'
import { theme } from './theme'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import InvoicesPage from './pages/InvoicesPage'
import CustomersPage from './pages/CustomersPage'
import CategoriesPage from './pages/CategoriesPage'
import MaterialsPage from './pages/MaterialsPage'
import BackboardsPage from './pages/BackboardsPage'
import SubBackboardsPage from './pages/SubBackboardsPage'
import FramesPage from './pages/FramesPage'
import InventoryTransactionsPage from './pages/InventoryTransactionsPage'
import SettingsPage from './pages/SettingsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import StubPage from './pages/StubPage'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            {/* Entry Screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin/Staff App Shell & Protected Routes */}
            <Route element={<AppShell />}>
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

              {/* Administration Group (Admin Only) */}
              <Route path="/pricing" element={<StubPage title="Định giá & Công thức" subtitle="Cấu hình công thức tính giá tự động" />} />
              <Route path="/reports" element={<StubPage title="Báo cáo Doanh thu & Tồn kho" subtitle="Báo cáo tổng hợp tình hình kinh doanh" />} />
              <Route path="/accounts" element={<StubPage title="Quản lý Tài khoản" subtitle="Danh sách tài khoản nhân viên & phân quyền" />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit" element={<AuditLogsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
