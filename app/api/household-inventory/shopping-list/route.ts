import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { shoppingListItemCreateSchema } from '@/lib/household-inventory/validation'

export async function GET() {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const [lowStockItems, manualItems] = await Promise.all([
      prisma.householdInventoryItem.findMany({
        where: { userId: auth.userId, deletedAt: null },
        include: { category: true, location: true },
        orderBy: { name: 'asc' }
      }),
      prisma.householdShoppingListItem.findMany({
        where: { userId: auth.userId, checkedAt: null },
        orderBy: { createdAt: 'desc' }
      })
    ])

    return NextResponse.json({
      autoItems: lowStockItems.filter(item => item.quantity <= item.minimumQuantity).map(item => ({
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        minimumQuantity: item.minimumQuantity,
        suggestedQuantity: Math.max(item.minimumQuantity - item.quantity, item.minimumQuantity, 1),
        category: item.category,
        location: item.location
      })),
      manualItems
    })
  } catch (error) {
    console.error('Error fetching household shopping list:', error)
    return jsonError('Gagal mengambil daftar belanja', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = shoppingListItemCreateSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data daftar belanja tidak valid')

    if (parsed.data.itemId) {
      const item = await prisma.householdInventoryItem.findFirst({
        where: { id: parsed.data.itemId, userId: auth.userId, deletedAt: null }
      })
      if (!item) return jsonError('Barang tidak ditemukan', 404)
    }

    const manualItem = await prisma.householdShoppingListItem.create({
      data: {
        userId: auth.userId,
        itemId: parsed.data.itemId || null,
        name: parsed.data.name,
        unit: parsed.data.unit || null,
        quantity: parsed.data.quantity ?? null
      }
    })

    return NextResponse.json({ item: manualItem }, { status: 201 })
  } catch (error) {
    console.error('Error creating household shopping list item:', error)
    return jsonError('Gagal menambah daftar belanja', 500)
  }
}
