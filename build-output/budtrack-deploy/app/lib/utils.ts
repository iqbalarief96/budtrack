import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const formatCurrency = (amount: number, abbreviated: boolean = false, currencyCode: string = 'IDR') => {
  if (abbreviated) {
    // Format in abbreviated form (e.g., Rp 10K, Rp 1.5M)
    const absAmount = Math.abs(amount);
    if (absAmount >= 1_000_000_000) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 1,
        minimumFractionDigits: 0
      }).format(amount / 1_000_000_000) + ' B';
    } else if (absAmount >= 1_000_000) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 1,
        minimumFractionDigits: 0
      }).format(amount / 1_000_000) + ' Jt';
    } else if (absAmount >= 1_000) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 1,
        minimumFractionDigits: 0
      }).format(amount / 1_000) + ' Rb';
    }
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export const parseCurrency = (value: string): number => {
  // Remove currency symbol, dots (thousand separator), and replace comma with dot
  const cleanValue = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleanValue) || 0
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}; 