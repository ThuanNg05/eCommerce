import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { queryClient } from './queryClient'
import { theme } from './theme'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
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

            {/* Admin App Shell & Protected Routes */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<StubPage title="Quản lý Danh mục" subtitle="Danh sách danh mục sản phẩm khung tranh" />} />
              <Route path="/frames" element={<StubPage title="Quản lý Khung tranh" subtitle="Danh mục các mẫu khung gỗ, nhôm, nhựa" />} />
              <Route path="/backboards" element={<StubPage title="Quản lý Tấm lưng" subtitle="Quản lý thông số tấm ván MDF/Alu lưng khung" />} />
              <Route path="/sub-backboards" element={<StubPage title="Quản lý Tấm lưng phụ" subtitle="Quản lý vật liệu nẹp & lót phụ" />} />
              <Route path="/materials" element={<StubPage title="Quản lý Vật liệu" subtitle="Vật tư kính, bo, keo, phụ kiện làm khung" />} />
              <Route path="/inventory" element={<StubPage title="Kho (Nhập / Xuất)" subtitle="Phiếu nhập kho, xuất kho và kiểm kê" />} />
              <Route path="/customers" element={<StubPage title="Quản lý Khách hàng" subtitle="Danh sách khách hàng bán lẻ và đại lý" />} />
              <Route path="/invoices" element={<StubPage title="Quản lý Hóa đơn" subtitle="Danh sách hóa đơn đơn hàng khung tranh" />} />
              <Route path="/pricing" element={<StubPage title="Định giá & Công thức" subtitle="Cấu hình công thức tính giá tự động" />} />
              <Route path="/reports" element={<StubPage title="Báo cáo Doanh thu & Tồn kho" subtitle="Báo cáo tổng hợp tình hình kinh doanh" />} />
              <Route path="/accounts" element={<StubPage title="Quản lý Tài khoản" subtitle="Danh sách tài khoản nhân viên & phân quyền" />} />
              <Route path="/settings" element={<StubPage title="Cấu hình Hệ thống" subtitle="Cấu hình Email thông báo & tham số chung" />} />
              <Route path="/audit" element={<StubPage title="Nhật ký Thay đổi" subtitle="Lịch sử thao tác & nhật ký hoạt động" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
