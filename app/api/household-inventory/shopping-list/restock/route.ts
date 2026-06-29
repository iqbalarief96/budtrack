import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { shoppingRestockSchema } from '@/lib/household-inventory/validation'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = shoppingRestockSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data restock belanja tidak valid')

    const updated = await prisma.$transaction(async tx => {
      const updatedItems = []

      for (const restock of parsed.data.items) {
        const item = await tx.householdInventoryItem.findFirst({
          where: { id: restock.itemId, userId: auth.userId, deletedAt: null }
        })
        if (!item) throw new Error(`Item not found: ${restock.itemId}`)

        const before = item.quantity
        const after = before + restock.boughtQuantity

        const updatedItem = await tx.householdInventoryItem.update({
          where: { id: item.id },
          data: { quantity: after }
        })

        await tx.householdStockMovement.create({
          data: {
            userId: auth.userId,
            itemId: item.id,
            type: 'SHOPPING_LIST_RESTOCK',
            quantityBefore: before,
            quantityAfter: after,
            delta: restock.boughtQuantity,
            reason: 'Shopping list restock'
          }
        })

        await tx.householdShoppingListItem.updateMany({
          where: { userId: auth.userId, itemId: item.id, checkedAt: null },
          data: { checkedAt: new Date() }
        })

        updatedItems.push(updatedItem)
      }

      return updatedItems
    })

    return NextResponse.json({ updatedCount: updated.length, items: updated })
  } catch (error) {
    console.error('Error restocking household shopping list:', error)
    return jsonError('Gagal restock dari daftar belanja', 500)
  }
}
