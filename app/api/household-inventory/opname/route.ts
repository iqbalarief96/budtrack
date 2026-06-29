import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { opnameSchema } from '@/lib/household-inventory/validation'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = opnameSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data opname tidak valid')

    const changed = await prisma.$transaction(async tx => {
      const changedItems = []

      for (const update of parsed.data.updates) {
        const item = await tx.householdInventoryItem.findFirst({
          where: { id: update.itemId, userId: auth.userId, deletedAt: null }
        })
        if (!item) throw new Error(`Item not found: ${update.itemId}`)
        if (item.quantity === update.quantity) continue

        const updated = await tx.householdInventoryItem.update({
          where: { id: item.id },
          data: { quantity: update.quantity }
        })

        await tx.householdStockMovement.create({
          data: {
            userId: auth.userId,
            itemId: item.id,
            type: 'AUDIT',
            quantityBefore: item.quantity,
            quantityAfter: update.quantity,
            delta: update.quantity - item.quantity,
            reason: 'Quick stock opname'
          }
        })

        changedItems.push(updated)
      }

      return changedItems
    })

    return NextResponse.json({ changedCount: changed.length, items: changed })
  } catch (error) {
    console.error('Error running household inventory opname:', error)
    return jsonError('Gagal menyimpan opname stok rumah', 500)
  }
}
