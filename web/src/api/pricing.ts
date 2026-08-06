import { apiGet, apiPut } from './client'

export interface RateCardDto {
  prKieng: number
  prNhL: number
  prNhN: number
  prGL: number
  prGN: number
  prDL: number
  prBack: number
  prLua: number
  prKT: number
  prOc: number
  prNhom: number
  pr7F: number
  pr2D: number
  prDecal: number
  updatedAt: string
}

export interface UpdateRateCardRequest {
  prKieng: number
  prNhL: number
  prNhN: number
  prGL: number
  prGN: number
  prDL: number
  prBack: number
  prLua: number
  prKT: number
  prOc: number
  prNhom: number
  pr7F: number
  pr2D: number
  prDecal: number
}

export interface ProductComponentDto {
  productId: number
  wage: number
  valKieng?: number | null
  valNhL?: number | null
  valNhN?: number | null
  valGL?: number | null
  valGN?: number | null
  valDL?: number | null
  valBack?: number | null
  valLua?: number | null
  valKT?: number | null
  valOc?: number | null
  valNhom?: number | null
  val7F?: number | null
  val2D?: number | null
  valDecal?: number | null
  basePrice: number
  updatedAt: string
}

export interface UpsertProductComponentRequest {
  wage: number
  valKieng?: number | null
  valNhL?: number | null
  valNhN?: number | null
  valGL?: number | null
  valGN?: number | null
  valDL?: number | null
  valBack?: number | null
  valLua?: number | null
  valKT?: number | null
  valOc?: number | null
  valNhom?: number | null
  val7F?: number | null
  val2D?: number | null
  valDecal?: number | null
}

export function fetchRateCard(): Promise<RateCardDto> {
  return apiGet<RateCardDto>('/api/pricing/rate-card')
}

export function updateRateCard(req: UpdateRateCardRequest): Promise<RateCardDto> {
  return apiPut<RateCardDto>('/api/pricing/rate-card', req)
}

export function fetchProductComponent(productId: number): Promise<ProductComponentDto> {
  return apiGet<ProductComponentDto>(`/api/pricing/components/${productId}`)
}

export function upsertProductComponent(
  productId: number,
  req: UpsertProductComponentRequest
): Promise<ProductComponentDto> {
  return apiPut<ProductComponentDto>(`/api/pricing/components/${productId}`, req)
}
