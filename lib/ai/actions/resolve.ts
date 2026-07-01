import type { AiActionValidationContext } from './types'

const CATEGORY_ALIASES: Record<string, string[]> = {
  makan: ['makan', 'food', 'kuliner', 'resto', 'restaurant'],
  transportasi: ['transport', 'transportasi', 'gojek', 'grab', 'bensin', 'parkir'],
  belanja: ['belanja', 'shopping', 'shop', 'marketplace'],
  tagihan: ['tagihan', 'bill', 'bills', 'listrik', 'internet', 'air'],
  tabungan: ['tabungan', 'saving', 'savings', 'nabung'],
}

function normalize(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ')
}

function scoreName(query: string, candidate: string) {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q || !c) return 0
  if (q === c) return 1
  if (c.includes(q) || q.includes(c)) return 0.85

  const qTokens = new Set(q.split(' '))
  const cTokens = new Set(c.split(' '))
  const shared = [...qTokens].filter((token) => cTokens.has(token)).length
  return shared / Math.max(qTokens.size, cTokens.size)
}

export function resolveCategoryId(categoryName: string | undefined, ctx: AiActionValidationContext) {
  if (!categoryName) return { id: undefined, ambiguous: false }

  const direct = ctx.categoriesByName.get(categoryName.toLowerCase()) ?? []
  if (direct.length === 1) return { id: direct[0].id, ambiguous: false }
  if (direct.length > 1) return { id: undefined, ambiguous: true }

  const normalized = normalize(categoryName)
  const aliasKey = Object.entries(CATEGORY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalize(alias) === normalized))?.[0]
  const query = aliasKey ?? categoryName

  const ranked = ctx.categories
    .map((category) => ({ category, score: scoreName(query, category.name) }))
    .filter((item) => item.score >= 0.75)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 1) return { id: ranked[0].category.id, ambiguous: false }
  if (ranked.length > 1 && ranked[0].score > ranked[1].score) return { id: ranked[0].category.id, ambiguous: false }
  return { id: undefined, ambiguous: ranked.length > 1 }
}
