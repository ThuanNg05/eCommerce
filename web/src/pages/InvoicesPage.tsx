import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
} from '@mui/material'
import { Plus, RefreshCw, Printer, Eye, Trash2 } from 'lucide-react'
import SearchField from '../components/SearchField'
import {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  type InvoiceSummaryDto,
  type CreateInvoiceRequest,
} from '../api/invoices'
import { fetchInventory } from '../api/inventory'

const formatVND = (value?: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)

  // Create Form State
  const [customerId, setCustomerId] = useState<number>(1)
  const [lines, setLines] = useState<{ productId: number; quantity: number }[]>([
    { productId: 1, quantity: 1 },
  ])
  const [actionError, setActionError] = useState<string | null>(null)

  // Query Invoices List
  const { data: invoicesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchInvoices(),
  })

  // Query Products List for Create Invoice Dropdown
  const { data: productsData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => fetchInventory('', 1, 200),
  })

  // Query Selected Invoice Detail for Viewing / Printing
  const { data: invoiceDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['invoice', viewInvoiceId],
    queryFn: () => (viewInvoiceId ? fetchInvoiceById(viewInvoiceId) : null),
    enabled: Boolean(viewInvoiceId),
  })

  // Create Invoice Mutation
  const createMutation = useMutation({
    mutationFn: (req: CreateInvoiceRequest) => createInvoice(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsCreateOpen(false)
      setLines([{ productId: 1, quantity: 1 }])
      setActionError(null)
    },
    onError: (err: Error) => setActionError(err.message),
  })

  const handleAddLine = () => {
    const defaultProductId = productsData?.items[0]?.id || 1
    setLines([...lines, { productId: defaultProductId, quantity: 1 }])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleLineChange = (index: number, field: 'productId' | 'quantity', val: number) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: val }
    setLines(updated)
  }

  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return []
    if (!search.trim()) return invoicesData
    const q = search.toLowerCase()
    return invoicesData.filter((i) => i.id.toLowerCase().includes(q) || String(i.customerId).includes(q))
  }, [invoicesData, search])

  const columns = useMemo<ColDef[]>(
    () => [
      {
        field: 'id',
        headerName: 'MÃ HÓA ĐƠN',
        width: 180,
        filter: true,
        sortable: true,
      },
      {
        field: 'customerId',
        headerName: 'MÃ KHÁCH HÀNG',
        width: 160,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<InvoiceSummaryDto, number>) => `KH-${p.value}`,
      },
      {
        field: 'createdAt',
        headerName: 'NGÀY TẠO',
        flex: 1,
        minWidth: 160,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<InvoiceSummaryDto, string>) =>
          p.value
            ? new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(p.value))
            : '—',
      },
      {
        field: 'total',
        headerName: 'TỔNG TIỀN',
        type: 'rightAligned',
        width: 160,
        sortable: true,
        valueFormatter: (p: ValueFormatterParams<InvoiceSummaryDto, number>) => formatVND(p.value),
      },
      {
        headerName: 'THAO TÁC',
        width: 150,
        sortable: false,
        filter: false,
        cellRenderer: (p: { data: InvoiceSummaryDto }) => {
          if (!p.data) return null
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Xem chi tiết & In">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setViewInvoiceId(p.data.id)}
                  startIcon={<Eye size={14} />}
                  sx={{
                    height: 28,
                    fontSize: 12,
                    borderColor: '#e0e0e0',
                    color: '#171717',
                    '&:hover': { bgcolor: '#f2f2f2' },
                  }}
                >
                  Chi tiết
                </Button>
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
      {/* Action Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717', mb: 0.5 }}>
            Quản lý Hóa đơn
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Xem danh sách hóa đơn đơn hàng, tạo mới và in lại hóa đơn cho khách.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => refetch()}
            startIcon={<RefreshCw size={15} />}
            sx={{
              height: 36,
              borderColor: '#e0e0e0',
              color: '#171717',
              '&:hover': { bgcolor: '#f2f2f2' },
            }}
          >
            Làm mới
          </Button>

          <Button
            variant="contained"
            onClick={() => setIsCreateOpen(true)}
            startIcon={<Plus size={16} />}
            sx={{
              height: 36,
              bgcolor: '#1a1a1a',
              color: '#ffffff',
              '&:hover': { bgcolor: '#000000' },
            }}
          >
            Tạo hóa đơn
          </Button>
        </Box>
      </Box>

      {/* Search / Filter Bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', border: '1px solid #ededed', borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchField
            placeholder="Tìm theo mã hóa đơn (vd: INV-2026...)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width={320}
          />

          <Typography variant="body2" sx={{ color: '#737373', fontSize: 13 }}>
            Tổng số: <strong>{filteredInvoices.length}</strong> hóa đơn
          </Typography>
        </Box>
      </Paper>

      {/* Error state */}
      {isError && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px' }}>
          Không thể tải danh sách hóa đơn: {(error as Error).message}
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
          height: 'calc(100vh - 270px)',
          minHeight: 400,
        }}
      >
        <div className="ag-theme-quartz" style={{ width: '100%', height: '100%' }}>
          <AgGridReact<InvoiceSummaryDto>
            rowData={filteredInvoices}
            columnDefs={columns}
            loading={isLoading}
            animateRows
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
          />
        </div>
      </Paper>

      {/* CREATE INVOICE DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>Tạo hóa đơn đơn hàng mới</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }}>
              {actionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5, mb: 3 }}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#737373', fontWeight: 500, display: 'block', mb: 0.5 }}>
                MÃ KHÁCH HÀNG (CUSTOMER ID) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={customerId}
                onChange={(e) => setCustomerId(Number(e.target.value))}
                placeholder="Nhập Customer ID"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#171717' }}>
            Chi tiết các dòng sản phẩm trong hóa đơn
          </Typography>

          {lines.map((line, index) => (
            <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 1.5 }}>
              <Grid item xs={7}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={`Sản phẩm #${index + 1}`}
                  value={line.productId}
                  onChange={(e) => handleLineChange(index, 'productId', Number(e.target.value))}
                  SelectProps={{ native: true }}
                >
                  {productsData?.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} ({formatVND(p.priceRetail || p.basePrice)})
                    </option>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Số lượng"
                  value={line.quantity}
                  onChange={(e) => handleLineChange(index, 'quantity', Number(e.target.value))}
                />
              </Grid>

              <Grid item xs={2}>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveLine(index)}
                  disabled={lines.length === 1}
                  sx={{ color: '#b91c1c' }}
                >
                  <Trash2 size={18} />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button
            variant="outlined"
            onClick={handleAddLine}
            startIcon={<Plus size={15} />}
            sx={{ mt: 1, borderColor: '#e0e0e0', color: '#171717' }}
          >
            Thêm dòng sản phẩm
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsCreateOpen(false)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={() => createMutation.mutate({ customerId, lines })}
            variant="contained"
            disabled={createMutation.isPending}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            Tạo hóa đơn
          </Button>
        </DialogActions>
      </Dialog>

      {/* PRINTABLE INVOICE DETAIL MODAL (FR016) */}
      <Dialog
        open={Boolean(viewInvoiceId)}
        onClose={() => setViewInvoiceId(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
            Chi tiết hóa đơn {invoiceDetail?.id}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.print()}
            startIcon={<Printer size={16} />}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#000000' } }}
          >
            In hóa đơn
          </Button>
        </DialogTitle>
        <Divider />
        <DialogContent id="printable-invoice-content">
          {isDetailLoading ? (
            <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: '#737373' }}>
              Đang tải chi tiết hóa đơn...
            </Typography>
          ) : invoiceDetail ? (
            <Box sx={{ p: 2 }}>
              {/* Header Invoice Print Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#171717' }}>
                    XƯỞNG KHUNG TRANH E-COMMERCE
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#737373' }}>
                    Địa chỉ: Số 100 Nguyễn Trãi, Q.1, TP. Hồ Chí Minh
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#737373' }}>
                    Điện thoại: (028) 3822 9999
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#7299ED' }}>
                    HÓA ĐƠN BÁN HÀNG
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#171717' }}>
                    Mã số: {invoiceDetail.id}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#737373', display: 'block' }}>
                    Ngày lập: {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(invoiceDetail.createdAt))}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Customer Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#171717' }}>
                  Khách hàng: KH-{invoiceDetail.customerId}
                </Typography>
              </Box>

              {/* Invoice Lines Table */}
              <Table size="small" sx={{ mb: 3, border: '1px solid #ededed' }}>
                <TableHead sx={{ bgcolor: '#f9f9f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>SẢN PHẨM</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      SỐ LƯỢNG
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ĐƠN GIÁ
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      THÀNH TIỀN
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceDetail.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{line.productName}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{formatVND(line.unitPrice)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatVND(line.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Total Calculation */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
                <Box sx={{ width: 260 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#171717' }}>
                      TỔNG THÀNH TIỀN:
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#7299ED' }}>
                      {formatVND(invoiceDetail.total)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: '#a3a3a3', fontStyle: 'italic', display: 'block', textAlign: 'center' }}>
                Cảm ơn quý khách đã tin tưởng xưởng khung tranh của chúng tôi!
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#b91c1c', py: 2 }}>
              Không tìm thấy thông tin chi tiết hóa đơn.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewInvoiceId(null)} variant="outlined" color="inherit">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
