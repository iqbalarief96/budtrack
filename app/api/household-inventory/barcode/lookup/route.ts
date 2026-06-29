import { NextRequest } from 'next/server'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { lookupBarcode } from '@/lib/household-inventory/barcode'
import { barcodeLookupSchema } from '@/lib/household-inventory/validation'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = barcodeLookupSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Barcode tidak valid')

    const result = await lookupBarcode(auth.userId, parsed.data.barcode)
    return Response.json(result)
  } catch (error) {
    console.error('Error looking up household barcode:', error)
    return jsonError('Gagal mencari barcode', 500)
  }
}
