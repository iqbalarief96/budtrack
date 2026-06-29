export type HouseholdStatus = 'AMAN' | 'MENIPIS' | 'HABIS' | 'EXPIRED' | 'MAU_EXPIRED'

export interface HouseholdCategory {
  id: string
  name: string
}

export interface HouseholdLocation {
  id: string
  name: string
}

export interface HouseholdItem {
  id: string
  name: string
  barcode?: string | null
  quantity: number
  unit: string
  minimumQuantity: number
  expiredAt?: string | null
  notes?: string | null
  status: HouseholdStatus
  needsShopping: boolean
  category?: HouseholdCategory | null
  location?: HouseholdLocation | null
}

export interface ShoppingAutoItem {
  itemId: string
  name: string
  unit: string
  quantity: number
  minimumQuantity: number
  suggestedQuantity: number
}
