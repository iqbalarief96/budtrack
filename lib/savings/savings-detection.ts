export type SavingsDetection = {
  label: string
  icon: string
  color: string
  confidence: 'high' | 'medium' | 'low'
}

const STOP_WORDS = new Set([
  'bulan', 'bln', 'jan', 'januari', 'feb', 'februari', 'mar', 'maret',
  'apr', 'april', 'mei', 'jun', 'juni', 'jul', 'juli', 'agu', 'agustus',
  'sep', 'september', 'okt', 'oktober', 'nov', 'november', 'des', 'desember',
  'setor', 'transfer', 'tf', 'ke', 'untuk', 'saving', 'savings', 'tabungan',
  'minggu', 'week', 'monthly', 'bulanan', 'rutin'
])

const KNOWN = [
  { label: 'Tabungan Darurat', keywords: ['darurat', 'emergency'], icon: '🚨', color: '#ef4444' },
  { label: 'Tabungan Pendidikan', keywords: ['pendidikan', 'school', 'kuliah', 'education'], icon: '🎓', color: '#3b82f6' },
  { label: 'Tabungan Liburan', keywords: ['liburan', 'travel', 'traveling', 'vacation', 'holiday', 'umroh', 'haji'], icon: '✈️', color: '#10b981' },
  { label: 'Tabungan Pensiun', keywords: ['pensiun', 'retirement'], icon: '👴', color: '#8b5cf6' },
  { label: 'Tabungan Properti', keywords: ['rumah', 'properti', 'property', 'kpr', 'house', 'apartemen', 'apartment'], icon: '🏠', color: '#f59e0b' },
  { label: 'Tabungan Kendaraan', keywords: ['kendaraan', 'mobil', 'motor', 'car', 'bike'], icon: '🚗', color: '#06b6d4' },
  { label: 'Tabungan Bank', keywords: ['bank', 'rekening', 'account'], icon: '🏦', color: '#6366f1' },
  { label: 'Tabungan Emas', keywords: ['emas', 'gold', 'logam mulia'], icon: '🥇', color: '#eab308' },
  { label: 'Tabungan Crypto', keywords: ['crypto', 'kripto', 'btc', 'bitcoin', 'eth', 'ethereum'], icon: '₿', color: '#f97316' },
  { label: 'Tabungan Investasi', keywords: ['investasi', 'investment', 'reksa', 'reksadana', 'saham', 'stock', 'obligasi', 'bond'], icon: '📈', color: '#14b8a6' },
  { label: 'Tabungan Deposito', keywords: ['deposito', 'deposit', 'term deposit'], icon: '💰', color: '#84cc16' },
]

export function titlePreserveAcronym(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.length <= 4 && word === word.toUpperCase()
      ? word
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function detectSavingsBucket(description = '', categoryName = ''): SavingsDetection {
  const raw = `${description} ${categoryName}`.trim()
  const lower = raw.toLowerCase()
  const known = KNOWN.find((item) => item.keywords.some((keyword) => lower.includes(keyword)))
  if (known) return { ...known, confidence: 'high' }

  const match = raw.match(/(?:tabungan|saving|savings)\s+([a-z0-9A-Z\s_-]+)/i)
  if (match?.[1]) {
    const cleaned = match[1]
      .replace(/[_-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()))
      .slice(0, 4)
      .join(' ')

    if (cleaned) {
      return {
        label: `Tabungan ${titlePreserveAcronym(cleaned)}`,
        icon: '💵',
        color: '#64748b',
        confidence: 'medium',
      }
    }
  }

  return { label: 'Tabungan Lainnya', icon: '💵', color: '#64748b', confidence: 'low' }
}
