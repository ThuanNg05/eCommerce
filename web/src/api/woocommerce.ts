import { apiGet, apiPost, apiPut } from './client'

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

export interface ConfirmWooCommerceOrderRequest {
  customerId: number
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

export function syncWooCommerceOrders(): Promise<WooCommerceSyncResult> {
  return apiPost<WooCommerceSyncResult>('/api/woocommerce/orders/sync')
}

export function confirmWooCommerceOrder(
  wooCommerceOrderId: number,
  req: ConfirmWooCommerceOrderRequest,
): Promise<WooCommerceOrderDto> {
  return apiPost<WooCommerceOrderDto>(`/api/woocommerce/orders/${wooCommerceOrderId}/confirm`, req)
}

export function linkWooCommerceProduct(
  wooCommerceProductId: number,
  req: LinkWooCommerceProductRequest,
): Promise<WooCommerceProductLinkDto> {
  return apiPut<WooCommerceProductLinkDto>(`/api/woocommerce/products/${wooCommerceProductId}/link`, req)
}

export function syncWooCommerceCatalog(): Promise<WooCommerceCatalogSyncResult> {
  return apiPost<WooCommerceCatalogSyncResult>('/api/woocommerce/products/sync')
}
