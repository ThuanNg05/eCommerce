/**
 * Utility function to format any date representation to `dd/MM/yyyy`.
 *
 * Rules:
 * 1. Null / undefined / empty / invalid value -> '—'
 * 2. Date-only string 'yyyy-MM-dd' -> split directly by '-' to avoid timezone shifts
 * 3. ISO datetime string or Date object -> format to Vietnam timezone ('Asia/Ho_Chi_Minh') as 'dd/MM/yyyy'
 */
export function formatDate(value?: string | Date | number | null): string {
  if (value == null || value === '') return '—'

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '—'

    // Check for yyyy-MM-dd format (date-only)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-')
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
      }
    }
  }

  try {
    const date = typeof value === 'object' && value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) return '—'

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    const parts = formatter.formatToParts(date)
    const day = parts.find((p) => p.type === 'day')?.value
    const month = parts.find((p) => p.type === 'month')?.value
    const year = parts.find((p) => p.type === 'year')?.value

    if (day && month && year) {
      return `${day}/${month}/${year}`
    }
    return '—'
  } catch {
    return '—'
  }
}
