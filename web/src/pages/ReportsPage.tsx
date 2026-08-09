import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Skeleton,
  Alert,
  Tooltip as MuiTooltip,
  Pagination,
  Menu,
  CircularProgress,
  Snackbar,
  type SelectChangeEvent,
} from '@mui/material'
import {
  TrendingUp,
  FileText,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Filter,
  BarChart2,
  Users,
  Package,
  Download,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react'
import {
  fetchSalesOverview,
  fetchSalesSummary,
  fetchTopProducts,
  fetchTopCustomers,
  fetchInventoryFlow,
  fetchInvoiceDetails,
  fetchLowStockReports,
  type SalesReportFilter,
  type InvoiceReportRowDto,
} from '../api/reports'
import { fetchCategories, type CategoryDto } from '../api/categories'
import { fetchInventory, type ProductDto } from '../api/inventory'
import { fetchCustomers, type CustomerDto } from '../api/customers'
import SearchField from '../components/SearchField'
import { exportReportsToExcel, exportReportsToPdf, type ExportReportsData } from '../utils/exportReports'
import { formatDate } from '../utils/dateFormat'

// Utility formatters
const formatVND = (amount?: number | null) => {
  if (amount == null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
}

const formatDateTime = formatDate

const getTodayString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPresetDates = (preset: string) => {
  const now = new Date()
  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (preset === 'today') {
    const todayStr = formatDate(now)
    return { from: todayStr, to: todayStr }
  }
  if (preset === '7days') {
    const toStr = formatDate(now)
    const past = new Date(now)
    past.setDate(past.getDate() - 6)
    return { from: formatDate(past), to: toStr }
  }
  if (preset === 'thisMonth') {
    const toStr = formatDate(now)
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: formatDate(firstDay), to: toStr }
  }
  if (preset === 'lastMonth') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: formatDate(firstDay), to: formatDate(lastDay) }
  }
  return null
}

export default function ReportsPage() {
  // Preset state: default from 30 days ago to today
  const defaultTo = getTodayString()
  const defaultFromDate = new Date()
  defaultFromDate.setDate(defaultFromDate.getDate() - 30)
  const defaultFromYear = defaultFromDate.getFullYear()
  const defaultFromMonth = String(defaultFromDate.getMonth() + 1).padStart(2, '0')
  const defaultFromDay = String(defaultFromDate.getDate()).padStart(2, '0')
  const defaultFrom = `${defaultFromYear}-${defaultFromMonth}-${defaultFromDay}`

  const [datePreset, setDatePreset] = useState<string>('custom')
  const [fromDate, setFromDate] = useState<string>(defaultFrom)
  const [toDate, setToDate] = useState<string>(defaultTo)

  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null)
  const [groupPrice, setGroupPrice] = useState<string>('')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [search, setSearch] = useState<string>('')

  // Flow specific filters
  const [flowTxType, setFlowTxType] = useState<number | ''>('')
  const [flowItemType, setFlowItemType] = useState<string>('')

  // Invoice Details Pagination
  const [detailsPage, setDetailsPage] = useState<number>(1)
  const [detailsPageSize, setDetailsPageSize] = useState<number>(20)

  // Export State & Menu
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [toastState, setToastState] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  // Server-Side Autocomplete search terms
  const [categorySearchTerm, setCategorySearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  // Query options for Autocompletes
  const { data: categoriesData } = useQuery({
    queryKey: ['report-categories-search', categorySearchTerm],
    queryFn: () => fetchCategories(categorySearchTerm, 1, 50),
  })

  const { data: inventoryData } = useQuery({
    queryKey: ['report-inventory-search', productSearchTerm],
    queryFn: () => fetchInventory(productSearchTerm, 1, 50),
  })

  const { data: customersData } = useQuery({
    queryKey: ['report-customers-search', customerSearchTerm],
    queryFn: () => fetchCustomers(customerSearchTerm, 1, 50),
  })

  const categoryOptions = categoriesData?.items ?? []
  const productOptions = inventoryData?.items ?? []
  const customerOptions = customersData?.items ?? []

  // Main Sales Filter Object
  const salesFilter = useMemo<SalesReportFilter>(() => {
    return {
      from: fromDate || undefined,
      to: toDate || undefined,
      categoryId: selectedCategory?.id,
      productId: selectedProduct?.id,
      customerId: selectedCustomer?.id,
      groupPrice: groupPrice || undefined,
      search: search.trim() || undefined,
    }
  }, [fromDate, toDate, selectedCategory, selectedProduct, selectedCustomer, groupPrice, search])

  // Queries
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ['reports', 'sales-overview', salesFilter],
    queryFn: () => fetchSalesOverview(salesFilter),
  })

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['reports', 'sales-summary', salesFilter, groupBy],
    queryFn: () => fetchSalesSummary(salesFilter, groupBy),
  })

  const {
    data: topProductsData,
    isLoading: isTopProductsLoading,
    error: topProductsError,
  } = useQuery({
    queryKey: ['reports', 'top-products', salesFilter],
    queryFn: () => fetchTopProducts(salesFilter, 10),
  })

  const {
    data: topCustomersData,
    isLoading: isTopCustomersLoading,
    error: topCustomersError,
  } = useQuery({
    queryKey: ['reports', 'top-customers', salesFilter],
    queryFn: () => fetchTopCustomers(salesFilter, 10),
  })

  const {
    data: flowData,
    isLoading: isFlowLoading,
    error: flowError,
  } = useQuery({
    queryKey: ['reports', 'inventory-flow', fromDate, toDate, flowTxType, flowItemType],
    queryFn: () =>
      fetchInventoryFlow(
        fromDate || undefined,
        toDate || undefined,
        flowTxType !== '' ? flowTxType : undefined,
        flowItemType || undefined,
      ),
  })

  const {
    data: invoiceDetailsData,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useQuery({
    queryKey: ['reports', 'invoice-details', salesFilter, detailsPage, detailsPageSize],
    queryFn: () => fetchInvoiceDetails(salesFilter, detailsPage, detailsPageSize),
  })

  const { data: lowStockData, isLoading: isLowStockLoading } = useQuery({
    queryKey: ['reports', 'low-stock'],
    queryFn: () => fetchLowStockReports(),
  })

  // Handlers for Preset Buttons
  const handleSelectPreset = (presetKey: string) => {
    setDatePreset(presetKey)
    const dates = getPresetDates(presetKey)
    if (dates) {
      setFromDate(dates.from)
      setToDate(dates.to)
      setDetailsPage(1)
    }
  }

  const handleResetFilters = () => {
    setDatePreset('custom')
    setFromDate(defaultFrom)
    setToDate(defaultTo)
    setSelectedCategory(null)
    setSelectedProduct(null)
    setSelectedCustomer(null)
    setGroupPrice('')
    setGroupBy('day')
    setSearch('')
    setFlowTxType('')
    setFlowItemType('')
    setDetailsPage(1)
  }

  // Get ProblemDetails error text helper
  const getErrorMessage = (err: unknown) => {
    if (!err) return null
    if (err instanceof Error) return err.message
    if (typeof err === 'object' && err !== null) {
      const e = err as { detail?: string; title?: string; message?: string }
      return e.detail || e.title || e.message || 'Đã có lỗi xảy ra khi tải báo cáo.'
    }
    return 'Đã có lỗi xảy ra khi tải báo cáo.'
  }

  const generalError =
    getErrorMessage(overviewError) ||
    getErrorMessage(summaryError) ||
    getErrorMessage(topProductsError) ||
    getErrorMessage(topCustomersError) ||
    getErrorMessage(flowError) ||
    getErrorMessage(detailsError)

  // Max revenue in sales summary for chart scaling
  const maxSummaryRevenue = useMemo(() => {
    if (!summaryData || summaryData.length === 0) return 1
    return Math.max(...summaryData.map((d) => d.total), 1)
  }, [summaryData])

  // Max flow quantity in inventory flow for chart scaling
  const maxFlowQuantity = useMemo(() => {
    if (!flowData || flowData.length === 0) return 1
    return Math.max(...flowData.map((d) => Math.max(d.inQuantity, d.outQuantity)), 1)
  }, [flowData])

  // Check if report has valid data to export
  const hasReportData = Boolean(
    overviewData ||
      (summaryData && summaryData.length > 0) ||
      (invoiceDetailsData && invoiceDetailsData.totalCount > 0),
  )

  const getFilterDescriptionLabel = () => {
    let base = ''
    if (datePreset === 'today') base = 'Hôm nay'
    else if (datePreset === '7days') base = '7 ngày'
    else if (datePreset === 'thisMonth') base = 'Tháng này'
    else if (datePreset === 'lastMonth') base = 'Tháng trước'
    else if (fromDate && toDate) {
      const formatStr = (dStr: string) => {
        const parts = dStr.split('-')
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
        return dStr
      }
      base = `${formatStr(fromDate)} đến ${formatStr(toDate)}`
    } else {
      base = 'Tùy chọn'
    }

    if (groupPrice === 'S') base += ' - Sỉ'
    if (groupPrice === 'L') base += ' - Lẻ'
    return base
  }

  const buildExportData = async (): Promise<ExportReportsData> => {
    const filterDesc = getFilterDescriptionLabel()
    const groupPriceLabel = groupPrice === 'S' ? 'Giá sỉ (S)' : groupPrice === 'L' ? 'Giá lẻ (L)' : 'Tất cả nhóm'
    const categoryLabel = selectedCategory ? selectedCategory.name : 'Tất cả danh mục'
    const productLabel = selectedProduct ? `[${selectedProduct.sku}] ${selectedProduct.name}` : 'Tất cả sản phẩm'
    const customerLabel = selectedCustomer
      ? `${selectedCustomer.name}${selectedCustomer.phone ? ' - ' + selectedCustomer.phone : ''}`
      : 'Tất cả khách hàng'
    const searchLabel = search.trim() ? search.trim() : 'Không có'

    // Fetch full invoice details for export (up to 500 items)
    let completeInvoiceDetails: InvoiceReportRowDto[] = []
    try {
      const detailsRes = await fetchInvoiceDetails(salesFilter, 1, 500)
      completeInvoiceDetails = detailsRes.items
    } catch (err) {
      console.error('Failed to fetch full invoice details for export:', err)
      completeInvoiceDetails = invoiceDetailsData?.items ?? []
    }

    return {
      filterDescription: filterDesc,
      filterGroupPriceLabel: groupPriceLabel,
      filterCategoryLabel: categoryLabel,
      filterProductLabel: productLabel,
      filterCustomerLabel: customerLabel,
      filterSearchLabel: searchLabel,
      overviewData,
      summaryData,
      topProductsData,
      topCustomersData,
      flowData,
      invoiceDetails: completeInvoiceDetails,
      lowStockData,
    }
  }

  const handleExportExcel = async () => {
    setExportAnchorEl(null)
    if (!hasReportData) return
    setIsExporting(true)
    try {
      const exportData = await buildExportData()
      await exportReportsToExcel(exportData)
      setToastState({ open: true, message: 'Đã xuất báo cáo Excel thành công.', severity: 'success' })
    } catch (err) {
      console.error(err)
      setToastState({ open: true, message: 'Lỗi khi xuất file Excel. Vui lòng thử lại.', severity: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPdf = async () => {
    setExportAnchorEl(null)
    if (!hasReportData) return
    setIsExporting(true)
    try {
      const exportData = await buildExportData()
      await exportReportsToPdf(exportData)
      setToastState({ open: true, message: 'Đã xuất báo cáo PDF thành công.', severity: 'success' })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      console.error('[Reports PDF export failed]', {
        message: err.message,
        stack: err.stack,
        filter: salesFilter,
        error,
      })

      setToastState({
        open: true,
        severity: 'error',
        message: `Không thể xuất PDF: ${err.message}`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Box sx={{ width: '100%', pb: 6 }}>
      {/* Title & Export Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#171717', mb: 0.5, letterSpacing: '-0.01em' }}>
            Thống kê &amp; Báo cáo Tổng hợp
          </Typography>
          <Typography variant="body2" sx={{ color: '#737373' }}>
            Phân tích doanh thu, sản lượng bán hàng, nhóm khách hàng, luồng xuất nhập kho và tồn kho.
          </Typography>
        </Box>

        {/* Export Button & Menu */}
        <MuiTooltip title={!hasReportData ? 'Không có dữ liệu để xuất.' : ''}>
          <span>
            <Button
              variant="contained"
              disabled={!hasReportData || isExporting}
              onClick={(e) => setExportAnchorEl(e.currentTarget)}
              startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
              endIcon={<ChevronDown size={16} />}
              sx={{
                bgcolor: '#1e293b',
                '&:hover': { bgcolor: '#0f172a' },
                height: 38,
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
              }}
            >
              {isExporting ? 'Đang tạo báo cáo...' : 'Xuất báo cáo'}
            </Button>
          </span>
        </MuiTooltip>

        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => setExportAnchorEl(null)}
          PaperProps={{ sx: { borderRadius: '6px', minWidth: 180, mt: 0.5, boxShadow: 3 } }}
        >
          <MenuItem onClick={handleExportPdf} sx={{ gap: 1.5, py: 1 }}>
            <FileText size={16} color="#e11d48" />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Xuất PDF
            </Typography>
          </MenuItem>
          <MenuItem onClick={handleExportExcel} sx={{ gap: 1.5, py: 1 }}>
            <FileSpreadsheet size={16} color="#15803d" />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Xuất Excel (.xlsx)
            </Typography>
          </MenuItem>
        </Menu>
      </Box>

      {/* Toast Notification */}
      <Snackbar
        open={isExporting}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 2 }}
      >
        <Alert
          icon={<CircularProgress size={22} color="inherit" />}
          severity="info"
          variant="filled"
          sx={{
            minWidth: 360,
            alignItems: 'center',
            borderRadius: '8px',
            boxShadow: 6,
            '& .MuiAlert-message': { py: 0.5 },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Đang tạo file báo cáo…
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
            Vui lòng không đóng hoặc tải lại trang.
          </Typography>
        </Alert>
      </Snackbar>

      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={() => setToastState({ ...toastState, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastState({ ...toastState, open: false })}
          severity={toastState.severity}
          sx={{ width: '100%', borderRadius: '6px', boxShadow: 3 }}
        >
          {toastState.message}
        </Alert>
      </Snackbar>

      {/* Global Error Banner */}
      {generalError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '6px' }}>
          {generalError}
        </Alert>
      )}

      {/* Filter Section Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3.5,
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Filter size={18} color="#2563eb" />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
            BỘ LỌC THỐNG KÊ TỔNG HỢP
          </Typography>
        </Box>

        {/* Date Presets Row */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mr: 1 }}>
            Khoảng thời gian:
          </Typography>
          <Button
            size="small"
            variant={datePreset === 'today' ? 'contained' : 'outlined'}
            onClick={() => handleSelectPreset('today')}
            sx={{ height: 30, fontSize: 12.5, textTransform: 'none', borderRadius: '5px' }}
          >
            Hôm nay
          </Button>
          <Button
            size="small"
            variant={datePreset === '7days' ? 'contained' : 'outlined'}
            onClick={() => handleSelectPreset('7days')}
            sx={{ height: 30, fontSize: 12.5, textTransform: 'none', borderRadius: '5px' }}
          >
            7 ngày
          </Button>
          <Button
            size="small"
            variant={datePreset === 'thisMonth' ? 'contained' : 'outlined'}
            onClick={() => handleSelectPreset('thisMonth')}
            sx={{ height: 30, fontSize: 12.5, textTransform: 'none', borderRadius: '5px' }}
          >
            Tháng này
          </Button>
          <Button
            size="small"
            variant={datePreset === 'lastMonth' ? 'contained' : 'outlined'}
            onClick={() => handleSelectPreset('lastMonth')}
            sx={{ height: 30, fontSize: 12.5, textTransform: 'none', borderRadius: '5px' }}
          >
            Tháng trước
          </Button>
        </Box>

        {/* Filter Controls Grid */}
        <Grid container spacing={2} alignItems="center">
          {/* From Date */}
          <Grid item xs={12} sm={6} md={3} lg={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Từ ngày"
              InputLabelProps={{ shrink: true }}
              value={fromDate}
              onChange={(e) => {
                setDatePreset('custom')
                setFromDate(e.target.value)
                setDetailsPage(1)
              }}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={12} sm={6} md={3} lg={2.5}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Đến ngày"
              InputLabelProps={{ shrink: true }}
              value={toDate}
              onChange={(e) => {
                setDatePreset('custom')
                setToDate(e.target.value)
                setDetailsPage(1)
              }}
            />
          </Grid>

          {/* Customer Group Price */}
          <Grid item xs={12} sm={6} md={3} lg={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Nhóm giá</InputLabel>
              <Select
                value={groupPrice}
                label="Nhóm giá"
                onChange={(e: SelectChangeEvent<string>) => {
                  setGroupPrice(e.target.value)
                  setDetailsPage(1)
                }}
              >
                <MenuItem value="">Tất cả nhóm</MenuItem>
                <MenuItem value="L">Giá lẻ (L)</MenuItem>
                <MenuItem value="S">Giá sỉ (S)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* GroupBy */}
          <Grid item xs={12} sm={6} md={3} lg={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Gom nhóm thời gian</InputLabel>
              <Select
                value={groupBy}
                label="Gom nhóm thời gian"
                onChange={(e: SelectChangeEvent<string>) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
              >
                <MenuItem value="day">Theo ngày</MenuItem>
                <MenuItem value="week">Theo tuần</MenuItem>
                <MenuItem value="month">Theo tháng</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Reset Filters Button */}
          <Grid item xs={12} sm={6} md={3} lg={2}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleResetFilters}
              startIcon={<RotateCcw size={14} />}
              sx={{ height: 38, borderColor: '#cbd5e1', color: '#475569' }}
            >
              Xóa bộ lọc
            </Button>
          </Grid>

          {/* Autocomplete Category */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Autocomplete
              size="small"
              options={categoryOptions}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={selectedCategory}
              onChange={(_, value) => {
                setSelectedCategory(value)
                setDetailsPage(1)
              }}
              onInputChange={(_, value) => setCategorySearchTerm(value)}
              renderInput={(params) => <TextField {...params} label="Danh mục sản phẩm" placeholder="Chọn danh mục..." />}
            />
          </Grid>

          {/* Autocomplete Product */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Autocomplete
              size="small"
              options={productOptions}
              getOptionLabel={(option) => `[${option.sku}] ${option.name}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={selectedProduct}
              onChange={(_, value) => {
                setSelectedProduct(value)
                setDetailsPage(1)
              }}
              onInputChange={(_, value) => setProductSearchTerm(value)}
              renderInput={(params) => <TextField {...params} label="Sản phẩm" placeholder="Tìm theo SKU/tên..." />}
            />
          </Grid>

          {/* Autocomplete Customer */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Autocomplete
              size="small"
              options={customerOptions}
              getOptionLabel={(option) => `${option.name}${option.phone ? ' - ' + option.phone : ''}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={selectedCustomer}
              onChange={(_, value) => {
                setSelectedCustomer(value)
                setDetailsPage(1)
              }}
              onInputChange={(_, value) => setCustomerSearchTerm(value)}
              renderInput={(params) => <TextField {...params} label="Khách hàng" placeholder="Tìm tên/SĐT..." />}
            />
          </Grid>

          {/* Keyword Search */}
          <Grid item xs={12} sm={6} md={12} lg={3}>
            <SearchField
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setDetailsPage(1)
              }}
              onClear={() => {
                setSearch('')
                setDetailsPage(1)
              }}
              placeholder="Tìm theo từ khóa (Mã HĐ, tên...)"
              width="100%"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Card 1: Doanh thu */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              borderLeft: '4px solid #2563eb',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                DOANH THU
              </Typography>
              <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: '6px', color: '#2563eb' }}>
                <DollarSign size={18} />
              </Box>
            </Box>
            {isOverviewLoading ? (
              <Skeleton width="60%" height={36} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {formatVND(overviewData?.revenue)}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Tổng tiền hóa đơn ghi nhận
            </Typography>
          </Paper>
        </Grid>

        {/* Card 2: Số hóa đơn */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              borderLeft: '4px solid #059669',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                SỐ HÓA ĐƠN
              </Typography>
              <Box sx={{ p: 1, bgcolor: '#ecfdf5', borderRadius: '6px', color: '#059669' }}>
                <FileText size={18} />
              </Box>
            </Box>
            {isOverviewLoading ? (
              <Skeleton width="40%" height={36} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {overviewData?.invoiceCount ?? 0}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Hóa đơn phát hành
            </Typography>
          </Paper>
        </Grid>

        {/* Card 3: Sản phẩm đã bán */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              borderLeft: '4px solid #d97706',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                SẢN PHẨM ĐÃ BÁN
              </Typography>
              <Box sx={{ p: 1, bgcolor: '#fffbeb', borderRadius: '6px', color: '#d97706' }}>
                <ShoppingBag size={18} />
              </Box>
            </Box>
            {isOverviewLoading ? (
              <Skeleton width="40%" height={36} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {overviewData?.unitsSold ?? 0}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Tổng số lượng đơn vị sản phẩm
            </Typography>
          </Paper>
        </Grid>

        {/* Card 4: Giá trị hóa đơn trung bình */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              borderLeft: '4px solid #7c3aed',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, fontSize: 13 }}>
                GIÁ TRỊ HĐ TRUNG BÌNH
              </Typography>
              <Box sx={{ p: 1, bgcolor: '#f5f3ff', borderRadius: '6px', color: '#7c3aed' }}>
                <TrendingUp size={18} />
              </Box>
            </Box>
            {isOverviewLoading ? (
              <Skeleton width="60%" height={36} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {formatVND(overviewData?.averageInvoiceValue)}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
              Doanh thu trung bình / Hóa đơn
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Sales Trend Chart Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChart2 size={20} color="#2563eb" />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Biểu đồ Doanh thu Theo Thời gian
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#64748b', bgcolor: '#f1f5f9', px: 1.5, py: 0.5, borderRadius: '4px' }}>
            Gom nhóm: {groupBy === 'day' ? 'Ngày' : groupBy === 'week' ? 'Tuần' : 'Tháng'}
          </Typography>
        </Box>

        {isSummaryLoading ? (
          <Skeleton variant="rectangular" width="100%" height={260} sx={{ borderRadius: '6px' }} />
        ) : summaryData && summaryData.length > 0 ? (
          <Box sx={{ pt: 2, pb: 1, width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: Math.max(summaryData.length * 48, 600), height: 260, display: 'flex', alignItems: 'flex-end', gap: 1.5, px: 2, borderBottom: '2px solid #cbd5e1' }}>
              {summaryData.map((row, idx) => {
                const heightPercent = Math.max((row.total / maxSummaryRevenue) * 85, 4)
                return (
                  <MuiTooltip
                    key={idx}
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                          Thời gian: {formatDate(row.date)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Doanh thu: {formatVND(row.total)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Số hóa đơn: {row.invoiceCount}
                        </Typography>
                      </Box>
                    }
                    arrow
                  >
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        cursor: 'pointer',
                        '&:hover .bar-inner': {
                          bgcolor: '#1d4ed8',
                        },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: 10, color: '#64748b', mb: 0.5, fontWeight: 600 }}>
                        {row.total > 0 ? (row.total >= 1000000 ? `${(row.total / 1000000).toFixed(1)}M` : `${(row.total / 1000).toFixed(0)}k`) : ''}
                      </Typography>
                      <Box
                        className="bar-inner"
                        sx={{
                          width: '100%',
                          maxWidth: 36,
                          height: `${heightPercent}%`,
                          bgcolor: '#3b82f6',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.2s ease',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 10.5,
                          color: '#475569',
                          mt: 1,
                          whiteSpace: 'nowrap',
                          transform: summaryData.length > 15 ? 'rotate(-35deg)' : 'none',
                          transformOrigin: 'top left',
                        }}
                      >
                        {formatDate(row.date)}
                      </Typography>
                    </Box>
                  </MuiTooltip>
                )
              })}
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
            <Typography variant="body2">Không có dữ liệu doanh thu trong khoảng thời gian đã chọn.</Typography>
          </Box>
        )}
      </Paper>

      {/* Two Columns Grid: Top Products & Top Customers */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Left: Top Products */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Package size={18} color="#d97706" />
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                Top Sản Phẩm Bán Chạy (Top 10)
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>SẢN PHẨM</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                      SỐ LƯỢNG
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                      DOANH THU
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isTopProductsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton height={24} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : topProductsData && topProductsData.length > 0 ? (
                    topProductsData.map((prod, idx) => (
                      <TableRow key={prod.productId || idx} hover>
                        <TableCell sx={{ fontWeight: 700, color: idx < 3 ? '#d97706' : '#64748b' }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                            {prod.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                            {prod.sku}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={prod.quantitySold}
                            size="small"
                            sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, borderRadius: '4px' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          {formatVND(prod.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        Không có dữ liệu sản phẩm bán chạy.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right: Top Customers */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              height: '100%',
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Users size={18} color="#059669" />
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                Top Khách Hàng Thân Thiết (Top 10)
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>KHÁCH HÀNG</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                      NHÓM
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                      SỐ HĐ
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                      DOANH THU
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isTopCustomersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton height={24} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : topCustomersData && topCustomersData.length > 0 ? (
                    topCustomersData.map((cust, idx) => (
                      <TableRow key={cust.customerId || idx} hover>
                        <TableCell sx={{ fontWeight: 700, color: idx < 3 ? '#059669' : '#64748b' }}>
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                            {cust.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {cust.phone || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={cust.groupPrice === 'S' ? 'Sỉ' : 'Lẻ'}
                            size="small"
                            sx={{
                              bgcolor: cust.groupPrice === 'S' ? '#dcfce7' : '#f1f5f9',
                              color: cust.groupPrice === 'S' ? '#15803d' : '#475569',
                              fontWeight: 600,
                              fontSize: 11,
                              borderRadius: '4px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {cust.invoiceCount}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          {formatVND(cust.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        Không có dữ liệu khách hàng.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Inventory Flow Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RotateCcw size={20} color="#0284c7" />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Luồng Nhập / Xuất Kho Hàng Hóa
            </Typography>
          </Box>

          {/* Flow Specific Filters */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Loại phiếu kho</InputLabel>
              <Select
                value={flowTxType}
                label="Loại phiếu kho"
                onChange={(e: SelectChangeEvent<number | ''>) => setFlowTxType(e.target.value as number | '')}
              >
                <MenuItem value="">Tất cả (Nhập &amp; Xuất)</MenuItem>
                <MenuItem value={1}>Chỉ Nhập kho</MenuItem>
                <MenuItem value={2}>Chỉ Xuất kho</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Loại mặt hàng</InputLabel>
              <Select
                value={flowItemType}
                label="Loại mặt hàng"
                onChange={(e: SelectChangeEvent<string>) => setFlowItemType(e.target.value as string)}
              >
                <MenuItem value="">Tất cả loại hàng</MenuItem>
                <MenuItem value="product">Sản phẩm</MenuItem>
                <MenuItem value="backboard">Khung tranh</MenuItem>
                <MenuItem value="material">Vật tư</MenuItem>
                <MenuItem value="sub-backboard">Khung phụ</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {isFlowLoading ? (
          <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: '6px' }} />
        ) : flowData && flowData.length > 0 ? (
          <Box sx={{ pt: 2, pb: 1, width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: Math.max(flowData.length * 56, 600), height: 240, display: 'flex', alignItems: 'flex-end', gap: 2, px: 2, borderBottom: '2px solid #cbd5e1' }}>
              {flowData.map((row, idx) => {
                const inHeightPct = Math.max((row.inQuantity / maxFlowQuantity) * 80, 2)
                const outHeightPct = Math.max((row.outQuantity / maxFlowQuantity) * 80, 2)

                return (
                  <MuiTooltip
                    key={idx}
                    title={
                      <Box sx={{ p: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                          Ngày: {formatDate(row.date)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#60a5fa', display: 'block' }}>
                          Nhập: {row.inQuantity} sp ({formatVND(row.inValue)})
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#f87171', display: 'block' }}>
                          Xuất: {row.outQuantity} sp ({formatVND(row.outValue)})
                        </Typography>
                      </Box>
                    }
                    arrow
                  >
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        cursor: 'pointer',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '85%' }}>
                        {/* Inflow Bar */}
                        {(flowTxType === '' || flowTxType === 1) && (
                          <Box
                            sx={{
                              width: 14,
                              height: `${inHeightPct}%`,
                              bgcolor: '#0284c7',
                              borderRadius: '3px 3px 0 0',
                            }}
                          />
                        )}
                        {/* Outflow Bar */}
                        {(flowTxType === '' || flowTxType === 2) && (
                          <Box
                            sx={{
                              width: 14,
                              height: `${outHeightPct}%`,
                              bgcolor: '#e11d48',
                              borderRadius: '3px 3px 0 0',
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontSize: 10, color: '#475569', mt: 1, whiteSpace: 'nowrap' }}>
                        {formatDate(row.date)}
                      </Typography>
                    </Box>
                  </MuiTooltip>
                )
              })}
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#0284c7', borderRadius: '2px' }} />
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                  Nhập kho
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, bgcolor: '#e11d48', borderRadius: '2px' }} />
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                  Xuất kho
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
            <Typography variant="body2">Không có dữ liệu luồng kho trong khoảng thời gian đã chọn.</Typography>
          </Box>
        )}
      </Paper>

      {/* Invoice Details Table Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          bgcolor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} color="#7c3aed" />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Chi Tiết Dòng Hóa Đơn Phát Hành
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Tổng số bản ghi: <strong>{invoiceDetailsData?.totalCount ?? 0}</strong>
          </Typography>
        </Box>

        <TableContainer sx={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>MÃ HÓA ĐƠN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>NGÀY TẠO</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>KHÁCH HÀNG</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>SĐT</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                  NHÓM
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>SẢN PHẨM</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                  SL
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                  ĐƠN GIÁ
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>
                  THÀNH TIỀN
                </TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>GHI CHÚ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isDetailsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={11}>
                      <Skeleton height={28} />
                    </TableCell>
                  </TableRow>
                ))
              ) : invoiceDetailsData && invoiceDetailsData.items.length > 0 ? (
                invoiceDetailsData.items.map((row, idx) => (
                  <TableRow key={`${row.invoiceId}-${row.productId}-${idx}`} hover>
                    <TableCell sx={{ fontWeight: 600, color: '#2563eb', fontSize: 12.5 }}>
                      {row.invoiceId}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, fontSize: 13 }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: 12.5, color: '#64748b' }}>{row.customerPhone || '—'}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.groupPrice === 'S' ? 'Sỉ' : 'Lẻ'}
                        size="small"
                        sx={{
                          bgcolor: row.groupPrice === 'S' ? '#dcfce7' : '#f1f5f9',
                          color: row.groupPrice === 'S' ? '#15803d' : '#475569',
                          fontWeight: 600,
                          fontSize: 11,
                          borderRadius: '4px',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                      {row.sku}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, fontSize: 13 }}>{row.productName}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {row.quantity}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12.5 }}>
                      {formatVND(row.unitPrice)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                      {formatVND(row.subtotal)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.description || '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                    Không có chi tiết dòng hóa đơn nào khớp bộ lọc.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Invoice Details Pagination Bar */}
        {invoiceDetailsData && invoiceDetailsData.totalCount > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Bản ghi mỗi trang:
              </Typography>
              <Select
                size="small"
                value={detailsPageSize}
                onChange={(e: SelectChangeEvent<number>) => {
                  setDetailsPageSize(Number(e.target.value))
                  setDetailsPage(1)
                }}
                sx={{ height: 32, fontSize: 13 }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </Box>

            <Pagination
              count={Math.ceil(invoiceDetailsData.totalCount / detailsPageSize)}
              page={detailsPage}
              onChange={(_, page) => setDetailsPage(page)}
              color="primary"
              size="small"
              shape="rounded"
            />
          </Box>
        )}
      </Paper>

      {/* Low Stock Warning Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: '#ffffff',
          border: '1px solid #fed7aa',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AlertTriangle size={20} color="#d97706" />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#92400e' }}>
            Cảnh Báo Sản Phẩm Tồn Kho Thấp (Tồn kho ≤ Ngưỡng cảnh báo)
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: 320, border: '1px solid #fed7aa', borderRadius: '6px' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#fffbeb' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#92400e' }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12, color: '#92400e' }}>TÊN SẢN PHẨM</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#92400e' }}>
                  TỒN KHO HIỆN TẠI
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12, color: '#92400e' }}>
                  NGƯỠNG CẢNH BÁO
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLowStockLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton height={24} />
                    </TableCell>
                  </TableRow>
                ))
              ) : lowStockData && lowStockData.length > 0 ? (
                lowStockData.map((row) => (
                  <TableRow key={row.productId} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#b45309' }}>
                      {row.sku}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: '#1e293b' }}>{row.name}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={row.inStock}
                        size="small"
                        sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, borderRadius: '4px' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#64748b', fontSize: 13 }}>
                      {row.warningStock}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#059669', fontWeight: 500 }}>
                    Tất cả sản phẩm hiện đều đạt ngưỡng an toàn kho.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
