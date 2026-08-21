import { apiGet, apiPost, apiPut, apiDelete } from './client'

export interface WooCommerceOrderLineDto {
  wooCommerceOrderItemId: number
  wooCommerceProductId: number | null
  wooCommerceVariationId: number | null
  productId: number | null
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  availableStock: number | null
  availability: 'available' | 'insufficient' | 'unmapped' | string
  customerNote?: string | null
  note?: string | null
}

export interface WooCommerceOrderDto {
  wooCommerceOrderId: number
  orderNumber: string
  status: string
  currency: string | null
  total: number
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  shippingAddress: string | null
  sourceCreatedAt: string | null
  sourceUpdatedAt: string | null
  confirmedInvoiceId: string | null
  confirmedAt: string | null
  availability: 'ready' | 'insufficient_stock' | 'unmapped' | 'not_eligible' | string
  availabilityLabel: string
  lines: WooCommerceOrderLineDto[]
  customerNote?: string | null
  note?: string | null
}

export interface WooCommerceProductLinkDto {
  productId: number
  wooCommerceProductId: number
  wooCommerceVariationId: number | null
}

export interface LinkWooCommerceProductRequest {
  productId: number
  wooCommerceVariationId?: number | null
}

export interface LinkWarehouseProductRequest {
  productId: number
}

export interface LinkWarehouseCategoryRequest {
  categoryId: number
}

export interface WooCommerceCategoryLinkDto {
  categoryId: number
  wooCommerceCategoryId: number
}


export interface ConfirmWooCommerceOrderRequest {
  customerId: number
}

export type WooCommerceOrderStatus =
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'draft'

export interface UpdateWooCommerceOrderStatusRequest {
  status: WooCommerceOrderStatus | string
  reasonCode?: string | null
  note?: string | null
}

export interface WooCommerceOrderStatusReasonDto {
  code: string
  targetStatus: string
  label: string
}

export interface WooCommerceSyncResult {
  importedOrders: number
  importedProducts: number
  completedAt: string
}

export interface WooCommerceCatalogSyncResult {
  updatedProducts: number
  completedAt: string
}

export function fetchWooCommerceOrders(
  page = 1,
  pageSize = 50,
  status?: string,
): Promise<WooCommerceOrderDto[]> {
  const q = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() })
  if (status && status !== 'all') {
    q.set('status', status)
  }
  return apiGet<WooCommerceOrderDto[]>(`/api/woocommerce/orders?${q.toString()}`)
}

export function fetchWooCommerceOrderById(
  wooCommerceOrderId: number,
): Promise<WooCommerceOrderDto> {
  return apiGet<WooCommerceOrderDto>(`/api/woocommerce/orders/${wooCommerceOrderId}`)
}

export function fetchWooCommerceOrderStatusReasons(
  status?: string,
): Promise<WooCommerceOrderStatusReasonDto[]> {
  const q = new URLSearchParams()
  if (status && status !== 'all') {
    q.set('status', status)
  }
  const queryStr = q.toString() ? `?${q.toString()}` : ''
  return apiGet<WooCommerceOrderStatusReasonDto[]>(`/api/woocommerce/orders/status-reasons${queryStr}`)
}

export function syncWooCommerceOrders(): Promise<WooCommerceSyncResult> {
  return apiPost<WooCommerceSyncResult>('/api/woocommerce/orders/sync')
}

export function confirmWooCommerceOrder(
  wooCommerceOrderId: number,
  req: ConfirmWooCommerceOrderRequest,
): Promise<WooCommerceOrderDto> {
  return apiPost<WooCommerceOrderDto>(`/api/woocommerce/orders/${wooCommerceOrderId}/confirm`, req)
}

export function updateWooCommerceOrderStatus(
  wooCommerceOrderId: number,
  req: UpdateWooCommerceOrderStatusRequest,
): Promise<WooCommerceOrderDto> {
  return apiPut<WooCommerceOrderDto>(`/api/woocommerce/orders/${wooCommerceOrderId}/status`, req)
}

export function linkWooCommerceProduct(
  wooCommerceProductId: number,
  req: LinkWooCommerceProductRequest,
): Promise<WooCommerceProductLinkDto> {
  return apiPut<WooCommerceProductLinkDto>(`/api/woocommerce/products/${wooCommerceProductId}/link`, req)
}

export function publishAndLinkWarehouseProduct(
  productId: number,
): Promise<WooCommerceProductLinkDto> {
  return apiPost<WooCommerceProductLinkDto>('/api/woocommerce/products/publish-link', { productId })
}

export function publishAndLinkWarehouseCategory(
  categoryId: number,
): Promise<WooCommerceCategoryLinkDto> {
  return apiPost<WooCommerceCategoryLinkDto>('/api/woocommerce/categories/publish-link', { categoryId })
}

export function fetchCategoryLink(
  categoryId: number,
): Promise<WooCommerceCategoryLinkDto> {
  return apiGet<WooCommerceCategoryLinkDto>(`/api/woocommerce/categories/${categoryId}/link`)
}

export function syncWooCommerceCatalog(): Promise<WooCommerceCatalogSyncResult> {

  return apiPost<WooCommerceCatalogSyncResult>('/api/woocommerce/products/sync')
}

export function fetchProductLink(productId: number): Promise<WooCommerceProductLinkDto> {
  return apiGet<WooCommerceProductLinkDto>(`/api/woocommerce/products/${productId}/link`)
}

export function unlinkProduct(productId: number): Promise<void> {
  return apiDelete<void>(`/api/woocommerce/products/${productId}/link`)
}
