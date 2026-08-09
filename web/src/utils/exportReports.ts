import * as XLSX from 'xlsx-js-style'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from '../assets/fonts/robotoFonts'
import type {
  SalesOverviewDto,
  SalesSummaryRowDto,
  TopProductDto,
  TopCustomerDto,
  InventoryFlowRowDto,
  InvoiceReportRowDto,
  LowStockItemDto,
} from '../api/reports'

export interface ExportReportsData {
  filterDescription: string
  filterGroupPriceLabel: string
  filterCategoryLabel: string
  filterProductLabel: string
  filterCustomerLabel: string
  filterSearchLabel: string
  overviewData?: SalesOverviewDto
  summaryData?: SalesSummaryRowDto[]
  topProductsData?: TopProductDto[]
  topCustomersData?: TopCustomerDto[]
  flowData?: InventoryFlowRowDto[]
  invoiceDetails?: InvoiceReportRowDto[]
  lowStockData?: LowStockItemDto[]
}

const formatVND = (amount?: number | null) => {
  if (amount == null) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
}

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

export const getReportFileName = (filterLabel: string, ext: 'xlsx' | 'pdf') => {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const todayFormatted = `${day}-${month}-${year}`

  // Sanitize filename of invalid characters: \ / : * ? " < > |
  const sanitizedFilter = filterLabel.replace(/[\\/:*?"<>|]/g, '-').trim()

  return `Báo cáo ${sanitizedFilter}_${todayFormatted}.${ext}`
}

// Styling constants for Excel export via xlsx-js-style
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
}

const BORDER_TOTAL = {
  top: { style: 'thin', color: { rgb: '475569' } },
  bottom: { style: 'double', color: { rgb: '475569' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
}

interface ColumnFormat {
  colIdx: number
  align?: 'left' | 'center' | 'right'
  bold?: boolean
  numFmt?: string
  colorRgb?: string
  wrapText?: boolean
}

const setAutoColumnWidths = (
  ws: XLSX.WorkSheet,
  dataRows: any[][],
  minColWidths?: { [key: number]: number },
  maxColWidths?: { [key: number]: number }
) => {
  if (!dataRows || dataRows.length === 0) return
  const numCols = Math.max(...dataRows.map((r) => r.length))
  const colWidths = Array.from({ length: numCols }, (_, colIdx) => {
    let maxLen = 0
    for (const row of dataRows) {
      const val = row[colIdx]
      if (val != null) {
        let strLen = String(val).length
        if (typeof val === 'number') {
          strLen = val.toLocaleString('vi-VN').length + 5
        }
        if (strLen > maxLen) maxLen = strLen
      }
    }
    const minW = minColWidths?.[colIdx] ?? 14
    const maxW = maxColWidths?.[colIdx] ?? 50
    const calculatedW = Math.max(maxLen + 4, minW)
    return { wch: Math.min(calculatedW, maxW) }
  })
  ws['!cols'] = colWidths
}

const applyTableStyles = (
  ws: XLSX.WorkSheet,
  headerRowIdx: number,
  headerBgRgb: string,
  columnFormats: ColumnFormat[],
  totalRowIdx?: number
) => {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

  for (let r = headerRowIdx; r <= range.e.r; r++) {
    const isHeader = r === headerRowIdx
    const isTotal = totalRowIdx !== undefined && r === totalRowIdx
    const dataRowOffset = r - headerRowIdx - 1
    const isZebra = !isHeader && !isTotal && dataRowOffset % 2 === 1

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      if (!ws[cellRef]) {
        ws[cellRef] = { v: '', t: 's' }
      }
      const cell = ws[cellRef]
      const colFmt = columnFormats.find((f) => f.colIdx === c)

      if (isHeader) {
        cell.s = {
          font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: headerBgRgb } },
          alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
          border: BORDER_THIN,
        }
      } else if (isTotal) {
        const numFmt = colFmt?.numFmt
        cell.s = {
          font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E3A8A' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'EFF6FF' } },
          alignment: { vertical: 'center', horizontal: colFmt?.align ?? (c === 0 ? 'left' : 'right') },
          border: BORDER_TOTAL,
          ...(numFmt ? { numFmt } : {}),
        }
        if (numFmt) cell.z = numFmt
      } else {
        const numFmt = colFmt?.numFmt
        cell.s = {
          font: {
            name: 'Segoe UI',
            sz: 10,
            bold: colFmt?.bold ?? false,
            color: colFmt?.colorRgb ? { rgb: colFmt.colorRgb } : { rgb: '0F172A' },
          },
          fill: { patternType: 'solid', fgColor: { rgb: isZebra ? 'F8FAFC' : 'FFFFFF' } },
          alignment: {
            vertical: 'center',
            horizontal: colFmt?.align ?? 'left',
            wrapText: colFmt?.wrapText ?? false,
          },
          border: BORDER_THIN,
          ...(numFmt ? { numFmt } : {}),
        }
        if (numFmt) cell.z = numFmt
      }
    }
  }
}

const setupSheetHeaderBanner = (
  ws: XLSX.WorkSheet,
  title: string,
  subtitle: string,
  numCols: number,
  headerBgRgb: string = '1E40AF',
  subtitleBgRgb: string = 'F1F5F9'
) => {
  ws['!merges'] = ws['!merges'] || []
  ws['!merges'].push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } }
  )

  // Title row (Row 0)
  for (let c = 0; c < numCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[ref]) ws[ref] = { v: c === 0 ? title : '', t: 's' }
    ws[ref].s = {
      font: { name: 'Segoe UI', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: headerBgRgb } },
      alignment: { vertical: 'center', horizontal: 'center' },
    }
  }

  // Subtitle row (Row 1)
  for (let c = 0; c < numCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: 1, c })
    if (!ws[ref]) ws[ref] = { v: c === 0 ? subtitle : '', t: 's' }
    ws[ref].s = {
      font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '334155' } },
      fill: { patternType: 'solid', fgColor: { rgb: subtitleBgRgb } },
      alignment: { vertical: 'center', horizontal: 'center' },
    }
  }
}

export const exportReportsToExcel = async (data: ExportReportsData) => {
  const now = new Date()
  const exportTimeStr = formatDateTime(now.toISOString())
  const fileName = getReportFileName(data.filterDescription, 'xlsx')

  const wb = XLSX.utils.book_new()

  const NUM_FMT_CURRENCY = '#,##0 "₫"'
  const NUM_FMT_INT = '#,##0'

  const subtitleStr = `Bộ lọc: ${data.filterDescription} | Thời điểm xuất: ${exportTimeStr}`

  // 1. Sheet: Tổng quan
  const overviewAoa = [
    ['BÁO CÁO THỐNG KÊ TỔNG HỢP KINH DOANH & KHO HÀNG', ''],
    ['', ''],
    ['I. THÔNG TIN BỘ LỌC ÁP DỤNG', ''],
    ['Khoảng thời gian / Preset:', data.filterDescription],
    ['Nhóm giá khách hàng:', data.filterGroupPriceLabel],
    ['Danh mục sản phẩm:', data.filterCategoryLabel],
    ['Sản phẩm:', data.filterProductLabel],
    ['Khách hàng:', data.filterCustomerLabel],
    ['Từ khóa tìm kiếm:', data.filterSearchLabel],
    ['Thời điểm xuất báo cáo:', exportTimeStr],
    ['', ''],
    ['II. CHỈ SỐ KPI TỔNG QUAN', ''],
    ['Chỉ số thống kê', 'Giá trị'],
    ['Tổng doanh thu (VND)', data.overviewData?.revenue ?? 0],
    ['Số hóa đơn phát hành', data.overviewData?.invoiceCount ?? 0],
    ['Sản phẩm đã bán (đơn vị)', data.overviewData?.unitsSold ?? 0],
    ['Giá trị hóa đơn trung bình (VND)', data.overviewData?.averageInvoiceValue ?? 0],
  ]

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewAoa)

  // Title styling (Row 0)
  wsOverview['A1'].s = {
    font: { name: 'Segoe UI', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
    alignment: { vertical: 'center', horizontal: 'center' },
  }
  if (!wsOverview['B1']) wsOverview['B1'] = { v: '', t: 's' }
  wsOverview['B1'].s = wsOverview['A1'].s
  wsOverview['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
  ]

  // Section Headers (Row 2 & 11)
  const sectionHeaderStyle = {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: BORDER_THIN,
  }
  wsOverview['A3'].s = sectionHeaderStyle
  wsOverview['B3'].s = sectionHeaderStyle
  wsOverview['A12'].s = sectionHeaderStyle
  wsOverview['B12'].s = sectionHeaderStyle

  // Filter Box rows (3..9)
  for (let r = 3; r <= 9; r++) {
    const aRef = XLSX.utils.encode_cell({ r, c: 0 })
    const bRef = XLSX.utils.encode_cell({ r, c: 1 })
    if (wsOverview[aRef]) {
      wsOverview[aRef].s = {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '334155' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: BORDER_THIN,
      }
    }
    if (wsOverview[bRef]) {
      wsOverview[bRef].s = {
        font: { name: 'Segoe UI', sz: 10, bold: false, color: { rgb: '0F172A' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: BORDER_THIN,
      }
    }
  }

  // KPI Header (Row 12 -> 0-indexed r=12)
  wsOverview['A13'].s = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: BORDER_THIN,
  }
  wsOverview['B13'].s = {
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
    alignment: { vertical: 'center', horizontal: 'right' },
    border: BORDER_THIN,
  }

  // KPI Rows (Row 13..16 -> 0-indexed r=13..16)
  const kpiFormats = [
    { numFmt: NUM_FMT_CURRENCY, colorRgb: '1E40AF' },
    { numFmt: NUM_FMT_INT, colorRgb: '0F172A' },
    { numFmt: NUM_FMT_INT, colorRgb: '0F172A' },
    { numFmt: NUM_FMT_CURRENCY, colorRgb: '1E40AF' },
  ]
  for (let idx = 0; idx < kpiFormats.length; idx++) {
    const r = 13 + idx
    const aRef = XLSX.utils.encode_cell({ r, c: 0 })
    const bRef = XLSX.utils.encode_cell({ r, c: 1 })
    const isZebra = idx % 2 === 1
    const fmt = kpiFormats[idx]

    if (wsOverview[aRef]) {
      wsOverview[aRef].s = {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '0F172A' } },
        fill: { patternType: 'solid', fgColor: { rgb: isZebra ? 'F8FAFC' : 'FFFFFF' } },
        alignment: { vertical: 'center', horizontal: 'left' },
        border: BORDER_THIN,
      }
    }
    if (wsOverview[bRef]) {
      wsOverview[bRef].s = {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: fmt.colorRgb } },
        fill: { patternType: 'solid', fgColor: { rgb: isZebra ? 'F8FAFC' : 'FFFFFF' } },
        alignment: { vertical: 'center', horizontal: 'right' },
        border: BORDER_THIN,
        numFmt: fmt.numFmt,
      }
      wsOverview[bRef].z = fmt.numFmt
    }
  }

  wsOverview['!rows'] = [
    { hpt: 30 }, // Title
    { hpt: 10 },
    { hpt: 22 }, // Section I
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 },
    { hpt: 10 },
    { hpt: 22 }, // Section II
    { hpt: 26 }, // KPI Header
    { hpt: 22 }, { hpt: 22 }, { hpt: 22 }, { hpt: 22 },
  ]
  wsOverview['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 13 }]
  setAutoColumnWidths(wsOverview, overviewAoa, { 0: 32, 1: 35 })
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng quan')

  // 2. Sheet: Doanh thu
  const summaryRows = data.summaryData ?? []
  const summarySumInvoices = summaryRows.reduce((sum, r) => sum + r.invoiceCount, 0)
  const summarySumTotal = summaryRows.reduce((sum, r) => sum + r.total, 0)

  const summaryAoa = [
    ['BÁO CÁO DOANH THU THEO THỜI GIAN', '', ''],
    [subtitleStr, '', ''],
    ['', '', ''],
    ['Mốc thời gian', 'Số hóa đơn phát hành', 'Tổng doanh thu (VND)'],
    ...summaryRows.map((r) => [r.date, r.invoiceCount, r.total]),
    ...(summaryRows.length > 0 ? [['TỔNG CỘNG', summarySumInvoices, summarySumTotal]] : []),
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa)
  setupSheetHeaderBanner(wsSummary, 'BÁO CÁO DOANH THU THEO THỜI GIAN', subtitleStr, 3, '1E40AF')

  const summaryCols: ColumnFormat[] = [
    { colIdx: 0, align: 'center' },
    { colIdx: 1, align: 'right', numFmt: NUM_FMT_INT },
    { colIdx: 2, align: 'right', bold: true, numFmt: NUM_FMT_CURRENCY, colorRgb: '1E40AF' },
  ]
  applyTableStyles(wsSummary, 3, '1E40AF', summaryCols, summaryRows.length > 0 ? summaryRows.length + 4 : undefined)
  wsSummary['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 12 }, { hpt: 26 }]
  wsSummary['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  setAutoColumnWidths(wsSummary, summaryAoa, { 0: 25, 1: 25, 2: 30 })
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Doanh thu')

  // 3. Sheet: Top sản phẩm
  const topProducts = data.topProductsData ?? []
  const sumProdQty = topProducts.reduce((sum, r) => sum + r.quantitySold, 0)
  const sumProdRev = topProducts.reduce((sum, r) => sum + r.revenue, 0)

  const topProductsAoa = [
    ['BÁO CÁO TOP SẢN PHẨM BÁN CHẠY', '', '', '', ''],
    [subtitleStr, '', '', '', ''],
    ['', '', '', '', ''],
    ['Xếp hạng', 'Mã SKU', 'Tên sản phẩm', 'Số lượng đã bán', 'Doanh thu (VND)'],
    ...topProducts.map((r, i) => [i + 1, r.sku, r.name, r.quantitySold, r.revenue]),
    ...(topProducts.length > 0 ? [['TỔNG CỘNG', '', '', sumProdQty, sumProdRev]] : []),
  ]
  const wsTopProducts = XLSX.utils.aoa_to_sheet(topProductsAoa)
  setupSheetHeaderBanner(wsTopProducts, 'BÁO CÁO TOP SẢN PHẨM BÁN CHẠY', subtitleStr, 5, 'D97706', 'FFFBEB')

  if (topProducts.length > 0) {
    const totalRowR = topProducts.length + 4
    if (!wsTopProducts['!merges']) wsTopProducts['!merges'] = []
    wsTopProducts['!merges'].push({ s: { r: totalRowR, c: 0 }, e: { r: totalRowR, c: 2 } })
  }
  const topProductsCols: ColumnFormat[] = [
    { colIdx: 0, align: 'center', bold: true, colorRgb: 'D97706' },
    { colIdx: 1, align: 'left' },
    { colIdx: 2, align: 'left', wrapText: true },
    { colIdx: 3, align: 'right', numFmt: NUM_FMT_INT },
    { colIdx: 4, align: 'right', bold: true, numFmt: NUM_FMT_CURRENCY, colorRgb: 'D97706' },
  ]
  applyTableStyles(wsTopProducts, 3, 'D97706', topProductsCols, topProducts.length > 0 ? topProducts.length + 4 : undefined)
  wsTopProducts['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 12 }, { hpt: 26 }]
  wsTopProducts['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  setAutoColumnWidths(wsTopProducts, topProductsAoa, { 0: 12, 1: 18, 2: 35, 3: 20, 4: 28 }, { 2: 55 })
  XLSX.utils.book_append_sheet(wb, wsTopProducts, 'Top sản phẩm')

  // 4. Sheet: Top khách hàng
  const topCustomers = data.topCustomersData ?? []
  const sumCustInvoices = topCustomers.reduce((sum, r) => sum + r.invoiceCount, 0)
  const sumCustUnits = topCustomers.reduce((sum, r) => sum + r.unitsSold, 0)
  const sumCustRev = topCustomers.reduce((sum, r) => sum + r.revenue, 0)

  const topCustomersAoa = [
    ['BÁO CÁO TOP KHÁCH HÀNG THÂN THIẾT', '', '', '', '', '', ''],
    [subtitleStr, '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['Xếp hạng', 'Tên khách hàng', 'Số điện thoại', 'Nhóm giá', 'Số hóa đơn', 'Số sản phẩm mua', 'Doanh thu (VND)'],
    ...topCustomers.map((r, i) => [
      i + 1,
      r.name,
      r.phone || '—',
      r.groupPrice === 'S' ? 'Giá sỉ (S)' : 'Giá lẻ (L)',
      r.invoiceCount,
      r.unitsSold,
      r.revenue,
    ]),
    ...(topCustomers.length > 0 ? [['TỔNG CỘNG', '', '', '', sumCustInvoices, sumCustUnits, sumCustRev]] : []),
  ]
  const wsTopCustomers = XLSX.utils.aoa_to_sheet(topCustomersAoa)
  setupSheetHeaderBanner(wsTopCustomers, 'BÁO CÁO TOP KHÁCH HÀNG THÂN THIẾT', subtitleStr, 7, '059669', 'ECFDF5')

  if (topCustomers.length > 0) {
    const totalRowR = topCustomers.length + 4
    if (!wsTopCustomers['!merges']) wsTopCustomers['!merges'] = []
    wsTopCustomers['!merges'].push({ s: { r: totalRowR, c: 0 }, e: { r: totalRowR, c: 3 } })
  }
  const topCustomersCols: ColumnFormat[] = [
    { colIdx: 0, align: 'center', bold: true, colorRgb: '059669' },
    { colIdx: 1, align: 'left', wrapText: true },
    { colIdx: 2, align: 'center' },
    { colIdx: 3, align: 'center' },
    { colIdx: 4, align: 'right', numFmt: NUM_FMT_INT },
    { colIdx: 5, align: 'right', numFmt: NUM_FMT_INT },
    { colIdx: 6, align: 'right', bold: true, numFmt: NUM_FMT_CURRENCY, colorRgb: '059669' },
  ]
  applyTableStyles(wsTopCustomers, 3, '059669', topCustomersCols, topCustomers.length > 0 ? topCustomers.length + 4 : undefined)
  wsTopCustomers['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 12 }, { hpt: 26 }]
  wsTopCustomers['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  setAutoColumnWidths(wsTopCustomers, topCustomersAoa, { 0: 12, 1: 28, 2: 18, 3: 15, 4: 16, 5: 18, 6: 28 }, { 1: 50 })
  XLSX.utils.book_append_sheet(wb, wsTopCustomers, 'Top khách hàng')

  // 5. Sheet: Nhập xuất kho
  const flowRows = data.flowData ?? []
  const sumInQty = flowRows.reduce((sum, r) => sum + r.inQuantity, 0)
  const sumInVal = flowRows.reduce((sum, r) => sum + r.inValue, 0)
  const sumOutQty = flowRows.reduce((sum, r) => sum + r.outQuantity, 0)
  const sumOutVal = flowRows.reduce((sum, r) => sum + r.outValue, 0)

  const flowAoa = [
    ['BÁO CÁO LUỒNG NHẬP XUẤT KHO HÀNG HÓA', '', '', '', ''],
    [subtitleStr, '', '', '', ''],
    ['', '', '', '', ''],
    ['Ngày giao dịch', 'Số lượng nhập', 'Giá trị nhập (VND)', 'Số lượng xuất', 'Giá trị xuất (VND)'],
    ...flowRows.map((r) => [r.date, r.inQuantity, r.inValue, r.outQuantity, r.outValue]),
    ...(flowRows.length > 0 ? [['TỔNG CỘNG', sumInQty, sumInVal, sumOutQty, sumOutVal]] : []),
  ]
  const wsFlow = XLSX.utils.aoa_to_sheet(flowAoa)
  setupSheetHeaderBanner(wsFlow, 'BÁO CÁO LUỒNG NHẬP XUẤT KHO HÀNG HÓA', subtitleStr, 5, '0284C7', 'F0F9FF')

  const flowCols: ColumnFormat[] = [
    { colIdx: 0, align: 'center' },
    { colIdx: 1, align: 'right', bold: true, numFmt: NUM_FMT_INT, colorRgb: '0284C7' },
    { colIdx: 2, align: 'right', numFmt: NUM_FMT_CURRENCY },
    { colIdx: 3, align: 'right', bold: true, numFmt: NUM_FMT_INT, colorRgb: 'E11D48' },
    { colIdx: 4, align: 'right', numFmt: NUM_FMT_CURRENCY },
  ]
  applyTableStyles(wsFlow, 3, '0284C7', flowCols, flowRows.length > 0 ? flowRows.length + 4 : undefined)
  wsFlow['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 12 }, { hpt: 26 }]
  wsFlow['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  setAutoColumnWidths(wsFlow, flowAoa, { 0: 22, 1: 18, 2: 25, 3: 18, 4: 25 })
  XLSX.utils.book_append_sheet(wb, wsFlow, 'Nhập xuất kho')

  // 6. Sheet: Chi tiết hóa đơn
  const detailsRows = data.invoiceDetails ?? []
  const sumDetailQty = detailsRows.reduce((sum, r) => sum + r.quantity, 0)
  const sumDetailSubtotal = detailsRows.reduce((sum, r) => sum + r.subtotal, 0)

  const detailsAoa = [
    ['BÁO CÁO CHI TIẾT DÒNG HÓA ĐƠN', '', '', '', '', '', '', '', '', '', ''],
    [subtitleStr, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    [
      'Mã hóa đơn',
      'Ngày tạo',
      'Khách hàng',
      'Số điện thoại',
      'Nhóm giá',
      'Mã SKU',
      'Tên sản phẩm',
      'Số lượng',
      'Đơn giá (VND)',
      'Thành tiền (VND)',
      'Ghi chú',
    ],
    ...detailsRows.map((r) => [
      r.invoiceId,
      formatDateTime(r.createdAt),
      r.customerName,
      r.customerPhone || '—',
      r.groupPrice === 'S' ? 'Giá sỉ' : 'Giá lẻ',
      r.sku,
      r.productName,
      r.quantity,
      r.unitPrice,
      r.subtotal,
      r.description || '',
    ]),
    ...(detailsRows.length > 0 ? [['TỔNG CỘNG', '', '', '', '', '', '', sumDetailQty, '', sumDetailSubtotal, '']] : []),
  ]
  const wsDetails = XLSX.utils.aoa_to_sheet(detailsAoa)
  setupSheetHeaderBanner(wsDetails, 'BÁO CÁO CHI TIẾT DÒNG HÓA ĐƠN', subtitleStr, 11, '7C3AED', 'F5F3FF')

  if (detailsRows.length > 0) {
    const totalRowR = detailsRows.length + 4
    if (!wsDetails['!merges']) wsDetails['!merges'] = []
    wsDetails['!merges'].push({ s: { r: totalRowR, c: 0 }, e: { r: totalRowR, c: 6 } })
  }
  const detailsCols: ColumnFormat[] = [
    { colIdx: 0, align: 'center', bold: true, colorRgb: '2563EB' },
    { colIdx: 1, align: 'center' },
    { colIdx: 2, align: 'left', wrapText: true },
    { colIdx: 3, align: 'center' },
    { colIdx: 4, align: 'center' },
    { colIdx: 5, align: 'left' },
    { colIdx: 6, align: 'left', wrapText: true },
    { colIdx: 7, align: 'right', bold: true, numFmt: NUM_FMT_INT },
    { colIdx: 8, align: 'right', numFmt: NUM_FMT_CURRENCY },
    { colIdx: 9, align: 'right', bold: true, numFmt: NUM_FMT_CURRENCY, colorRgb: '7C3AED' },
    { colIdx: 10, align: 'left', wrapText: true },
  ]
  applyTableStyles(wsDetails, 3, '7C3AED', detailsCols, detailsRows.length > 0 ? detailsRows.length + 4 : undefined)
  wsDetails['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 12 }, { hpt: 26 }]
  wsDetails['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  setAutoColumnWidths(wsDetails, detailsAoa, { 0: 22, 1: 22, 2: 28, 3: 16, 4: 14, 5: 18, 6: 35, 7: 14, 8: 22, 9: 25, 10: 20 }, { 2: 45, 6: 55, 10: 45 })
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Chi tiết hóa đơn')

  // 7. Sheet: Tồn kho thấp
  const lowStockRows = data.lowStockData ?? []
  const lowStockAoa = [
    ['BÁO CÁO CẢNH BÁO TỒN KHO THẤP', '', '', ''],
    [subtitleStr, '', '', ''],
    ['', '', '', ''],
    ['Mã SKU', 'Tên sản phẩm', 'Tồn kho hiện tại', 'Ngưỡng cảnh báo'],
    ...lowStockRows.map((r) => [r.sku, r.name, r.inStock, r.warningStock]),
  ]
  const wsLowStock = XLSX.utils.aoa_to_sheet(lowStockAoa)
  setupSheetHeaderBanner(wsLowStock, 'BÁO CÁO CẢNH BÁO TỒN KHO THẤP', subtitleStr, 4, 'B45309', 'FFFBEB')

  const lowStockCols: ColumnFormat[] = [
    { colIdx: 0, align: 'left', bold: true, colorRgb: 'B45309' },
    { colIdx: 1, align: 'left', wrapText: true },
    { colIdx: 2, align: 'right', bold: true, numFmt: NUM_FMT_INT, colorRgb: 'DC2626' },
    { colIdx: 3, align: 'right', numFmt: NUM_FMT_INT },
  ]
  applyTableStyles(wsLowStock, 3, 'B45309', lowStockCols)
  wsLowStock['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 12 }, { hpt: 26 }]
  wsLowStock['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  setAutoColumnWidths(wsLowStock, lowStockAoa, { 0: 20, 1: 35, 2: 20, 3: 20 }, { 1: 55 })
  XLSX.utils.book_append_sheet(wb, wsLowStock, 'Tồn kho thấp')

  // Export file
  XLSX.writeFile(wb, fileName)
}

export const exportReportsToPdf = async (data: ExportReportsData) => {
  const now = new Date()
  const exportTimeStr = formatDateTime(now.toISOString())
  const fileName = getReportFileName(data.filterDescription, 'pdf')

  // Initialize jsPDF document in portrait A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Register Roboto Regular & Bold fonts under the exact same family name 'Roboto'
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64)

  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

  // Set default font family for the entire document
  doc.setFont('Roboto', 'normal')

  let currentY = 12

  const checkSpace = (neededMm: number) => {
    const pageHeight = doc.internal.pageSize.height
    if (currentY + neededMm > pageHeight - 12) {
      doc.addPage()
      currentY = 12
      doc.setFont('Roboto', 'normal')
    }
  }

  const addSectionTitle = (title: string, color: [number, number, number] = [15, 23, 42]) => {
    checkSpace(28) // Ensure title + table header + first rows stay together
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...color)
    doc.text(title, 14, currentY + 4)
    currentY += 7
  }

  // 1. Report Title & Header
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(30, 64, 175) // #1e40af
  doc.text('BÁO CÁO THỐNG KÊ TỔNG HỢP', 14, currentY + 5)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139) // #64748b
  doc.text(`Thời điểm xuất: ${exportTimeStr}`, 14, currentY + 11)

  currentY += 15

  // Header separator line
  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.4)
  doc.line(14, currentY, 196, currentY)
  currentY += 5

  // 2. Filter Box Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 8.5,
      cellPadding: 2.2,
      lineWidth: 0.15,
      lineColor: [226, 232, 240],
      textColor: [51, 65, 85],
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [248, 250, 252],
      textColor: [51, 65, 85],
      fontSize: 9,
    },
    bodyStyles: {
      font: 'Roboto',
      fontStyle: 'normal',
      textColor: [51, 65, 85],
    },
    head: [
      [
        {
          content: 'BỘ LỌC ÁP DỤNG',
          colSpan: 2,
        },
      ],
    ],
    body: [
      [`Thời gian: ${data.filterDescription}`, `Nhóm giá: ${data.filterGroupPriceLabel}`],
      [`Danh mục: ${data.filterCategoryLabel}`, `Sản phẩm: ${data.filterProductLabel}`],
      [`Khách hàng: ${data.filterCustomerLabel}`, `Từ khóa: ${data.filterSearchLabel}`],
    ],
  })

  currentY = (doc as any).lastAutoTable.finalY + 7

  // 3. Section 1: KPI Overview Table
  addSectionTitle('1. CHỈ SỐ KPI TỔNG QUAN')

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 9,
      cellPadding: 3,
      lineWidth: 0.2,
      lineColor: [180, 190, 205],
      textColor: [30, 41, 59],
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      lineWidth: 0.2,
      lineColor: [180, 190, 205],
    },
    bodyStyles: {
      font: 'Roboto',
      fontStyle: 'normal',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 90, font: 'Roboto', fontStyle: 'bold' },
      1: { cellWidth: 92, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
    },
    head: [['Chỉ số', 'Giá trị']],
    body: [
      ['Tổng doanh thu', formatVND(data.overviewData?.revenue)],
      ['Số hóa đơn phát hành', (data.overviewData?.invoiceCount ?? 0).toLocaleString('vi-VN')],
      ['Sản phẩm đã bán', (data.overviewData?.unitsSold ?? 0).toLocaleString('vi-VN')],
      ['Giá trị hóa đơn trung bình', formatVND(data.overviewData?.averageInvoiceValue)],
    ],
    rowPageBreak: 'avoid',
  })

  currentY = (doc as any).lastAutoTable.finalY + 7

  // 4. Section 2: Sales Summary
  addSectionTitle('2. DOANH THU THEO THỜI GIAN')

  const summaryRows =
    data.summaryData && data.summaryData.length > 0
      ? data.summaryData.map((r) => [r.date, r.invoiceCount.toLocaleString('vi-VN'), formatVND(r.total)])
      : [['Không có dữ liệu', '', '']]

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 8.5,
      cellPadding: 2.8,
      lineWidth: 0.2,
      lineColor: [180, 190, 205],
      textColor: [30, 41, 59],
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      lineWidth: 0.2,
      lineColor: [180, 190, 205],
    },
    bodyStyles: {
      font: 'Roboto',
      fontStyle: 'normal',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 82, font: 'Roboto', fontStyle: 'normal' },
      1: { cellWidth: 50, halign: 'right', font: 'Roboto', fontStyle: 'normal' },
      2: { cellWidth: 50, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
    },
    head: [['Mốc thời gian', 'Số hóa đơn', 'Doanh thu (VND)']],
    body: summaryRows,
    rowPageBreak: 'avoid',
  })

  currentY = (doc as any).lastAutoTable.finalY + 7

  // 5. Section 3: Top Products
  addSectionTitle('3. TOP SẢN PHẨM BÁN CHẠY', [217, 119, 6])

  const topProductRows =
    data.topProductsData && data.topProductsData.length > 0
      ? data.topProductsData.map((p, i) => [
          String(i + 1),
          `[${p.sku}] ${p.name}`,
          p.quantitySold.toLocaleString('vi-VN'),
          formatVND(p.revenue),
        ])
      : [['—', 'Không có dữ liệu', '', '']]

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 8.5,
      cellPadding: 2.8,
      lineWidth: 0.2,
      lineColor: [252, 211, 77],
      textColor: [30, 41, 59],
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [254, 243, 199],
      textColor: [146, 64, 14],
      lineWidth: 0.2,
      lineColor: [252, 211, 77],
    },
    bodyStyles: {
      font: 'Roboto',
      fontStyle: 'normal',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', font: 'Roboto', fontStyle: 'bold', textColor: [217, 119, 6] },
      1: { cellWidth: 95, font: 'Roboto', fontStyle: 'normal' },
      2: { cellWidth: 25, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
      3: { cellWidth: 50, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
    },
    head: [['#', 'Sản phẩm', 'SL', 'Doanh thu']],
    body: topProductRows,
    rowPageBreak: 'avoid',
  })

  currentY = (doc as any).lastAutoTable.finalY + 7

  // 6. Section 4: Top Customers
  addSectionTitle('4. TOP KHÁCH HÀNG THÂN THIẾT', [5, 150, 105])

  const topCustomerRows =
    data.topCustomersData && data.topCustomersData.length > 0
      ? data.topCustomersData.map((c, i) => [
          String(i + 1),
          `${c.name} (${c.phone || '—'})`,
          c.groupPrice === 'S' ? 'Sỉ' : 'Lẻ',
          formatVND(c.revenue),
        ])
      : [['—', 'Không có dữ liệu', '', '']]

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontStyle: 'normal',
      fontSize: 8.5,
      cellPadding: 2.8,
      lineWidth: 0.2,
      lineColor: [134, 239, 172],
      textColor: [30, 41, 59],
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [220, 252, 231],
      textColor: [6, 95, 70],
      lineWidth: 0.2,
      lineColor: [134, 239, 172],
    },
    bodyStyles: {
      font: 'Roboto',
      fontStyle: 'normal',
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', font: 'Roboto', fontStyle: 'bold', textColor: [5, 150, 105] },
      1: { cellWidth: 95, font: 'Roboto', fontStyle: 'normal' },
      2: { cellWidth: 25, halign: 'center', font: 'Roboto', fontStyle: 'normal' },
      3: { cellWidth: 50, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
    },
    head: [['#', 'Khách hàng', 'Nhóm', 'Doanh thu']],
    body: topCustomerRows,
    rowPageBreak: 'avoid',
  })

  currentY = (doc as any).lastAutoTable.finalY + 7

  // 7. Section 5: Inventory Flow (if present)
  if (data.flowData && data.flowData.length > 0) {
    addSectionTitle('5. LUỒNG NHẬP XUẤT KHO HÀNG HÓA', [2, 132, 199])

    const flowRows = data.flowData.map((r) => [
      r.date,
      r.inQuantity.toLocaleString('vi-VN'),
      formatVND(r.inValue),
      r.outQuantity.toLocaleString('vi-VN'),
      formatVND(r.outValue),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontStyle: 'normal',
        fontSize: 8.5,
        cellPadding: 2.8,
        lineWidth: 0.2,
        lineColor: [125, 211, 252],
        textColor: [30, 41, 59],
      },
      headStyles: {
        font: 'Roboto',
        fontStyle: 'bold',
        fillColor: [224, 242, 254],
        textColor: [7, 89, 133],
        lineWidth: 0.2,
        lineColor: [125, 211, 252],
      },
      bodyStyles: {
        font: 'Roboto',
        fontStyle: 'normal',
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 42, font: 'Roboto', fontStyle: 'normal' },
        1: { cellWidth: 30, halign: 'right', font: 'Roboto', fontStyle: 'bold', textColor: [2, 132, 199] },
        2: { cellWidth: 40, halign: 'right', font: 'Roboto', fontStyle: 'normal' },
        3: { cellWidth: 30, halign: 'right', font: 'Roboto', fontStyle: 'bold', textColor: [225, 29, 72] },
        4: { cellWidth: 40, halign: 'right', font: 'Roboto', fontStyle: 'normal' },
      },
      head: [['Ngày giao dịch', 'SL nhập', 'Giá trị nhập', 'SL xuất', 'Giá trị xuất']],
      body: flowRows,
      rowPageBreak: 'avoid',
    })

    currentY = (doc as any).lastAutoTable.finalY + 7
  }

  // 8. Section 7: Low Stock Warning (if present)
  if (data.lowStockData && data.lowStockData.length > 0) {
    addSectionTitle('7. CẢNH BÁO TỒN KHO THẤP', [180, 83, 9])

    const lowStockRows = data.lowStockData.map((r) => [
      r.sku,
      r.name,
      r.inStock.toLocaleString('vi-VN'),
      r.warningStock.toLocaleString('vi-VN'),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontStyle: 'normal',
        fontSize: 8.5,
        cellPadding: 2.8,
        lineWidth: 0.2,
        lineColor: [253, 230, 138],
        textColor: [30, 41, 59],
      },
      headStyles: {
        font: 'Roboto',
        fontStyle: 'bold',
        fillColor: [254, 243, 199],
        textColor: [146, 64, 14],
        lineWidth: 0.2,
        lineColor: [253, 230, 138],
      },
      bodyStyles: {
        font: 'Roboto',
        fontStyle: 'normal',
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 35, font: 'Roboto', fontStyle: 'bold', textColor: [180, 83, 9] },
        1: { cellWidth: 87, font: 'Roboto', fontStyle: 'normal' },
        2: { cellWidth: 30, halign: 'right', font: 'Roboto', fontStyle: 'bold', textColor: [220, 38, 38] },
        3: { cellWidth: 30, halign: 'right', font: 'Roboto', fontStyle: 'normal' },
      },
      head: [['Mã SKU', 'Tên sản phẩm', 'Tồn kho hiện tại', 'Ngưỡng cảnh báo']],
      body: lowStockRows,
      rowPageBreak: 'avoid',
    })

    currentY = (doc as any).lastAutoTable.finalY + 7
  }

  // 9. Section 6: Invoice Details (Landscape A4 Page in SAME PDF)
  if (data.invoiceDetails && data.invoiceDetails.length > 0) {
    doc.addPage('a4', 'landscape')
    doc.setFont('Roboto', 'normal')
    currentY = 12

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(124, 58, 237) // #7c3aed
    doc.text(`6. CHI TIẾT DÒNG HÓA ĐƠN (${data.invoiceDetails.length} bản ghi)`, 10, currentY + 4)
    currentY += 8

    const headers = ['Mã HĐ', 'Ngày tạo', 'Khách hàng', 'Mã SKU', 'Sản phẩm', 'SL', 'Đơn giá', 'Thành tiền']

    const invoiceRows = data.invoiceDetails.map((r) => [
      r.invoiceId,
      formatDateTime(r.createdAt),
      r.customerName,
      r.sku,
      r.productName,
      r.quantity.toLocaleString('vi-VN'),
      formatVND(r.unitPrice),
      formatVND(r.subtotal),
    ])

    // Auto-adjust column widths based on longest string in each column for Section 6
    // Landscape A4 width: 297mm - 20mm margins (10mm left/right) = 277mm available width
    const availableWidth = 277
    const fontSize = 7.5
    const cellPadding = 2
    const horizontalPadding = cellPadding * 2 // 4mm
    const buffer = 1.5 // Safety buffer in mm

    // Column indices:
    // 0: Mã HĐ, 1: Ngày tạo, 2: Khách hàng, 3: Mã SKU, 4: Sản phẩm (Priority), 5: SL, 6: Đơn giá, 7: Thành tiền
    const priorityColIdx = 4

    const minWidths: { [key: number]: number } = {
      0: 22, // Mã HĐ
      1: 26, // Ngày tạo
      2: 28, // Khách hàng
      3: 20, // Mã SKU
      4: 45, // Sản phẩm (Priority)
      5: 14, // SL
      6: 22, // Đơn giá
      7: 22, // Thành tiền
    }

    const calculatedWidths: number[] = new Array(headers.length).fill(0)

    // Calculate width for each non-priority column using longest string length in mm
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      if (colIdx === priorityColIdx) continue

      // Measure header length with bold font
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(fontSize)
      let maxTextWidth = doc.getTextWidth(headers[colIdx])

      // Measure body length with normal font
      doc.setFont('Roboto', 'normal')
      doc.setFontSize(fontSize)
      for (const row of invoiceRows) {
        const text = String(row[colIdx] ?? '')
        const w = doc.getTextWidth(text)
        if (w > maxTextWidth) {
          maxTextWidth = w
        }
      }

      const neededWidth = maxTextWidth + horizontalPadding + buffer
      const minW = minWidths[colIdx] ?? 15
      calculatedWidths[colIdx] = Math.ceil(Math.max(neededWidth, minW) * 10) / 10
    }

    // Sum width of non-priority columns
    const nonPriorityWidthSum = calculatedWidths.reduce((sum, w, idx) => (idx === priorityColIdx ? sum : sum + w), 0)

    // Allocate remaining printable page width to priority column (Product Name)
    const remainingWidth = availableWidth - nonPriorityWidthSum
    const prodMinWidth = minWidths[priorityColIdx] ?? 45
    calculatedWidths[priorityColIdx] = Math.ceil(Math.max(remainingWidth, prodMinWidth) * 10) / 10

    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontStyle: 'normal',
        fontSize: 7.5,
        cellPadding: 2,
        lineWidth: 0.2,
        lineColor: [192, 132, 252],
        textColor: [30, 41, 59],
        overflow: 'ellipsize',
      },
      headStyles: {
        font: 'Roboto',
        fontStyle: 'bold',
        fillColor: [243, 232, 255],
        textColor: [107, 33, 168],
        lineWidth: 0.2,
        lineColor: [192, 132, 252],
      },
      bodyStyles: {
        font: 'Roboto',
        fontStyle: 'normal',
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: calculatedWidths[0], font: 'Roboto', fontStyle: 'bold', textColor: [37, 99, 235] },
        1: { cellWidth: calculatedWidths[1], font: 'Roboto', fontStyle: 'normal' },
        2: { cellWidth: calculatedWidths[2], font: 'Roboto', fontStyle: 'normal' },
        3: { cellWidth: calculatedWidths[3], font: 'Roboto', fontStyle: 'normal' },
        4: { cellWidth: calculatedWidths[4], font: 'Roboto', fontStyle: 'normal' },
        5: { cellWidth: calculatedWidths[5], halign: 'right', font: 'Roboto', fontStyle: 'bold' },
        6: { cellWidth: calculatedWidths[6], halign: 'right', font: 'Roboto', fontStyle: 'normal' },
        7: { cellWidth: calculatedWidths[7], halign: 'right', font: 'Roboto', fontStyle: 'bold' },
      },
      head: [headers],
      body: invoiceRows,
      rowPageBreak: 'avoid',
    })
  }

  // Save single PDF file
  doc.save(fileName)
}
