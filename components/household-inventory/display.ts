export function shortProductName(name: string) {
  return name
    .replace(/\binstant noodles?\b/gi, '')
    .replace(/\bflavo(u)?r\b/gi, '')
    .replace(/\bindonesia\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function displayBarcode(barcode?: string | null) {
  if (!barcode) return 'Tanpa barcode'
  return barcode
}

export function isGenericProductName(name: string) {
  return /^(instant\s+noodles?|noodles?|mie|mi)$/i.test(name.trim())
}
