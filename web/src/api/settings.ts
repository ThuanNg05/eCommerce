import { apiGet, apiPut } from './client'

export interface SmtpConfigDto {
  address: string
  hasPassword: boolean
  duration?: string | null
  updatedAt: string
}

export interface UpdateSmtpConfigRequest {
  address: string
  appPassword?: string | null
  duration?: string | null
}

export function fetchSmtpConfig(): Promise<SmtpConfigDto> {
  return apiGet<SmtpConfigDto>('/api/settings/smtp')
}

export function updateSmtpConfig(req: UpdateSmtpConfigRequest): Promise<SmtpConfigDto> {
  return apiPut<SmtpConfigDto>('/api/settings/smtp', req)
}
