import prisma from '@/lib/prisma'

interface OpenFoodFactsProduct {
  product_name?: string
  product_name_id?: string
  brands?: string
  quantity?: string
}

interface OpenFoodFactsResponse {
  status?: number
  product?: OpenFoodFactsProduct
}

export async function lookupBarcode(userId: string, barcode: string) {
  const item = await prisma.householdInventoryItem.findFirst({
    where: { userId, barcode, deletedAt: null },
    include: { category: true, location: true }
  })
  if (item) return { status: 'ITEM_FOUND' as const, item }

  const template = await prisma.householdProductTemplate.findUnique({
    where: { userId_barcode: { userId, barcode } },
    include: { defaultCategory: true }
  })
  if (template) return { status: 'TEMPLATE_FOUND' as const, template }

  const online = await lookupOpenFoodFacts(barcode)
  if (!online) return { status: 'NOT_FOUND' as const, barcode }

  const created = await prisma.householdProductTemplate.create({
    data: {
      userId,
      barcode,
      name: online.name,
      brand: online.brand,
      defaultUnit: online.defaultUnit,
      source: 'ONLINE'
    }
  })

  return { status: 'ONLINE_FOUND' as const, template: created }
}

async function lookupOpenFoodFacts(barcode: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) return null

    const json = await res.json() as OpenFoodFactsResponse
    const product = json.product
    const name = product?.product_name?.trim() || product?.product_name_id?.trim()
    if (!name) return null

    return {
      name,
      brand: product?.brands?.split(',')[0]?.trim() || null,
      defaultUnit: guessUnit(product?.quantity)
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function guessUnit(quantity?: string) {
  const q = quantity?.toLowerCase() || ''
  if (/\b(kg|kilogram)\b/.test(q)) return 'kg'
  if (/\b(g|gr|gram)\b/.test(q)) return 'gram'
  if (/\b(l|liter|litre)\b/.test(q)) return 'liter'
  if (/\b(ml|milliliter|millilitre)\b/.test(q)) return 'ml'
  return 'pcs'
}
