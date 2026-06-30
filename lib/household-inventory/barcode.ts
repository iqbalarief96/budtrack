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

interface BarcodeLookupResult {
  name: string
  brand: string | null
  defaultUnit: string
  source: string
}

interface UpcItemDbResponse {
  code?: string
  items?: Array<{
    title?: string
    brand?: string
    size?: string
  }>
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

  const online = await lookupOnlineBarcode(barcode)
  if (!online) return { status: 'NOT_FOUND' as const, barcode }

  const created = await prisma.householdProductTemplate.create({
    data: {
      userId,
      barcode,
      name: online.name,
      brand: online.brand,
      defaultUnit: online.defaultUnit,
      source: online.source
    }
  })

  return { status: 'ONLINE_FOUND' as const, template: created }
}

async function lookupOnlineBarcode(barcode: string) {
  const [openFoodFacts, upcItemDb] = await Promise.all([
    lookupOpenFoodFacts(barcode),
    lookupUpcItemDb(barcode)
  ])

  if (!openFoodFacts) return upcItemDb
  if (upcItemDb && isGenericName(openFoodFacts.name)) return upcItemDb
  return openFoodFacts
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'BudTrack/1.0' }
    })
    if (!res.ok) return null

    const json = await res.json() as OpenFoodFactsResponse
    const product = json.product
    const name = product?.product_name?.trim() || product?.product_name_id?.trim()
    if (!name) return null

    return {
      name,
      brand: product?.brands?.split(',')[0]?.trim() || null,
      defaultUnit: guessUnit(product?.quantity),
      source: 'OPEN_FOOD_FACTS'
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function lookupUpcItemDb(barcode: string): Promise<BarcodeLookupResult | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'BudTrack/1.0' }
    })
    if (!res.ok) return null

    const json = await res.json() as UpcItemDbResponse
    const item = json.items?.[0]
    const name = item?.title?.trim()
    if (!name) return null

    return {
      name: cleanProductName(name),
      brand: item.brand?.trim() || null,
      defaultUnit: guessUnit(item.size),
      source: 'UPC_ITEM_DB'
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function isGenericName(name: string) {
  return /^(instant\s+noodles?|noodles?|mie|mi)$/i.test(name.trim())
}

function cleanProductName(name: string) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\b1\s*pc\b/gi, '')
    .trim()
}

function guessUnit(quantity?: string) {
  const q = quantity?.toLowerCase() || ''
  if (/\b(kg|kilogram)\b/.test(q)) return 'kg'
  if (/\b(g|gr|gram)\b/.test(q)) return 'gram'
  if (/\b(l|liter|litre)\b/.test(q)) return 'liter'
  if (/\b(ml|milliliter|millilitre)\b/.test(q)) return 'ml'
  return 'pcs'
}
