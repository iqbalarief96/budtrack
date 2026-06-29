import { detectSavingsBucket } from './savings-detection'

const cases = [
  ['Tabungan IWK Januari', 'Savings', 'Tabungan IWK'],
  ['setor tabungan darurat jan', 'Savings', 'Tabungan Darurat'],
  ['saving emas februari', 'Savings', 'Tabungan Emas'],
  ['nabung random', 'Savings', 'Tabungan Lainnya'],
] as const

for (const [description, category, expected] of cases) {
  const actual = detectSavingsBucket(description, category).label
  if (actual !== expected) {
    throw new Error(`${description}: expected ${expected}, got ${actual}`)
  }
}

console.log('savings-detection selfcheck passed')
