/**
 * Savings Wallet Router
 * 
 * Automatically routes savings transactions to the correct SAVINGS wallet
 * based on the transaction description.
 */

import prisma from '@/lib/prisma'

const SAVINGS_KEYWORD_MAPPINGS = [
  { label: 'Tabungan Darurat', keywords: ['darurat', 'emergency'], icon: '🚨', color: '#ef4444' },
  { label: 'Tabungan Pendidikan', keywords: ['pendidikan', 'school', 'kuliah', 'education'], icon: '🎓', color: '#3b82f6' },
  { label: 'Tabungan Liburan', keywords: ['liburan', 'travel', 'traveling', 'vacation', 'holiday', 'umroh', 'haji'], icon: '✈️', color: '#10b981' },
  { label: 'Tabungan Pensiun', keywords: ['pensiun', 'retirement'], icon: '👴', color: '#8b5cf6' },
  { label: 'Tabungan Properti', keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment'], icon: '🏠', color: '#f59e0b' },
  { label: 'Tabungan Kendaraan', keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'], icon: '🚗', color: '#06b6d4' },
  { label: 'Tabungan Bank', keywords: ['bank', 'rekening', 'account'], icon: '🏦', color: '#6366f1' },
  { label: 'Tabungan Emas', keywords: ['emas', 'gold', 'logam mulia'], icon: '🥇', color: '#eab308' },
  { label: 'Tabungan Crypto', keywords: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'], icon: '₿', color: '#f97316' },
  { label: 'Tabungan Investasi', keywords: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond', 'bibit'], icon: '📈', color: '#14b8a6' },
  { label: 'Tabungan Deposito', keywords: ['deposito', 'deposit', 'term deposit'], icon: '💰', color: '#84cc16' },
]

const DEFAULT_SAVINGS = { label: 'Tabungan Lainnya', icon: '💵', color: '#64748b' }

function determineSavingsType(description: string): { label: string; icon: string; color: string } {
  const searchText = description.toLowerCase()
  
  const mapping = SAVINGS_KEYWORD_MAPPINGS.find(m => 
    m.keywords.some(keyword => searchText.includes(keyword))
  )
  
  if (mapping) {
    return mapping
  }
  
  // Try to extract from "Tabungan XXX" pattern
  const match = searchText.match(/tabungan\s+([a-z0-9\s]+)/i)
  if (match && match[1]) {
    const extracted = match[1].trim()
    return {
      label: `Tabungan ${extracted.charAt(0).toUpperCase() + extracted.slice(1)}`,
      icon: '💵',
      color: '#64748b'
    }
  }
  
  return DEFAULT_SAVINGS
}

/**
 * Find or create the appropriate SAVINGS wallet for a transaction
 */
export async function findOrCreateSavingsWallet(
  userId: string,
  description: string,
  categoryName?: string
): Promise<string | null> {
  // Check if this is a savings transaction
  const isSavings = 
    categoryName?.toLowerCase().includes('saving') ||
    categoryName?.toLowerCase().includes('tabungan') ||
    description.toLowerCase().includes('tabungan')
  
  if (!isSavings) {
    return null // Not a savings transaction, use default wallet
  }
  
  // Determine savings type
  const savingsType = determineSavingsType(description)
  
  // Try to find existing wallet
  let wallet = await prisma.wallet.findFirst({
    where: {
      userId,
      name: savingsType.label,
      type: 'SAVINGS'
    }
  })
  
  // Create wallet if doesn't exist
  if (!wallet) {
    console.log(`[Savings Router] Creating new wallet: ${savingsType.label}`)
    wallet = await prisma.wallet.create({
      data: {
        userId,
        name: savingsType.label,
        type: 'SAVINGS',
        balance: 0,
        icon: savingsType.icon,
        color: savingsType.color,
        isDefault: false
      }
    })
  }
  
  return wallet.id
}

/**
 * Check if a transaction should be routed to a savings wallet
 */
export function shouldRoutToSavingsWallet(
  categoryName?: string,
  description?: string
): boolean {
  if (!categoryName && !description) return false
  
  const searchText = `${categoryName || ''} ${description || ''}`.toLowerCase()
  
  return (
    searchText.includes('saving') ||
    searchText.includes('tabungan') ||
    searchText.includes('menabung')
  )
}
