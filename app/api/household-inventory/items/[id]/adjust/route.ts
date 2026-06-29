import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { adjustItemSchema } from '@/lib/household-inventory/validation'
import { getHouseholdStockStatus } from '@/lib/household-inventory/status'

interface RouteContext {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = adjustItemSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data penyesuaian stok tidak valid')

    const result = await prisma.$transaction(async tx => {
      const item = await tx.householdInventoryItem.findFirst({
        where: { id: params.id, userId: auth.userId, deletedAt: null }
      })
      if (!item) return null

      const before = item.quantity
      const after = parsed.data.mode === 'ADD'
        ? before + parsed.data.quantity
        : parsed.data.mode === 'SUBTRACT'
          ? Math.max(0, before - parsed.data.quantity)
          : parsed.data.quantity

      const updated = await tx.householdInventoryItem.update({
        where: { id: item.id },
        data: { quantity: after },
        include: { category: true, location: true, movements: { orderBy: { createdAt: 'desc' }, take: 5 } }
      })

      await tx.householdStockMovement.create({
        data: {
          userId: auth.userId,
          itemId: item.id,
          type: parsed.data.reason,
          quantityBefore: before,
          quantityAfter: after,
          delta: after - before,
          reason: parsed.data.note || null
        }
      })

      return updated
    })

    if (!result) return jsonError('Barang tidak ditemukan', 404)

    return NextResponse.json({
      item: {
        ...result,
        status: getHouseholdStockStatus(result),
        needsShopping: result.quantity <= result.minimumQuantity
      }
    })
  } catch (error) {
    console.error('Error adjusting household inventory item:', error)
    return jsonError('Gagal menyesuaikan stok rumah', 500)
  }
}
