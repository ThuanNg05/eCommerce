import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  MenuItem,
  IconButton,
  Tooltip,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Snackbar,
  CircularProgress,
} from '@mui/material'
import {
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  PackageCheck,
  X,
  Store,
  User,
  MapPin,
  FileCheck2,
} from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchWooCommerceOrders,
  fetchWooCommerceOrderById,
  syncWooCommerceOrders,
  confirmWooCommerceOrder,
  type WooCommerceOrderDto,
  type WooCommerceOrderLineDto,
} from '../api/woocommerce'
import { fetchCustomers, type CustomerDto } from '../api/customers'
import { useAuth } from '../auth/AuthContext'
import { AG_GRID_LOCALE_VI } from '../utils/agGridLocale'
import { autoSizeGridColumns, AG_GRID_AUTO_SIZE_STRATEGY } from '../utils/agGridAutoSize'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value?: string | Date | number | null, fallback = 'Chưa cung cấp'): string {
  if (value == null || value === '') return fallback
  try {
    const date = typeof value === 'object' && value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) return fallback
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return fallback
  }
}

// Availability badge mapping
export function renderAvailabilityBadge(availability: string, label?: string) {
  switch (availability) {
    case 'ready':
      return (
        <Chip
          icon={<CheckCircle2 size={13} color="#15803d" />}
          label={label || 'Đủ tồn kho'}
          size="small"
          sx={{
            bgcolor: '#f0fdf4',
            color: '#15803d',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: '4px',
            height: 24,
            whiteSpace: 'nowrap',
            '& .MuiChip-icon': { ml: 0.5 },
          }}
        />
      )
    case 'insufficient_stock':
    case 'insufficient':
      return (
        <Chip
          icon={<XCircle size={13} color="#b91c1c" />}
          label={label || 'Không đủ tồn kho'}
          size="small"
          sx={{
            bgcolor: '#fef2f2',
            color: '#b91c1c',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: '4px',
            height: 24,
            whiteSpace: 'nowrap',
            '& .MuiChip-icon': { ml: 0.5 },
          }}
        />
      )
    case 'unmapped':
      return (
        <Chip
          icon={<AlertTriangle size={13} color="#b45309" />}
          label={label || 'Chưa liên kết kho'}
          size="small"
          sx={{
            bgcolor: '#fffbeb',
            color: '#b45309',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: '4px',
            height: 24,
            whiteSpace: 'nowrap',
            '& .MuiChip-icon': { ml: 0.5 },
          }}
        />
      )
    case 'not_eligible':
    default:
      return (
        <Chip
          icon={<Clock size={13} color="#737373" />}
          label={label || 'Chưa đủ điều kiện'}
          size="small"
          sx={{
            bgcolor: '#f2f2f2',
            color: '#737373',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: '4px',
            height: 24,
            whiteSpace: 'nowrap',
            '& .MuiChip-icon': { ml: 0.5 },
          }}
        />
      )
  }
}

// WooCommerce Order Status Badge
function renderOrderStatusBadge(status: string) {
  const s = status.toLowerCase()
  let bgcolor = '#f2f2f2'
  let color = '#737373'
  let label = status

  switch (s) {
    case 'processing':
      bgcolor = '#eff6ff'
      color = '#1d4ed8'
      label = 'Đang xử lý'
      break
    case 'completed':
      bgcolor = '#f0fdf4'
      color = '#15803d'
      label = 'Hoàn thành'
      break
    case 'on-hold':
      bgcolor = '#fffbeb'
      color = '#b45309'
      label = 'Tạm giữ'
      break
    case 'pending':
      bgcolor = '#f2f2f2'
      color = '#737373'
      label = 'Chờ thanh toán'
      break
    case 'cancelled':
      bgcolor = '#fef2f2'
      color = '#b91c1c'
      label = 'Đã hủy'
      break
    case 'refunded':
      bgcolor = '#fef2f2'
      color = '#b91c1c'
      label = 'Đã hoàn tiền'
      break
    case 'failed':
      bgcolor = '#fef2f2'
      color = '#b91c1c'
      label = 'Thất bại'
      break
  }

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor,
        color,
        fontSize: 11,
        fontWeight: 500,
        borderRadius: '4px',
        height: 22,
        whiteSpace: 'nowrap',
      }}
    />
  )
}

function getAvailabilityAlertContent(availability: string) {
  switch (availability) {
    case 'ready':
      return {
        title: 'Đủ tồn kho, có thể xác nhận xuất kho.',
        desc: null,
      }
    case 'insufficient_stock':
    case 'insufficient':
      return {
        title: 'Tồn kho không đủ để xử lý đơn hàng.',
        desc: 'Vui lòng kiểm tra và nhập thêm tồn kho trước khi xuất hóa đơn.',
      }
    case 'unmapped':
      return {
        title: 'Có sản phẩm chưa được liên kết với kho.',
        desc: 'Đơn hàng chưa thể xác nhận xuất kho.',
      }
    case 'not_eligible':
    default:
      return {
        title: 'Đơn hàng chưa đủ điều kiện xuất kho.',
        desc: null,
      }
  }
}

export default function WooCommerceOrdersPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  // Filter States
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')

  // Selected Order for Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  // Confirm Fulfillment Dialog States
  const [orderToConfirm, setOrderToConfirm] = useState<WooCommerceOrderDto | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // Snackbar Notification
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'info',
  })

  // Queries
  const { data: orders = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['wooCommerceOrders', statusFilter],
    queryFn: () => fetchWooCommerceOrders(1, 200, statusFilter === 'all' ? undefined : statusFilter),
  })

  const { data: orderDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['wooCommerceOrder', selectedOrderId],
    queryFn: () => (selectedOrderId ? fetchWooCommerceOrderById(selectedOrderId) : null),
    enabled: Boolean(selectedOrderId),
  })

  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers', customerSearchTerm],
    queryFn: () => fetchCustomers(customerSearchTerm, 1, 100),
  })
  const customerOptions = customersData?.items ?? []

  // Mutations
  const syncMutation = useMutation({
    mutationFn: syncWooCommerceOrders,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['wooCommerceOrders'] })
      setToast({
        open: true,
        message: `Đồng bộ hoàn tất: đã cập nhật ${res.importedOrders} đơn hàng từ WooCommerce.`,
        severity: 'success',
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        message: `Đồng bộ thất bại: ${err.message}`,
        severity: 'error',
      })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: ({ orderId, customerId }: { orderId: number; customerId: number }) =>
      confirmWooCommerceOrder(orderId, { customerId }),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['wooCommerceOrders'] })
      if (selectedOrderId === updatedOrder.wooCommerceOrderId) {
        queryClient.invalidateQueries({ queryKey: ['wooCommerceOrder', selectedOrderId] })
      }
      setOrderToConfirm(null)
      setSelectedCustomer(null)
      setConfirmError(null)
      setToast({
        open: true,
        message: `Đã xác nhận xuất kho thành công cho đơn #${updatedOrder.orderNumber}! Mã hóa đơn: ${updatedOrder.confirmedInvoiceId}`,
        severity: 'success',
      })
    },
    onError: (err: Error) => {
      setConfirmError(err.message)
    },
  })

  // Filtered rows for AG Grid
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search matching
      if (search.trim()) {
        const term = search.toLowerCase().trim()
        const matchNumber = order.orderNumber?.toLowerCase().includes(term)
        const matchCustomer = order.customerName?.toLowerCase().includes(term)
        const matchPhone = order.customerPhone?.toLowerCase().includes(term)
        const matchAddress = order.shippingAddress?.toLowerCase().includes(term)
        const matchInvoice = order.confirmedInvoiceId?.toLowerCase().includes(term)
        if (!matchNumber && !matchCustomer && !matchPhone && !matchAddress && !matchInvoice) {
          return false
        }
      }

      // Availability filter
      if (availabilityFilter !== 'all' && order.availability !== availabilityFilter) {
        return false
      }

      return true
    })
  }, [orders, search, availabilityFilter])

  // KPIs
  const stats = useMemo(() => {
    const total = orders.length
    const ready = orders.filter((o) => o.availability === 'ready' && !o.confirmedInvoiceId).length
    const insufficient = orders.filter((o) => o.availability === 'insufficient_stock' || o.availability === 'insufficient').length
    const unmapped = orders.filter((o) => o.availability === 'unmapped').length
    const confirmed = orders.filter((o) => Boolean(o.confirmedInvoiceId)).length
    return { total, ready, insufficient, unmapped, confirmed }
  }, [orders])

  // Open confirm modal with smart auto-match customer if phone matches
  const handleOpenConfirm = (order: WooCommerceOrderDto) => {
    setOrderToConfirm(order)
    setConfirmError(null)

    // Try finding matching customer by phone
    if (order.customerPhone && customerOptions.length > 0) {
      const normalizedPhone = order.customerPhone.replace(/[^0-9]/g, '')
      const match = customerOptions.find((c) => c.phone && c.phone.replace(/[^0-9]/g, '') === normalizedPhone)
      if (match) {
        setSelectedCustomer(match)
        return
      }
    }
    setSelectedCustomer(null)
  }

  // Handle Confirm Submission
  const handleConfirmSubmit = () => {
    if (!orderToConfirm) return
    if (!selectedCustomer) {
      setConfirmError('Vui lòng chọn khách hàng kho để liên kết hóa đơn.')
      return
    }
    confirmMutation.mutate({
      orderId: orderToConfirm.wooCommerceOrderId,
      customerId: selectedCustomer.id,
    })
  }

  // Column definitions for AG Grid
  const columns = useMemo<ColDef<WooCommerceOrderDto>[]>(
    () => [
      {
        field: 'orderNumber',
        headerName: 'MÃ ĐƠN',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (p: { data?: WooCommerceOrderDto }) => {
          if (!p.data) return null
          return (
            <Box
              component="button"
              type="button"
              onClick={() => setSelectedOrderId(p.data?.wooCommerceOrderId ?? null)}
              sx={{
                background: 'none',
                border: 'none',
                p: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                color: '#171717',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                height: '100%',
                '&:hover': { color: '#7299ED', textDecoration: 'underline' },
              }}
            >
              #{p.data.orderNumber}
            </Box>
          )
        },
      },
      {
        field: 'customerName',
        headerName: 'KHÁCH HÀNG',
        minWidth: 160,
        sortable: true,
        cellRenderer: (p: { data?: WooCommerceOrderDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717', fontSize: 13, lineHeight: 1.3 }}>
                {p.data.customerName || 'Khách vãng lai'}
              </Typography>
              {p.data.customerPhone && (
                <Typography variant="caption" sx={{ color: '#737373', fontSize: 11 }}>
                  {p.data.customerPhone}
                </Typography>
              )}
            </Box>
          )
        },
      },
      {
        field: 'sourceCreatedAt',
        headerName: 'NGÀY ĐẶT',
        width: 140,
        sortable: true,
        cellRenderer: (p: { value?: string | null }) => {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" sx={{ fontSize: 13, color: '#404040' }}>
                {formatDateTime(p.value, '—')}
              </Typography>
            </Box>
          )
        },
      },
      {
        field: 'total',
        headerName: 'TỔNG TIỀN',
        type: 'rightAligned',
        width: 130,
        sortable: true,
        cellRenderer: (p: { value?: number }) => {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                {formatVND(p.value)}
              </Typography>
            </Box>
          )
        },
      },
      {
        field: 'status',
        headerName: 'TRẠNG THÁI',
        width: 180,
        sortable: true,
        cellRenderer: (p: { value?: string }) => {
          if (!p.value) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              {renderOrderStatusBadge(p.value)}
            </Box>
          )
        },
      },
      {
        field: 'availability',
        headerName: 'KHẢ DỤNG XUẤT KHO',
        width: 175,
        sortable: true,
        cellRenderer: (p: { data?: WooCommerceOrderDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Tooltip title={p.data.availabilityLabel || ''} arrow placement="top">
                <span>{renderAvailabilityBadge(p.data.availability, p.data.availabilityLabel)}</span>
              </Tooltip>
            </Box>
          )
        },
      },
      {
        field: 'confirmedInvoiceId',
        headerName: 'HÓA ĐƠN KHO',
        width: 160,
        sortable: true,
        cellRenderer: (p: { data?: WooCommerceOrderDto }) => {
          if (!p.data) return null
          if (p.data.confirmedInvoiceId) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Chip
                  icon={<FileCheck2 size={13} color="#15803d" />}
                  label={p.data.confirmedInvoiceId}
                  size="small"
                  sx={{
                    bgcolor: '#f0fdf4',
                    color: '#15803d',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: '4px',
                    height: 22,
                    '& .MuiChip-icon': { ml: 0.5 },
                  }}
                />
              </Box>
            )
          }
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography variant="caption" sx={{ color: '#a3a3a3', fontSize: 12 }}>
                Chưa xuất
              </Typography>
            </Box>
          )
        },
      },
      {
        headerName: 'THAO TÁC',
        width: 140,
        minWidth: 130,
        maxWidth: 150,
        suppressAutoSize: true,
        resizable: false,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data?: WooCommerceOrderDto }) => {
          if (!p.data) return null
          const canConfirm = p.data.availability === 'ready' && !p.data.confirmedInvoiceId
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Xem chi tiết đơn hàng">
                <IconButton
                  size="small"
                  onClick={() => setSelectedOrderId(p.data?.wooCommerceOrderId ?? null)}
                  sx={{ color: '#404040', '&:hover': { bgcolor: '#f2f2f2' } }}
                >
                  <Eye size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip
                title={
                  p.data.confirmedInvoiceId
                    ? 'Đơn đã được xuất hóa đơn kho'
                    : canConfirm
                    ? 'Xác nhận tạo hóa đơn và xuất kho'
                    : p.data.availabilityLabel || 'Chưa đủ điều kiện xuất kho'
                }
              >
                <span>
                  <Button
                    size="small"
                    variant={canConfirm ? 'contained' : 'outlined'}
                    disabled={!canConfirm}
                    onClick={() => handleOpenConfirm(p.data!)}
                    startIcon={<PackageCheck size={14} />}
                    sx={{
                      height: 28,
                      fontSize: 12,
                      px: 1,
                      ...(canConfirm
                        ? {
                            bgcolor: '#1a1a1a',
                            color: '#ffffff',
                            '&:hover': { bgcolor: '#000000' },
                          }
                        : {
                            borderColor: '#ededed',
                            color: '#a3a3a3',
                          }),
                    }}
                  >
                    Xuất kho
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )
        },
      },
    ],
    [],
  )

  return (
    <Box sx={{ width: '100%' }}>
      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ borderRadius: '6px', border: '1px solid #ededed' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Action Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
              Đơn hàng WooCommerce
            </Typography>
            <Chip
              label="E-Commerce"
              size="small"
              sx={{ bgcolor: '#EEF3FD', color: '#7299ED', fontWeight: 600, fontSize: 11, height: 20 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#737373', mt: 0.5 }}>
            Quản lý đồng bộ đơn hàng từ website, đối soát tồn kho tự động và xác nhận xuất hóa đơn kho.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            startIcon={<RefreshCw size={15} />}
            disabled={isLoading}
            sx={{
              height: 36,
              borderColor: '#e0e0e0',
              color: '#171717',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
          >
            Làm mới
          </Button>

          {isAdmin && (
            <Button
              variant="contained"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              startIcon={
                syncMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Store size={16} />
              }
              sx={{
                height: 36,
                bgcolor: '#1a1a1a',
                color: '#ffffff',
                '&:hover': { bgcolor: '#000000' },
              }}
            >
              {syncMutation.isPending ? 'Đang đồng bộ...' : 'Đồng bộ từ WooCommerce'}
            </Button>
          )}
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, textTransform: 'uppercase' }}>
              Tổng số đơn hàng
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mt: 0.5 }}>
              {stats.total}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 500, textTransform: 'uppercase' }}>
              Sẵn sàng xuất kho
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#15803d', mt: 0.5 }}>
              {stats.ready}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 500, textTransform: 'uppercase' }}>
              Không đủ tồn kho
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#b91c1c', mt: 0.5 }}>
              {stats.insufficient}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, textTransform: 'uppercase' }}>
              Đã tạo hóa đơn kho
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mt: 0.5 }}>
              {stats.confirmed}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter / Search Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchField
            placeholder="Tìm theo mã đơn, khách hàng, SĐT, địa chỉ, hóa đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={340}
          />

          <TextField
            select
            label="Trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ width: 220 }}
          >
            <MenuItem value="all">Tất cả trạng thái</MenuItem>
            <MenuItem value="processing">Đang xử lý</MenuItem>
            <MenuItem value="completed">Hoàn thành</MenuItem>
            <MenuItem value="on-hold">Tạm giữ</MenuItem>
            <MenuItem value="pending">Chờ thanh toán</MenuItem>
            <MenuItem value="cancelled">Đã hủy</MenuItem>
            <MenuItem value="refunded">Đã hoàn tiền</MenuItem>
          </TextField>

          <TextField
            select
            label="Khả dụng xuất kho"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            size="small"
            sx={{ width: 220 }}
          >
            <MenuItem value="all">Tất cả khả dụng</MenuItem>
            <MenuItem value="ready">Đủ tồn kho</MenuItem>
            <MenuItem value="insufficient_stock">Không đủ tồn kho</MenuItem>
            <MenuItem value="unmapped">Chưa liên kết kho</MenuItem>
            <MenuItem value="not_eligible">Chưa đủ điều kiện</MenuItem>
          </TextField>

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, ml: 'auto' }}>
            Hiển thị: <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể tải danh sách đơn WooCommerce: {(error as Error).message}
        </Box>
      )}

      {/* AG Grid Table */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          border: '1px solid #ededed',
          borderRadius: '8px',
          overflow: 'hidden',
          height: 'calc(100vh - 350px)',
          minHeight: 420,
        }}
      >
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<WooCommerceOrderDto>
            rowData={filteredOrders}
            columnDefs={columns}
            autoSizeStrategy={AG_GRID_AUTO_SIZE_STRATEGY}
            onFirstDataRendered={(params) => autoSizeGridColumns(params.api)}
            onRowDataUpdated={(params) => autoSizeGridColumns(params.api)}
            loading={isLoading}
            localeText={AG_GRID_LOCALE_VI}
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Không có đơn hàng WooCommerce nào</span>'
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
          />
        </div>
      </Paper>

      {/* ORDER DETAIL DIALOG */}
      <Dialog
        open={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            bgcolor: '#ffffff',
            border: '1px solid #ededed',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #ededed',
            py: 1.5,
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717', fontSize: 16, whiteSpace: 'nowrap' }}>
              Chi tiết đơn hàng #{orderDetail?.orderNumber || selectedOrderId}
            </Typography>
            {orderDetail && renderOrderStatusBadge(orderDetail.status)}
          </Box>
          <IconButton
            size="small"
            onClick={() => setSelectedOrderId(null)}
            aria-label="Đóng"
            sx={{ color: '#737373', '&:hover': { bgcolor: '#f2f2f2' } }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          {isDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} sx={{ color: '#1a1a1a' }} />
            </Box>
          ) : orderDetail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Status Alert Banner */}
              {(() => {
                const alertContent = getAvailabilityAlertContent(orderDetail.availability)
                return (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '6px',
                      border: '1px solid',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      ...(orderDetail.availability === 'ready'
                        ? { bgcolor: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }
                        : orderDetail.availability === 'insufficient_stock' || orderDetail.availability === 'insufficient'
                        ? { bgcolor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }
                        : orderDetail.availability === 'unmapped'
                        ? { bgcolor: '#fffbeb', borderColor: '#fef3c7', color: '#b45309' }
                        : { bgcolor: '#f9f9f9', borderColor: '#ededed', color: '#737373' }),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {orderDetail.availability === 'ready' && <CheckCircle2 size={20} />}
                      {(orderDetail.availability === 'insufficient_stock' || orderDetail.availability === 'insufficient') && (
                        <XCircle size={20} />
                      )}
                      {orderDetail.availability === 'unmapped' && <AlertTriangle size={20} />}
                      {orderDetail.availability === 'not_eligible' && <Clock size={20} />}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
                          {alertContent.title}
                        </Typography>
                        {alertContent.desc && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, opacity: 0.9 }}>
                            {alertContent.desc}
                          </Typography>
                        )}
                        {orderDetail.confirmedInvoiceId && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#15803d', fontWeight: 500 }}>
                            Đã xuất hóa đơn kho: <strong>{orderDetail.confirmedInvoiceId}</strong> (Xác nhận lúc {formatDateTime(orderDetail.confirmedAt)})
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ flexShrink: 0 }}>
                      {renderAvailabilityBadge(orderDetail.availability)}
                    </Box>
                  </Box>
                )
              })()}

              {/* Order Metadata Grid */}
              <Grid container spacing={2}>
                {/* Thông tin khách hàng */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#fafafa',
                      border: '1px solid #ededed',
                      borderRadius: '6px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                      <User size={16} color="#737373" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                        Thông tin khách hàng
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: '#737373', minWidth: 90, whiteSpace: 'nowrap' }}>
                          Khách hàng:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717' }}>
                          {orderDetail.customerName?.trim() ? orderDetail.customerName : 'Khách vãng lai'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: '#737373', minWidth: 90, whiteSpace: 'nowrap' }}>
                          Số điện thoại:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: orderDetail.customerPhone?.trim() ? '#171717' : '#737373',
                            fontWeight: orderDetail.customerPhone?.trim() ? 500 : 400,
                          }}
                        >
                          {orderDetail.customerPhone?.trim() || 'Chưa cung cấp'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: '#737373', minWidth: 90, whiteSpace: 'nowrap' }}>
                          Email:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: orderDetail.customerEmail?.trim() ? '#171717' : '#737373',
                            fontWeight: orderDetail.customerEmail?.trim() ? 500 : 400,
                            wordBreak: 'break-all',
                          }}
                        >
                          {orderDetail.customerEmail?.trim() || 'Chưa cung cấp'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* Địa chỉ giao hàng & Ngày đặt */}
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#fafafa',
                      border: '1px solid #ededed',
                      borderRadius: '6px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                      <MapPin size={16} color="#737373" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                        Địa chỉ &amp; Thời gian đặt hàng
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                          Địa chỉ giao hàng:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: orderDetail.shippingAddress?.trim() ? '#171717' : '#737373',
                            lineHeight: 1.4,
                          }}
                        >
                          {orderDetail.shippingAddress?.trim() || 'Chưa cung cấp'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Ngày đặt hàng:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: orderDetail.sourceCreatedAt ? '#171717' : '#737373',
                            fontWeight: orderDetail.sourceCreatedAt ? 500 : 400,
                          }}
                        >
                          {formatDateTime(orderDetail.sourceCreatedAt, 'Chưa cung cấp')}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Line Items Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717', mb: 1 }}>
                  {orderDetail.lines && orderDetail.lines.length > 0
                    ? `Danh sách sản phẩm trong đơn (${orderDetail.lines.length} sản phẩm)`
                    : 'Danh sách sản phẩm trong đơn'}
                </Typography>

                {orderDetail.lines && orderDetail.lines.length > 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      border: '1px solid #ededed',
                      borderRadius: '6px',
                      overflowX: 'auto',
                    }}
                  >
                    <Table size="small" sx={{ minWidth: 750 }}>
                      <TableHead sx={{ bgcolor: '#fafafa' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 200, whiteSpace: 'nowrap' }}>
                            SẢN PHẨM
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 150, whiteSpace: 'nowrap' }} align="center">
                            MÃ SẢN PHẨM KHO
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 90, whiteSpace: 'nowrap' }} align="right">
                            SỐ LƯỢNG
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 120, whiteSpace: 'nowrap' }} align="right">
                            ĐƠN GIÁ
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 130, whiteSpace: 'nowrap' }} align="right">
                            THÀNH TIỀN
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 130, whiteSpace: 'nowrap' }} align="right">
                            TỒN KHO HIỆN CÓ
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 150, whiteSpace: 'nowrap' }} align="center">
                            TRẠNG THÁI
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderDetail.lines.map((line: WooCommerceOrderLineDto) => (
                          <TableRow key={line.wooCommerceOrderItemId} sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                            <TableCell sx={{ py: 1.2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717', fontSize: 13 }}>
                                {line.productName}
                              </Typography>                              
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.2 }}>
                              {line.productId ? (
                                <Chip
                                  label={`Kho #${line.productId}`}
                                  size="small"
                                  sx={{ bgcolor: '#f2f2f2', color: '#171717', fontSize: 11, height: 20, whiteSpace: 'nowrap' }}
                                />
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                                  <Chip
                                    label="Chưa liên kết kho"
                                    size="small"
                                    sx={{ bgcolor: '#fffbeb', color: '#b45309', fontSize: 11, height: 20, fontWeight: 500, whiteSpace: 'nowrap' }}
                                  />
                                  <Typography variant="caption" sx={{ color: '#b91c1c', fontSize: 10, whiteSpace: 'nowrap' }}>
                                    Không thể xuất kho
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.2, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {line.quantity}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {formatVND(line.unitPrice)}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.2, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {formatVND(line.subtotal)}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {line.productId ? (
                                line.availableStock != null ? (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: line.availableStock >= line.quantity ? '#15803d' : '#b91c1c',
                                    }}
                                  >
                                    {line.availableStock}
                                  </Typography>
                                ) : (
                                  <span style={{ color: '#a3a3a3' }}>—</span>
                                )
                              ) : (
                                <Typography variant="caption" sx={{ color: '#737373', fontSize: 11 }}>
                                  Chưa có mã kho
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.2, whiteSpace: 'nowrap' }}>
                              {line.availability === 'available' && (
                                <Chip label="Đủ tồn kho" size="small" sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                              )}
                              {(line.availability === 'insufficient' || line.availability === 'insufficient_stock') && (
                                <Chip label="Không đủ tồn kho" size="small" sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                              )}
                              {line.availability === 'unmapped' && (
                                <Chip label="Chưa liên kết kho" size="small" sx={{ bgcolor: '#fffbeb', color: '#b45309', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                              )}
                              {line.availability !== 'available' &&
                                line.availability !== 'insufficient' &&
                                line.availability !== 'insufficient_stock' &&
                                line.availability !== 'unmapped' && (
                                  <Chip label={line.availability || 'Chưa đủ điều kiện'} size="small" sx={{ bgcolor: '#f2f2f2', color: '#737373', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      bgcolor: '#fafafa',
                      border: '1px dashed #d4d4d4',
                      borderRadius: '6px',
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <AlertTriangle size={28} color="#b45309" />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717' }}>
                        Chưa nhận được danh sách sản phẩm từ WooCommerce. Vui lòng đồng bộ lại đơn hàng.
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#737373' }}>
                        Dữ liệu chi tiết các mặt hàng của đơn này chưa có hoặc chưa được cập nhật từ hệ thống WooCommerce.
                      </Typography>
                    </Box>
                  </Paper>
                )}
              </Box>

              {/* Summary total */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                    TỔNG CỘNG ĐƠN HÀNG
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', fontVariantNumeric: 'tabular-nums' }}>
                    {formatVND(orderDetail.total)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: '1px solid #ededed' }}>
          <Button
            onClick={() => setSelectedOrderId(null)}
            variant="outlined"
            sx={{
              height: 36,
              borderColor: '#e0e0e0',
              color: '#171717',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
          >
            Đóng
          </Button>

          {orderDetail && orderDetail.availability === 'ready' && !orderDetail.confirmedInvoiceId && (
            <Button
              variant="contained"
              onClick={() => handleOpenConfirm(orderDetail)}
              startIcon={<PackageCheck size={16} />}
              sx={{
                height: 36,
                bgcolor: '#1a1a1a',
                color: '#ffffff',
                '&:hover': { bgcolor: '#000000' },
              }}
            >
              Xác nhận xuất kho
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* CONFIRM FULFILLMENT DIALOG (Chọn khách hàng kho có sẵn & tạo hóa đơn) */}
      <Dialog
        open={Boolean(orderToConfirm)}
        onClose={() => !confirmMutation.isPending && setOrderToConfirm(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            bgcolor: '#ffffff',
            border: '1px solid #ededed',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
          Xác nhận xuất kho đơn #{orderToConfirm?.orderNumber}
        </DialogTitle>

        <DialogContent>
          {confirmError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {confirmError}
            </Alert>
          )}

          <Typography variant="body2" sx={{ color: '#404040', mb: 2 }}>
            Hệ thống sẽ tạo 01 hóa đơn xuất kho chính thức và khấu trừ tồn kho tương ứng cho đơn hàng này.
          </Typography>

          {/* Order Summary Box */}
          <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#f9f9f9', border: '1px solid #ededed', borderRadius: '6px' }}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: '#737373' }}>Khách đặt hàng WooCommerce:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
                  {orderToConfirm?.customerName?.trim() ? orderToConfirm.customerName : 'Khách vãng lai'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#737373' }}>
                  {orderToConfirm?.customerPhone?.trim() || 'Chưa cung cấp'}
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: '#737373' }}>Tổng giá trị đơn:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#171717' }}>
                  {formatVND(orderToConfirm?.total)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#737373' }}>
                  {orderToConfirm?.lines?.length ? `${orderToConfirm.lines.length} sản phẩm` : 'Chưa có sản phẩm'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Customer Selection Autocomplete */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
              CHỌN KHÁCH HÀNG KHO LIÊN KẾT HÓA ĐƠN *
            </Typography>
            <Autocomplete<CustomerDto>
              size="small"
              options={customerOptions}
              loading={isCustomersLoading}
              getOptionLabel={(c) => `${c.name} - ${c.phone}${c.groupPrice ? ` [Nhóm: ${c.groupPrice}]` : ''}`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              value={selectedCustomer}
              onChange={(_, val) => setSelectedCustomer(val)}
              onInputChange={(_, newInputValue) => setCustomerSearchTerm(newInputValue)}
              disabled={confirmMutation.isPending}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Gõ tên hoặc SĐT khách hàng kho để tìm..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isCustomersLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#737373' }}>
                      SĐT: {option.phone || 'Chưa cung cấp'} | Địa chỉ: {option.address || 'Chưa cung cấp'}
                    </Typography>
                  </Box>
                </li>
              )}
            />
            <Typography variant="caption" sx={{ color: '#737373', display: 'block', mt: 0.5 }}>
              * Bắt buộc chọn một khách hàng đã có trong danh mục kho.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOrderToConfirm(null)}
            variant="outlined"
            disabled={confirmMutation.isPending}
            sx={{
              height: 36,
              borderColor: '#e0e0e0',
              color: '#171717',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
          >
            Hủy
          </Button>

          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            disabled={!selectedCustomer || confirmMutation.isPending}
            startIcon={confirmMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PackageCheck size={16} />}
            sx={{
              height: 36,
              bgcolor: '#1a1a1a',
              color: '#ffffff',
              '&:hover': { bgcolor: '#000000' },
            }}
          >
            {confirmMutation.isPending ? 'Đang tạo hóa đơn...' : 'Xác nhận & Tạo hóa đơn'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
