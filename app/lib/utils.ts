import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const formatCurrency = (amount: number, currencyCode: string = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const parseCurrency = (value: string): number => {
  // Remove currency symbol, dots (thousand separator), and replace comma with dot
  const cleanValue = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleanValue) || 0
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 