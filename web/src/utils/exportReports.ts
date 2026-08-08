import * as XLSX from 'xlsx'
import html2pdf from 'html2pdf.js'
import { STORE_INFO } from '../constants/storeInfo'
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
    [STORE_INFO.name.toUpperCase()],
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

  // Create temporary container element for PDF rendering
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.style.width = '1060px' // Optimal for A4 Landscape
  container.style.backgroundColor = '#ffffff'
  container.style.color = '#1e293b'
  container.style.fontFamily = 'Inter, Roboto, sans-serif'
  container.style.padding = '24px'
  container.style.boxSizing = 'border-box'

  container.innerHTML = `
    <div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a;">${STORE_INFO.name.toUpperCase()}</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Địa chỉ: ${STORE_INFO.address}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Điện thoại: ${STORE_INFO.phoneDisplay}</p>
      </div>
      <div style="text-align: right;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #2563eb;">BÁO CÁO THỐNG KÊ TỔNG HỢP</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Thời điểm xuất: <strong>${exportTimeStr}</strong></p>
      </div>
    </div>

    <!-- Filter Info Section -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase;">Bộ lọc áp dụng:</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 12px; color: #475569;">
        <div><strong>Thời gian:</strong> ${data.filterDescription}</div>
        <div><strong>Nhóm giá:</strong> ${data.filterGroupPriceLabel}</div>
        <div><strong>Danh mục:</strong> ${data.filterCategoryLabel}</div>
        <div><strong>Sản phẩm:</strong> ${data.filterProductLabel}</div>
        <div><strong>Khách hàng:</strong> ${data.filterCustomerLabel}</div>
        <div><strong>Từ khóa:</strong> ${data.filterSearchLabel}</div>
      </div>
    </div>

    <!-- KPI Summary Section -->
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">1. CHỈ SỐ KPI TỔNG QUAN</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
        <div style="border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 6px; padding: 12px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b;">DOANH THU</div>
          <div style="font-size: 18px; font-weight: 700; color: #2563eb; margin-top: 4px;">${formatVND(data.overviewData?.revenue)}</div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 6px; padding: 12px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b;">SỐ HÓA ĐƠN</div>
          <div style="font-size: 18px; font-weight: 700; color: #059669; margin-top: 4px;">${data.overviewData?.invoiceCount ?? 0}</div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-left: 4px solid #d97706; border-radius: 6px; padding: 12px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b;">SẢN PHẨM ĐÃ BÁN</div>
          <div style="font-size: 18px; font-weight: 700; color: #d97706; margin-top: 4px;">${data.overviewData?.unitsSold ?? 0}</div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 6px; padding: 12px; background: #ffffff;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b;">GIÁ TRỊ HĐ TRUNG BÌNH</div>
          <div style="font-size: 18px; font-weight: 700; color: #7c3aed; margin-top: 4px;">${formatVND(data.overviewData?.averageInvoiceValue)}</div>
        </div>
      </div>
    </div>

    <!-- Sales Trend Table -->
    <div style="margin-bottom: 24px; page-break-inside: avoid;">
      <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #0f172a;">2. DOANH THU THEO THỜI GIAN</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Mốc thời gian</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Số hóa đơn</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Doanh thu (VND)</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.summaryData && data.summaryData.length > 0
              ? data.summaryData
                  .slice(0, 15)
                  .map(
                    (row) => `
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 6px 8px;">${row.date}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: right;">${row.invoiceCount}</td>
              <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: right; font-weight: 700;">${formatVND(row.total)}</td>
            </tr>
          `,
                  )
                  .join('')
              : '<tr><td colspan="3" style="text-align: center; padding: 12px; color: #94a3b8;">Không có dữ liệu</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <!-- Side by Side Tables: Top Products & Top Customers -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; page-break-inside: avoid;">
      <div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #d97706;">3. TOP SẢN PHẨM BÁN CHẠY</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background-color: #fef3c7;">
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: center;">#</th>
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: left;">Sản phẩm</th>
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: right;">SL</th>
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: right;">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.topProductsData && data.topProductsData.length > 0
                ? data.topProductsData
                    .map(
                      (p, i) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-weight: 700; color: #d97706;">${i + 1}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">[${p.sku}] ${p.name}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right; font-weight: 700;">${p.quantitySold}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right; font-weight: 700;">${formatVND(p.revenue)}</td>
              </tr>
            `,
                    )
                    .join('')
                : '<tr><td colspan="4" style="text-align: center; padding: 10px; color: #94a3b8;">Không có dữ liệu</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #059669;">4. TOP KHÁCH HÀNG THÂN THIẾT</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background-color: #dcfce7;">
              <th style="border: 1px solid #bbf7d0; padding: 6px; text-align: center;">#</th>
              <th style="border: 1px solid #bbf7d0; padding: 6px; text-align: left;">Khách hàng</th>
              <th style="border: 1px solid #bbf7d0; padding: 6px; text-align: center;">Nhóm</th>
              <th style="border: 1px solid #bbf7d0; padding: 6px; text-align: right;">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.topCustomersData && data.topCustomersData.length > 0
                ? data.topCustomersData
                    .map(
                      (c, i) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center; font-weight: 700; color: #059669;">${i + 1}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${c.name} (${c.phone || '—'})</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: center;">${c.groupPrice === 'S' ? 'Sỉ' : 'Lẻ'}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right; font-weight: 700;">${formatVND(c.revenue)}</td>
              </tr>
            `,
                    )
                    .join('')
                : '<tr><td colspan="4" style="text-align: center; padding: 10px; color: #94a3b8;">Không có dữ liệu</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invoice Details Table -->
    ${
      data.invoiceDetails && data.invoiceDetails.length > 0
        ? `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #7c3aed;">5. CHI TIẾT DÒNG HÓA ĐƠN (${data.invoiceDetails.length} bản ghi)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f3e8ff;">
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: left;">Mã HĐ</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: left;">Ngày tạo</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: left;">Khách hàng</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: left;">SKU</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: left;">Sản phẩm</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: right;">SL</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: right;">Đơn giá</th>
              <th style="border: 1px solid #e9d5ff; padding: 6px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${data.invoiceDetails
              .slice(0, 40)
              .map(
                (row) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 600; color: #2563eb;">${row.invoiceId}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${formatDateTime(row.createdAt)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${row.customerName}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${row.sku}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${row.productName}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right; font-weight: 700;">${row.quantity}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right;">${formatVND(row.unitPrice)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right; font-weight: 700;">${formatVND(row.subtotal)}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
        : ''
    }

    <!-- Low Stock Table -->
    ${
      data.lowStockData && data.lowStockData.length > 0
        ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #b45309;">6. CẢNH BÁO TỒN KHO THẤP</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #fffbeb;">
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: left;">Mã SKU</th>
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: left;">Tên sản phẩm</th>
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: right;">Tồn kho hiện tại</th>
              <th style="border: 1px solid #fde68a; padding: 6px; text-align: right;">Ngưỡng cảnh báo</th>
            </tr>
          </thead>
          <tbody>
            ${data.lowStockData
              .map(
                (row) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 5px; font-weight: 600; color: #b45309;">${row.sku}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px;">${row.name}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right; font-weight: 700; color: #dc2626;">${row.inStock}</td>
                <td style="border: 1px solid #e2e8f0; padding: 5px; text-align: right;">${row.warningStock}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
        : ''
    }
  `

  document.body.appendChild(container)

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: fileName,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }

  try {
    await html2pdf().from(container).set(opt).save()
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}
