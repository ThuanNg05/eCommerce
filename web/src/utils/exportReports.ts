import * as XLSX from 'xlsx'
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

export const exportReportsToExcel = async (data: ExportReportsData) => {
  const now = new Date()
  const exportTimeStr = formatDateTime(now.toISOString())
  const fileName = getReportFileName(data.filterDescription, 'xlsx')

  const wb = XLSX.utils.book_new()

  const setAutoColumnWidths = (ws: XLSX.WorkSheet, dataRows: any[][]) => {
    if (!dataRows || dataRows.length === 0) return
    const colWidths = dataRows[0].map((_, colIdx) => {
      const maxLen = Math.max(
        ...dataRows.map((row) => {
          const val = row[colIdx]
          return val != null ? String(val).length : 0
        }),
      )
      return { wch: Math.max(maxLen + 4, 14) }
    })
    ws['!cols'] = colWidths
  }

  // 1. Sheet: Tổng quan
  const overviewAoa = [
    ['BÁO CÁO THỐNG KÊ TỔNG HỢP KINH DOANH & KHO HÀNG'],
    [],
    ['I. THÔNG TIN BỘ LỌC ÁP DỤNG'],
    ['Khoảng thời gian / Preset:', data.filterDescription],
    ['Nhóm giá khách hàng:', data.filterGroupPriceLabel],
    ['Danh mục sản phẩm:', data.filterCategoryLabel],
    ['Sản phẩm:', data.filterProductLabel],
    ['Khách hàng:', data.filterCustomerLabel],
    ['Từ khóa tìm kiếm:', data.filterSearchLabel],
    ['Thời điểm xuất báo cáo:', exportTimeStr],
    [],
    ['II. CHỈ SỐ KPI TỔNG QUAN'],
    ['Chỉ số thống kê', 'Giá trị'],
    ['Tổng doanh thu (VND)', data.overviewData?.revenue ?? 0],
    ['Số hóa đơn phát hành', data.overviewData?.invoiceCount ?? 0],
    ['Sản phẩm đã bán (đơn vị)', data.overviewData?.unitsSold ?? 0],
    ['Giá trị hóa đơn trung bình (VND)', data.overviewData?.averageInvoiceValue ?? 0],
  ]
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewAoa)
  setAutoColumnWidths(wsOverview, overviewAoa)
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng quan')

  // 2. Sheet: Doanh thu
  const summaryAoa = [
    ['Mốc thời gian', 'Số hóa đơn phát hành', 'Tổng doanh thu (VND)'],
    ...(data.summaryData ?? []).map((r) => [r.date, r.invoiceCount, r.total]),
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa)
  setAutoColumnWidths(wsSummary, summaryAoa)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Doanh thu')

  // 3. Sheet: Top sản phẩm
  const topProductsAoa = [
    ['Xếp hạng', 'Mã SKU', 'Tên sản phẩm', 'Số lượng đã bán', 'Doanh thu (VND)'],
    ...(data.topProductsData ?? []).map((r, i) => [i + 1, r.sku, r.name, r.quantitySold, r.revenue]),
  ]
  const wsTopProducts = XLSX.utils.aoa_to_sheet(topProductsAoa)
  setAutoColumnWidths(wsTopProducts, topProductsAoa)
  XLSX.utils.book_append_sheet(wb, wsTopProducts, 'Top sản phẩm')

  // 4. Sheet: Top khách hàng
  const topCustomersAoa = [
    ['Xếp hạng', 'Tên khách hàng', 'Số điện thoại', 'Nhóm giá', 'Số hóa đơn', 'Số sản phẩm mua', 'Doanh thu (VND)'],
    ...(data.topCustomersData ?? []).map((r, i) => [
      i + 1,
      r.name,
      r.phone || '—',
      r.groupPrice === 'S' ? 'Giá sỉ (S)' : 'Giá lẻ (L)',
      r.invoiceCount,
      r.unitsSold,
      r.revenue,
    ]),
  ]
  const wsTopCustomers = XLSX.utils.aoa_to_sheet(topCustomersAoa)
  setAutoColumnWidths(wsTopCustomers, topCustomersAoa)
  XLSX.utils.book_append_sheet(wb, wsTopCustomers, 'Top khách hàng')

  // 5. Sheet: Nhập xuất kho
  const flowAoa = [
    ['Ngày giao dịch', 'Số lượng nhập', 'Giá trị nhập (VND)', 'Số lượng xuất', 'Giá trị xuất (VND)'],
    ...(data.flowData ?? []).map((r) => [r.date, r.inQuantity, r.inValue, r.outQuantity, r.outValue]),
  ]
  const wsFlow = XLSX.utils.aoa_to_sheet(flowAoa)
  setAutoColumnWidths(wsFlow, flowAoa)
  XLSX.utils.book_append_sheet(wb, wsFlow, 'Nhập xuất kho')

  // 6. Sheet: Chi tiết hóa đơn
  const detailsAoa = [
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
    ...(data.invoiceDetails ?? []).map((r) => [
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
  ]
  const wsDetails = XLSX.utils.aoa_to_sheet(detailsAoa)
  setAutoColumnWidths(wsDetails, detailsAoa)
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Chi tiết hóa đơn')

  // 7. Sheet: Tồn kho thấp
  const lowStockAoa = [
    ['Mã SKU', 'Tên sản phẩm', 'Tồn kho hiện tại', 'Ngưỡng cảnh báo'],
    ...(data.lowStockData ?? []).map((r) => [r.sku, r.name, r.inStock, r.warningStock]),
  ]
  const wsLowStock = XLSX.utils.aoa_to_sheet(lowStockAoa)
  setAutoColumnWidths(wsLowStock, lowStockAoa)
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
        0: { cellWidth: 28, font: 'Roboto', fontStyle: 'bold', textColor: [37, 99, 235] },
        1: { cellWidth: 32, font: 'Roboto', fontStyle: 'normal' },
        2: { cellWidth: 48, font: 'Roboto', fontStyle: 'normal' },
        3: { cellWidth: 28, font: 'Roboto', fontStyle: 'normal' },
        4: { cellWidth: 65, font: 'Roboto', fontStyle: 'normal' },
        5: { cellWidth: 16, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
        6: { cellWidth: 30, halign: 'right', font: 'Roboto', fontStyle: 'normal' },
        7: { cellWidth: 30, halign: 'right', font: 'Roboto', fontStyle: 'bold' },
      },
      head: [['Mã HĐ', 'Ngày tạo', 'Khách hàng', 'Mã SKU', 'Sản phẩm', 'SL', 'Đơn giá', 'Thành tiền']],
      body: invoiceRows,
      rowPageBreak: 'avoid',
    })
  }

  // Save single PDF file
  doc.save(fileName)
}
