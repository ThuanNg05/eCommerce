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

  // Create temporary isolated iframe (pure HTML/CSS environment, free from MUI/Lucide SVGs)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.width = '1120px'
  iframe.style.height = '1600px'
  iframe.style.border = 'none'
  iframe.style.zIndex = '999999'
  iframe.style.opacity = '1'
  iframe.style.pointerEvents = 'none'
  iframe.style.backgroundColor = '#ffffff'

  try {
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error('Không thể khởi tạo tài liệu HTML trong iframe để xuất PDF.')
    }

    console.log('[PDF Export Stage 1: Iframe attached]', {
      width: iframe.style.width,
      height: iframe.style.height,
    })

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${fileName}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            background-color: #ffffff;
            color: #1e293b;
            font-family: Arial, Roboto, "Helvetica Neue", sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-row {
            margin-bottom: 20px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header-title { margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; }
          .header-sub { margin: 4px 0 0 0; font-size: 12px; color: #475569; }
          .report-title { margin: 0; font-size: 20px; font-weight: 700; color: #2563eb; text-align: right; }
          .filter-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 20px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .filter-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            font-size: 12px;
            color: #475569;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 8px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            background: #ffffff;
          }
          .kpi-title { font-size: 11px; font-weight: 700; color: #64748b; }
          .kpi-val { font-size: 18px; font-weight: 700; margin-top: 4px; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 700;
            text-align: left;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .section-block {
            margin-bottom: 24px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .section-title {
            margin: 0 0 10px 0;
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <h1 class="header-title">${STORE_INFO.name.toUpperCase()}</h1>
            <p class="header-sub">Địa chỉ: ${STORE_INFO.address}</p>
            <p class="header-sub">Điện thoại: ${STORE_INFO.phoneDisplay}</p>
          </div>
          <div>
            <h2 class="report-title">BÁO CÁO THỐNG KÊ TỔNG HỢP</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; text-align: right;">Thời điểm xuất: <strong>${exportTimeStr}</strong></p>
          </div>
        </div>

        <div class="filter-box">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase;">Bộ lọc áp dụng:</h3>
          <div class="filter-grid">
            <div><strong>Thời gian:</strong> ${data.filterDescription}</div>
            <div><strong>Nhóm giá:</strong> ${data.filterGroupPriceLabel}</div>
            <div><strong>Danh mục:</strong> ${data.filterCategoryLabel}</div>
            <div><strong>Sản phẩm:</strong> ${data.filterProductLabel}</div>
            <div><strong>Khách hàng:</strong> ${data.filterCustomerLabel}</div>
            <div><strong>Từ khóa:</strong> ${data.filterSearchLabel}</div>
          </div>
        </div>

        <div class="section-block">
          <h3 class="section-title">1. CHỈ SỐ KPI TỔNG QUAN</h3>
          <div class="kpi-grid">
            <div class="kpi-card" style="border-left: 4px solid #2563eb;">
              <div class="kpi-title">DOANH THU</div>
              <div class="kpi-val" style="color: #2563eb;">${formatVND(data.overviewData?.revenue)}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #059669;">
              <div class="kpi-title">SỐ HÓA ĐƠN</div>
              <div class="kpi-val" style="color: #059669;">${data.overviewData?.invoiceCount ?? 0}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #d97706;">
              <div class="kpi-title">SẢN PHẨM ĐÃ BÁN</div>
              <div class="kpi-val" style="color: #d97706;">${data.overviewData?.unitsSold ?? 0}</div>
            </div>
            <div class="kpi-card" style="border-left: 4px solid #7c3aed;">
              <div class="kpi-title">GIÁ TRỊ HĐ TRUNG BÌNH</div>
              <div class="kpi-val" style="color: #7c3aed;">${formatVND(data.overviewData?.averageInvoiceValue)}</div>
            </div>
          </div>
        </div>

        <div class="section-block">
          <h3 class="section-title">2. DOANH THU THEO THỜI GIAN</h3>
          <table>
            <thead>
              <tr>
                <th>Mốc thời gian</th>
                <th class="text-right">Số hóa đơn</th>
                <th class="text-right">Doanh thu (VND)</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.summaryData && data.summaryData.length > 0
                  ? data.summaryData
                      .map(
                        (row) => `
                <tr>
                  <td>${row.date}</td>
                  <td class="text-right">${row.invoiceCount}</td>
                  <td class="text-right font-bold">${formatVND(row.total)}</td>
                </tr>
              `,
                      )
                      .join('')
                  : '<tr><td colspan="3" class="text-center" style="color: #94a3b8; padding: 12px;">Không có dữ liệu</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="section-block">
          <div>
            <h3 class="section-title" style="color: #d97706;">3. TOP SẢN PHẨM BÁN CHẠY</h3>
            <table>
              <thead>
                <tr style="background-color: #fef3c7;">
                  <th class="text-center">#</th>
                  <th>Sản phẩm</th>
                  <th class="text-right">SL</th>
                  <th class="text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.topProductsData && data.topProductsData.length > 0
                    ? data.topProductsData
                        .map(
                          (p, i) => `
                  <tr>
                    <td class="text-center font-bold" style="color: #d97706;">${i + 1}</td>
                    <td>[${p.sku}] ${p.name}</td>
                    <td class="text-right font-bold">${p.quantitySold}</td>
                    <td class="text-right font-bold">${formatVND(p.revenue)}</td>
                  </tr>
                `,
                        )
                        .join('')
                    : '<tr><td colspan="4" class="text-center" style="color: #94a3b8; padding: 10px;">Không có dữ liệu</td></tr>'
                }
              </tbody>
            </table>
          </div>

          <div>
            <h3 class="section-title" style="color: #059669;">4. TOP KHÁCH HÀNG THÂN THIẾT</h3>
            <table>
              <thead>
                <tr style="background-color: #dcfce7;">
                  <th class="text-center">#</th>
                  <th>Khách hàng</th>
                  <th class="text-center">Nhóm</th>
                  <th class="text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.topCustomersData && data.topCustomersData.length > 0
                    ? data.topCustomersData
                        .map(
                          (c, i) => `
                  <tr>
                    <td class="text-center font-bold" style="color: #059669;">${i + 1}</td>
                    <td>${c.name} (${c.phone || '—'})</td>
                    <td class="text-center">${c.groupPrice === 'S' ? 'Sỉ' : 'Lẻ'}</td>
                    <td class="text-right font-bold">${formatVND(c.revenue)}</td>
                  </tr>
                `,
                        )
                        .join('')
                    : '<tr><td colspan="4" class="text-center" style="color: #94a3b8; padding: 10px;">Không có dữ liệu</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </div>

        ${
          data.flowData && data.flowData.length > 0
            ? `
          <div class="section-block">
            <h3 class="section-title" style="color: #0284c7;">5. LUỒNG NHẬP XUẤT KHO HÀNG HÓA</h3>
            <table>
              <thead>
                <tr style="background-color: #e0f2fe;">
                  <th>Ngày giao dịch</th>
                  <th class="text-right">Số lượng nhập</th>
                  <th class="text-right">Giá trị nhập</th>
                  <th class="text-right">Số lượng xuất</th>
                  <th class="text-right">Giá trị xuất</th>
                </tr>
              </thead>
              <tbody>
                ${data.flowData
                  .map(
                    (row) => `
                  <tr>
                    <td>${row.date}</td>
                    <td class="text-right font-bold" style="color: #0284c7;">${row.inQuantity}</td>
                    <td class="text-right">${formatVND(row.inValue)}</td>
                    <td class="text-right font-bold" style="color: #e11d48;">${row.outQuantity}</td>
                    <td class="text-right">${formatVND(row.outValue)}</td>
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

        ${
          data.invoiceDetails && data.invoiceDetails.length > 0
            ? `
          <div class="section-block">
            <h3 class="section-title" style="color: #7c3aed;">6. CHI TIẾT DÒNG HÓA ĐƠN (${data.invoiceDetails.length} bản ghi)</h3>
            <table>
              <thead>
                <tr style="background-color: #f3e8ff;">
                  <th>Mã HĐ</th>
                  <th>Ngày tạo</th>
                  <th>Khách hàng</th>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th class="text-right">SL</th>
                  <th class="text-right">Đơn giá</th>
                  <th class="text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${data.invoiceDetails
                  .map(
                    (row) => `
                  <tr>
                    <td class="font-bold" style="color: #2563eb;">${row.invoiceId}</td>
                    <td>${formatDateTime(row.createdAt)}</td>
                    <td>${row.customerName}</td>
                    <td>${row.sku}</td>
                    <td>${row.productName}</td>
                    <td class="text-right font-bold">${row.quantity}</td>
                    <td class="text-right">${formatVND(row.unitPrice)}</td>
                    <td class="text-right font-bold">${formatVND(row.subtotal)}</td>
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

        ${
          data.lowStockData && data.lowStockData.length > 0
            ? `
          <div class="section-block">
            <h3 class="section-title" style="color: #b45309;">7. CẢNH BÁO TỒN KHO THẤP</h3>
            <table>
              <thead>
                <tr style="background-color: #fffbeb;">
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th class="text-right">Tồn kho hiện tại</th>
                  <th class="text-right">Ngưỡng cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                ${data.lowStockData
                  .map(
                    (row) => `
                  <tr>
                    <td class="font-bold" style="color: #b45309;">${row.sku}</td>
                    <td>${row.name}</td>
                    <td class="text-right font-bold" style="color: #dc2626;">${row.inStock}</td>
                    <td class="text-right">${row.warningStock}</td>
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
      </body>
      </html>
    `

    iframeDoc.open()
    iframeDoc.write(reportHtml)
    iframeDoc.close()

    // Wait for iframe document ready and layout stabilization
    await new Promise<void>((resolve) => {
      if (iframeDoc.readyState === 'complete') {
        resolve()
      } else {
        iframe.onload = () => resolve()
      }
    })

    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      try {
        await iframeDoc.fonts.ready
      } catch {
        // Fallback ignore font load error
      }
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    await new Promise((resolve) => setTimeout(resolve, 150))

    const bodyElem = iframeDoc.body
    const bodyRect = bodyElem.getBoundingClientRect()
    const innerTextLen = bodyElem.innerText ? bodyElem.innerText.trim().length : 0

    console.log('[PDF Export Stage 2: Iframe content ready]', {
      rect: { width: bodyRect.width, height: bodyRect.height },
      scrollWidth: bodyElem.scrollWidth,
      scrollHeight: bodyElem.scrollHeight,
      innerTextLength: innerTextLen,
    })

    if (bodyRect.width <= 0 || bodyElem.scrollHeight <= 0 || innerTextLen === 0) {
      throw new Error(
        `Nội dung báo cáo trong iframe không có kích thước hợp lệ (${bodyRect.width}x${bodyElem.scrollHeight}) hoặc bị rỗng.`,
      )
    }

    // Set height of iframe dynamically to match scrollHeight
    iframe.style.height = `${Math.max(bodyElem.scrollHeight + 50, 1200)}px`

    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: fileName,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1120,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
      pagebreak: { mode: ['css', 'legacy'] },
    }

    // Render canvas from iframeDoc.body (pure HTML/CSS DOM, completely isolated from app SVGs)
    const worker = html2pdf().from(iframeDoc.body).set(opt).toCanvas()
    const canvas = (await worker.get('canvas')) as HTMLCanvasElement | null

    console.log('[PDF Export Stage 3: Canvas generated]', {
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
    })

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error(`Không thể tạo hình ảnh canvas cho PDF từ iframe (kích thước: ${canvas?.width ?? 0}x${canvas?.height ?? 0}).`)
    }

    console.log('[PDF Export Stage 4: PDF saved]', fileName)
    await worker.toPdf().save()
  } finally {
    if (iframe && document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
  }
}
