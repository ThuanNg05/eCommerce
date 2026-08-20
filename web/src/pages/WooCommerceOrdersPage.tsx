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
} from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchWooCommerceOrders,
  fetchWooCommerceOrderById,
  fetchWooCommerceOrderStatusReasons,
  syncWooCommerceOrders,
  confirmWooCommerceOrder,
  updateWooCommerceOrderStatus,
  type WooCommerceOrderDto,
  type WooCommerceOrderLineDto,
  type WooCommerceOrderStatus,
  type UpdateWooCommerceOrderStatusRequest,
  type WooCommerceOrderStatusReasonDto,
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

export const WOOCOMMERCE_STATUS_CONFIG: Record<
  WooCommerceOrderStatus,
  { label: string; color: string; bgcolor: string }
> = {
  pending: { label: 'Chờ xử lý', color: '#737373', bgcolor: '#f2f2f2' },
  processing: { label: 'Đang xử lý', color: '#1d4ed8', bgcolor: '#eff6ff' },
  'on-hold': { label: 'Tạm giữ', color: '#b45309', bgcolor: '#fffbeb' },
  completed: { label: 'Hoàn tất', color: '#15803d', bgcolor: '#f0fdf4' },
  cancelled: { label: 'Đã hủy', color: '#b91c1c', bgcolor: '#fef2f2' },
  refunded: { label: 'Đã hoàn tiền', color: '#b91c1c', bgcolor: '#fef2f2' },
  failed: { label: 'Thất bại', color: '#b91c1c', bgcolor: '#fef2f2' },
  draft: { label: 'Nháp', color: '#737373', bgcolor: '#f2f2f2' },
}

export const WOOCOMMERCE_STATUS_OPTIONS: { value: WooCommerceOrderStatus; label: string }[] = [
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'on-hold', label: 'Tạm giữ' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'draft', label: 'Nháp' },
]

export function formatGroupPrice(groupPrice?: string | null): string {
  if (!groupPrice) return 'Giá lẻ'
  const upper = groupPrice.trim().toUpperCase()
  if (upper === 'L') return 'Giá lẻ'
  if (upper === 'S') return 'Giá sỉ'
  return groupPrice
}

// Availability badge mapping (rút gọn theo yêu cầu)
export function renderAvailabilityBadge(availability: string, labelOverride?: string) {
  switch (availability) {
    case 'ready':
      return (
        <Chip
          icon={<CheckCircle2 size={13} color="#15803d" />}
          label={labelOverride || 'Đủ hàng'}
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
          label={labelOverride || 'Thiếu hàng'}
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
          label={labelOverride || 'Chưa liên kết'}
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
      return (
        <Chip
          icon={<Clock size={13} color="#737373" />}
          label={labelOverride || 'Chưa xử lý'}
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
    default:
      return (
        <Chip
          icon={<Clock size={13} color="#737373" />}
          label={labelOverride || 'Chưa sẵn sàng'}
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
  const s = (status || '').toLowerCase() as WooCommerceOrderStatus
  const config = WOOCOMMERCE_STATUS_CONFIG[s] || {
    label: status || 'Chưa xác định',
    color: '#737373',
    bgcolor: '#f2f2f2',
  }

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        bgcolor: config.bgcolor,
        color: config.color,
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
        title: 'Đủ hàng, có thể xác nhận xuất kho.',
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
  const [extraCustomerOptions, setExtraCustomerOptions] = useState<CustomerDto[]>([])
  const [isCustomerSearching, setIsCustomerSearching] = useState(false)
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

  // Status Reason States for Cancel / Refund
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [selectedReasonCode, setSelectedReasonCode] = useState('')
  const [reasonNote, setReasonNote] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

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

  // Status Reasons query for cancelled / refunded
  const { data: statusReasons = [], isLoading: isReasonsLoading } = useQuery({
    queryKey: ['wooCommerceStatusReasons', pendingStatus],
    queryFn: () => (pendingStatus ? fetchWooCommerceOrderStatusReasons(pendingStatus) : []),
    enabled: Boolean(pendingStatus === 'cancelled' || pendingStatus === 'refunded'),
  })

  const { data: customersData, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers', customerSearchTerm],
    queryFn: () => fetchCustomers(customerSearchTerm, 1, 100),
  })
  const customerOptions = customersData?.items ?? []

  // Merged customer options for Autocomplete selection
  const allCustomerOptions = useMemo(() => {
    const map = new Map<number, CustomerDto>()
    customerOptions.forEach((c) => map.set(c.id, c))
    extraCustomerOptions.forEach((c) => map.set(c.id, c))
    if (selectedCustomer) {
      map.set(selectedCustomer.id, selectedCustomer)
    }
    return Array.from(map.values())
  }, [customerOptions, extraCustomerOptions, selectedCustomer])

  // Mutations
  const syncMutation = useMutation({
    mutationFn: syncWooCommerceOrders,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['wooCommerceOrders'] })
      setToast({
        open: true,
        message: `Đồng bộ hoàn tất: đã cập nhật ${res.importedOrders} đơn hàng từ trang web.`,
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

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      req,
    }: {
      orderId: number
      req: UpdateWooCommerceOrderStatusRequest
    }) => updateWooCommerceOrderStatus(orderId, req),
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['wooCommerceOrders'] })
      queryClient.invalidateQueries({ queryKey: ['wooCommerceOrder', updatedOrder.wooCommerceOrderId] })
      setPendingStatus(null)
      setSelectedReasonCode('')
      setReasonNote('')
      setReasonError(null)
      const statusLabel =
        WOOCOMMERCE_STATUS_CONFIG[updatedOrder.status as WooCommerceOrderStatus]?.label || updatedOrder.status
      setToast({
        open: true,
        message: `Đã cập nhật trạng thái đơn #${updatedOrder.orderNumber} sang "${statusLabel}".`,
        severity: 'success',
      })
    },
    onError: (err: Error) => {
      setReasonError(err.message)
      setToast({
        open: true,
        message: `Không thể cập nhật trạng thái đơn hàng: ${err.message}`,
        severity: 'error',
      })
    },
  })

  const handleConfirmStatusWithReason = () => {
    if (!orderDetail || !pendingStatus) return
    if (!selectedReasonCode) {
      setReasonError(
        pendingStatus === 'cancelled'
          ? 'Vui lòng chọn lý do hủy đơn hàng.'
          : 'Vui lòng chọn lý do hoàn tiền đơn hàng.',
      )
      return
    }
    if (selectedReasonCode.endsWith('_other') && !reasonNote.trim()) {
      setReasonError('Vui lòng nhập ghi chú chi tiết khi chọn "Lý do khác".')
      return
    }
    setReasonError(null)
    updateStatusMutation.mutate({
      orderId: orderDetail.wooCommerceOrderId,
      req: {
        status: pendingStatus,
        reasonCode: selectedReasonCode,
        note: reasonNote.trim() || null,
      },
    })
  }

  const handleStatusSelectChange = (newStatus: string) => {
    if (!newStatus || !orderDetail) return
    const currentStatus = orderDetail.status?.toLowerCase()
    if (newStatus === currentStatus) {
      setPendingStatus(null)
      setSelectedReasonCode('')
      setReasonNote('')
      setReasonError(null)
      return
    }
    if (newStatus === 'cancelled' || newStatus === 'refunded') {
      setPendingStatus(newStatus)
      setSelectedReasonCode('')
      setReasonNote('')
      setReasonError(null)
    } else {
      setPendingStatus(null)
      setSelectedReasonCode('')
      setReasonNote('')
      setReasonError(null)
      updateStatusMutation.mutate({
        orderId: orderDetail.wooCommerceOrderId,
        req: {
          status: newStatus,
          reasonCode: null,
          note: null,
        },
      })
    }
  }

  const handleCloseDetail = () => {
    setSelectedOrderId(null)
    setPendingStatus(null)
    setSelectedReasonCode('')
    setReasonNote('')
    setReasonError(null)
  }

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

  // Filtered rows for AG Grid (bỏ tìm theo confirmedInvoiceId)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search matching
      if (search.trim()) {
        const term = search.toLowerCase().trim()
        const matchNumber = order.orderNumber?.toLowerCase().includes(term)
        const matchCustomer = order.customerName?.toLowerCase().includes(term)
        const matchPhone = order.customerPhone?.toLowerCase().includes(term)
        const matchAddress = order.shippingAddress?.toLowerCase().includes(term)
        if (!matchNumber && !matchCustomer && !matchPhone && !matchAddress) {
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

  // Open confirm modal with smart auto-match customer by WooCommerce phone/name
  const handleOpenConfirm = async (order: WooCommerceOrderDto) => {
    setOrderToConfirm(order)
    setConfirmError(null)
    setSelectedCustomer(null)
    setExtraCustomerOptions([])

    const rawPhone = order.customerPhone?.trim() || ''
    const normalizedPhone = rawPhone.replace(/[^0-9]/g, '')

    // 1. Try finding matching customer in already loaded customerOptions
    if (normalizedPhone && customerOptions.length > 0) {
      const directMatch = customerOptions.find((c) => {
        const cPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : ''
        return (
          cPhone &&
          (cPhone === normalizedPhone ||
            (cPhone.length >= 9 && normalizedPhone.endsWith(cPhone)) ||
            (normalizedPhone.length >= 9 && cPhone.endsWith(normalizedPhone)))
        )
      })
      if (directMatch) {
        setSelectedCustomer(directMatch)
        return
      }
    }

    // 2. Fetch customers from backend by phone if not in current options
    setIsCustomerSearching(true)
    try {
      if (rawPhone) {
        const resPhone = await fetchCustomers(rawPhone, 1, 20)
        if (resPhone.items && resPhone.items.length > 0) {
          const phoneMatch =
            resPhone.items.find((c) => {
              const cPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : ''
              return (
                cPhone &&
                normalizedPhone &&
                (cPhone === normalizedPhone ||
                  cPhone.includes(normalizedPhone) ||
                  normalizedPhone.includes(cPhone))
              )
            }) || resPhone.items[0]

          if (phoneMatch) {
            setExtraCustomerOptions(resPhone.items)
            setSelectedCustomer(phoneMatch)
            return
          }
        }
      }

      // 3. Fallback search by customer name
      if (order.customerName?.trim()) {
        const resName = await fetchCustomers(order.customerName.trim(), 1, 20)
        if (resName.items && resName.items.length > 0) {
          const nameMatch =
            resName.items.find(
              (c) => c.name.trim().toLowerCase() === order.customerName!.trim().toLowerCase(),
            ) || resName.items[0]

          if (nameMatch) {
            setExtraCustomerOptions(resName.items)
            setSelectedCustomer(nameMatch)
            return
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi tự động tìm khách hàng:', err)
    } finally {
      setIsCustomerSearching(false)
    }
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

  // Column definitions for AG Grid (đã bỏ hoàn toàn cột HÓA ĐƠN KHO)
  const columns = useMemo<ColDef<WooCommerceOrderDto>[]>(
    () => [
      {
        field: 'orderNumber',
        headerName: 'MÃ ĐƠN',
        width: 120,
        sortable: true,
        filter: true,
        pinned: 'left',
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
        pinned: 'left',
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
        width: 160,
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
                <span>{renderAvailabilityBadge(p.data.availability)}</span>
              </Tooltip>
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
                    ? `Đơn đã xuất hóa đơn kho (${p.data.confirmedInvoiceId})`
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
              Đơn hàng từ trang web
            </Typography>
            <Chip
              label="E-Commerce"
              size="small"
              sx={{ bgcolor: '#EEF3FD', color: '#7299ED', fontWeight: 600, fontSize: 11, height: 20 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#737373', mt: 0.5 }}>
            Quản lý đồng bộ đơn hàng từ trang web, đối soát tồn kho tự động và xác nhận xuất hóa đơn kho.
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
              {syncMutation.isPending ? 'Đang đồng bộ...' : 'Đồng bộ từ trang web'}
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
            placeholder="Tìm theo mã đơn, khách hàng, SĐT, địa chỉ..."
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
            {WOOCOMMERCE_STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
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
            <MenuItem value="ready">Đủ hàng</MenuItem>
            <MenuItem value="insufficient_stock">Thiếu hàng</MenuItem>
            <MenuItem value="unmapped">Chưa liên kết</MenuItem>
            <MenuItem value="not_eligible">Chưa xử lý</MenuItem>
          </TextField>

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13, ml: 'auto' }}>
            Hiển thị: <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể tải danh sách đơn hàng trang web: {(error as Error).message}
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
            overlayNoRowsTemplate='<span style="padding: 10px; color: #a3a3a3;">Không có đơn hàng nào từ trang web</span>'
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
        onClose={handleCloseDetail}
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
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717', fontSize: 16, whiteSpace: 'nowrap' }}>
            Chi tiết đơn hàng #{orderDetail?.orderNumber || selectedOrderId}
          </Typography>
          <IconButton
            size="small"
            onClick={handleCloseDetail}
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
              {/* Stock Condition Alert & Order Status Row */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'stretch', md: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                {/* Stock Condition Alert Banner */}
                {(() => {
                  const alertContent = getAvailabilityAlertContent(orderDetail.availability)
                  return (
                    <Box
                      sx={{
                        flex: 1,
                        p: 1.75,
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
                        <Tooltip title={orderDetail.availabilityLabel || ''} arrow placement="top">
                          <span>{renderAvailabilityBadge(orderDetail.availability)}</span>
                        </Tooltip>
                      </Box>
                    </Box>
                  )
                })()}

                {/* WooCommerce Order Status Select with inline left label */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 1.25,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    component="label"
                    htmlFor="woo-order-status-select"
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#171717',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Trạng thái đơn:
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                    <TextField
                      id="woo-order-status-select"
                      select
                      size="small"
                      value={pendingStatus || orderDetail.status?.toLowerCase() || ''}
                      onChange={(e) => handleStatusSelectChange(e.target.value)}
                      disabled={updateStatusMutation.isPending}
                      sx={{
                        minWidth: 160,
                        width: { xs: '100%', sm: 170 },
                        bgcolor: '#ffffff',
                        '& .MuiSelect-select': { py: 0.85, fontSize: 13, fontWeight: 500, color: '#171717' },
                      }}
                    >
                      {WOOCOMMERCE_STATUS_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 13 }}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    {updateStatusMutation.isPending && (
                      <CircularProgress size={18} sx={{ color: '#7299ED', flexShrink: 0 }} />
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Reason Selection Card for Cancelled / Refunded */}
              {pendingStatus && (pendingStatus === 'cancelled' || pendingStatus === 'refunded') && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: '#fafafa',
                    border: '1px solid #ededed',
                    borderRadius: '6px',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AlertTriangle size={16} color={pendingStatus === 'cancelled' ? '#b91c1c' : '#b45309'} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717', fontSize: 14 }}>
                        {pendingStatus === 'cancelled' ? 'Lý do hủy đơn hàng' : 'Lý do hoàn tiền đơn hàng'}
                      </Typography>
                    </Box>
                    {isReasonsLoading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CircularProgress size={14} sx={{ color: '#7299ED' }} />
                        <Typography variant="caption" sx={{ color: '#737373', fontSize: 12 }}>
                          Đang tải lý do...
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {reasonError && (
                    <Alert severity="error" sx={{ mb: 1.5, borderRadius: '6px', py: 0.5, fontSize: 13 }}>
                      {reasonError}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      select
                      size="small"
                      label={pendingStatus === 'cancelled' ? 'Chọn lý do hủy đơn *' : 'Chọn lý do hoàn tiền *'}
                      value={selectedReasonCode}
                      onChange={(e) => {
                        setSelectedReasonCode(e.target.value)
                        if (reasonError) setReasonError(null)
                      }}
                      disabled={isReasonsLoading || updateStatusMutation.isPending}
                      error={Boolean(reasonError && !selectedReasonCode)}
                      fullWidth
                      sx={{
                        bgcolor: '#ffffff',
                        '& .MuiInputLabel-root': { fontSize: 13 },
                        '& .MuiSelect-select': { fontSize: 13, fontWeight: 500 },
                      }}
                    >
                      <MenuItem value="" disabled sx={{ fontSize: 13, color: '#a3a3a3' }}>
                        -- Vui lòng chọn lý do --
                      </MenuItem>
                      {statusReasons.map((r: WooCommerceOrderStatusReasonDto) => (
                        <MenuItem key={r.code} value={r.code} sx={{ fontSize: 13 }}>
                          {r.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      multiline
                      rows={2}
                      size="small"
                      label={
                        selectedReasonCode.endsWith('_other')
                          ? 'Ghi chú lý do chi tiết *'
                          : 'Ghi chú lý do (tùy chọn)'
                      }
                      placeholder={
                        selectedReasonCode.endsWith('_other')
                          ? 'Bắt buộc nhập lý do chi tiết khi chọn "Lý do khác"...'
                          : 'Nhập ghi chú chi tiết nếu có (tối đa 1000 ký tự)...'
                      }
                      value={reasonNote}
                      onChange={(e) => {
                        setReasonNote(e.target.value)
                        if (reasonError && selectedReasonCode.endsWith('_other') && e.target.value.trim()) {
                          setReasonError(null)
                        }
                      }}
                      disabled={updateStatusMutation.isPending}
                      error={Boolean(reasonError && selectedReasonCode.endsWith('_other') && !reasonNote.trim())}
                      inputProps={{ maxLength: 1000 }}
                      fullWidth
                      sx={{
                        bgcolor: '#ffffff',
                        '& .MuiInputLabel-root': { fontSize: 13 },
                        '& .MuiOutlinedInput-input': { fontSize: 13 },
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setPendingStatus(null)
                          setSelectedReasonCode('')
                          setReasonNote('')
                          setReasonError(null)
                        }}
                        disabled={updateStatusMutation.isPending}
                        sx={{
                          height: 32,
                          fontSize: 12,
                          borderColor: '#e0e0e0',
                          color: '#171717',
                          '&:hover': { bgcolor: '#f2f2f2' },
                        }}
                      >
                        Bỏ qua
                      </Button>

                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleConfirmStatusWithReason}
                        disabled={!selectedReasonCode || updateStatusMutation.isPending || isReasonsLoading}
                        startIcon={
                          updateStatusMutation.isPending ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : null
                        }
                        sx={{
                          height: 32,
                          fontSize: 12,
                          bgcolor: '#1a1a1a',
                          color: '#ffffff',
                          '&:hover': { bgcolor: '#000000' },
                        }}
                      >
                        {updateStatusMutation.isPending
                          ? 'Đang cập nhật...'
                          : pendingStatus === 'cancelled'
                          ? 'Xác nhận hủy đơn'
                          : 'Xác nhận hoàn tiền'}
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              )}

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
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 180, whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 4, bgcolor: '#fafafa', borderRight: '1px solid #ededed' }}>
                            SẢN PHẨM
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
                          <TableCell sx={{ fontWeight: 600, color: '#737373', fontSize: 12, py: 1.2, minWidth: 150, maxWidth: 220, whiteSpace: 'nowrap' }}>
                            GHI CHÚ
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
                        {orderDetail.lines.map((line: WooCommerceOrderLineDto) => {
                          const noteText = (line.customerNote || line.note || orderDetail.customerNote || orderDetail.note || '').trim()
                          const isNa = !noteText

                          return (
                            <TableRow key={line.wooCommerceOrderItemId} sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                              <TableCell sx={{ py: 1.2, position: 'sticky', left: 0, zIndex: 2, bgcolor: '#ffffff', borderRight: '1px solid #ededed' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717', fontSize: 13 }}>
                                  {line.productName}
                                </Typography>
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
                              <TableCell sx={{ py: 1.2, maxWidth: 220 }}>
                                {isNa ? (
                                  <Typography variant="body2" sx={{ color: '#a3a3a3', fontSize: 12, fontStyle: 'normal' }}>
                                    -N/A-
                                  </Typography>
                                ) : (
                                  <Tooltip title={noteText} arrow placement="top">
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: '#404040',
                                        fontSize: 13,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 200,
                                        display: 'block',
                                        cursor: 'default',
                                      }}
                                    >
                                      {noteText}
                                    </Typography>
                                  </Tooltip>
                                )}
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
                                  <Chip label="Đủ hàng" size="small" sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                                )}
                                {(line.availability === 'insufficient' || line.availability === 'insufficient_stock') && (
                                  <Chip label="Thiếu hàng" size="small" sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                                )}
                                {line.availability === 'unmapped' && (
                                  <Chip label="Chưa liên kết" size="small" sx={{ bgcolor: '#fffbeb', color: '#b45309', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                                )}
                                {line.availability !== 'available' &&
                                  line.availability !== 'insufficient' &&
                                  line.availability !== 'insufficient_stock' &&
                                  line.availability !== 'unmapped' && (
                                    <Chip label={line.availability === 'not_eligible' ? 'Chưa xử lý' : line.availability || 'Chưa sẵn sàng'} size="small" sx={{ bgcolor: '#f2f2f2', color: '#737373', fontSize: 11, height: 20, whiteSpace: 'nowrap' }} />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
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
                        Chưa nhận được danh sách sản phẩm từ trang web. Vui lòng đồng bộ lại đơn hàng.
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#737373' }}>
                        Dữ liệu chi tiết các mặt hàng của đơn này chưa có hoặc chưa được cập nhật từ trang web.
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
            onClick={handleCloseDetail}
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
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={7}>
                <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                  Khách đặt hàng trên trang web:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717', mt: 0.25 }}>
                  {orderToConfirm?.customerName?.trim() ? orderToConfirm.customerName : 'Khách vãng lai'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#737373', display: 'block', mt: 0.25 }}>
                  SĐT: <strong>{orderToConfirm?.customerPhone?.trim() || 'Chưa cung cấp'}</strong>
                </Typography>
                {orderToConfirm?.shippingAddress?.trim() && (
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block', mt: 0.25 }}>
                    Địa chỉ nhận hàng: {orderToConfirm.shippingAddress.trim()}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={5} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                  Tổng giá trị đơn:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#171717', mt: 0.25 }}>
                  {formatVND(orderToConfirm?.total)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#737373', display: 'block', mt: 0.25 }}>
                  {orderToConfirm?.lines?.length ? `${orderToConfirm.lines.length} sản phẩm` : 'Chưa có sản phẩm'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Customer Selection Autocomplete */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500 }}>
                CHỌN KHÁCH HÀNG KHO LIÊN KẾT HÓA ĐƠN *
              </Typography>
              {isCustomerSearching && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CircularProgress size={12} sx={{ color: '#7299ED' }} />
                  <Typography variant="caption" sx={{ color: '#7299ED', fontSize: 11 }}>
                    Đang tìm khách hàng theo SĐT/Tên...
                  </Typography>
                </Box>
              )}
            </Box>
            <Autocomplete<CustomerDto>
              size="small"
              options={allCustomerOptions}
              loading={isCustomersLoading || isCustomerSearching}
              getOptionLabel={(c) => `${c.name} - ${c.phone || 'Không có SĐT'} [${formatGroupPrice(c.groupPrice)}]`}
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
                        {isCustomersLoading || isCustomerSearching ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ py: 0.5, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#171717' }}>
                        {option.name}
                      </Typography>
                      <Chip
                        label={formatGroupPrice(option.groupPrice)}
                        size="small"
                        sx={{
                          bgcolor: option.groupPrice?.toUpperCase() === 'S' ? '#eff6ff' : '#f0fdf4',
                          color: option.groupPrice?.toUpperCase() === 'S' ? '#1d4ed8' : '#15803d',
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: '4px',
                          height: 18,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#737373' }}>
                      SĐT: {option.phone || 'Chưa cung cấp'}{option.address ? ` | Đ/C: ${option.address}` : ''}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            {/* Selected Customer Details */}
            {selectedCustomer && (
              <Paper
                elevation={0}
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #ededed',
                  borderRadius: '6px',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717' }}>
                    {selectedCustomer.name}
                  </Typography>
                  <Chip
                    label={formatGroupPrice(selectedCustomer.groupPrice)}
                    size="small"
                    sx={{
                      bgcolor: selectedCustomer.groupPrice?.toUpperCase() === 'S' ? '#eff6ff' : '#f0fdf4',
                      color: selectedCustomer.groupPrice?.toUpperCase() === 'S' ? '#1d4ed8' : '#15803d',
                      fontWeight: 600,
                      fontSize: 11,
                      height: 20,
                      borderRadius: '4px',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                  SĐT: <strong>{selectedCustomer.phone || 'Chưa cung cấp'}</strong>
                  {selectedCustomer.email ? ` | Email: ${selectedCustomer.email}` : ''}
                </Typography>
                {selectedCustomer.address && (
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block', mt: 0.25 }}>
                    Địa chỉ: {selectedCustomer.address}
                  </Typography>
                )}
              </Paper>
            )}

            <Typography variant="caption" sx={{ color: '#737373', display: 'block', mt: 0.75 }}>
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
