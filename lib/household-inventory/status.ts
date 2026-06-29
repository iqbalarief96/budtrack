export type HouseholdStockStatus = 'AMAN' | 'MENIPIS' | 'HABIS' | 'EXPIRED' | 'MAU_EXPIRED'

export interface HouseholdStatusInput {
  quantity: number
  minimumQuantity: number
  expiredAt?: Date | string | null
  now?: Date
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getHouseholdStockStatus(input: HouseholdStatusInput): HouseholdStockStatus {
  const now = input.now ?? new Date()
  const expiredAt = input.expiredAt ? new Date(input.expiredAt) : null

  if (expiredAt && expiredAt.getTime() < startOfDay(now).getTime()) return 'EXPIRED'
  if (input.quantity <= 0) return 'HABIS'
  if (input.quantity <= input.minimumQuantity) return 'MENIPIS'
  if (expiredAt && expiredAt.getTime() <= startOfDay(addDays(now, 7)).getTime()) return 'MAU_EXPIRED'
  return 'AMAN'
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}
