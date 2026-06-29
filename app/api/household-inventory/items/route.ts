import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ensureHouseholdCategory, ensureHouseholdLocation, jsonError, requireUserId } from '@/lib/household-inventory/api'
import { householdItemCreateSchema } from '@/lib/household-inventory/validation'
import { getHouseholdStockStatus, type HouseholdStockStatus } from '@/lib/household-inventory/status'

function withStatus<T extends { quantity: number; minimumQuantity: number; expiredAt: Date | null }>(item: T) {
  return {
    ...item,
    status: getHouseholdStockStatus(item),
    needsShopping: item.quantity <= item.minimumQuantity
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const categoryId = searchParams.get('categoryId') || undefined
    const locationId = searchParams.get('locationId') || undefined
    const status = searchParams.get('status') as HouseholdStockStatus | null

    const items = await prisma.householdInventoryItem.findMany({
      where: {
        userId: auth.userId,
        deletedAt: null,
        ...(search ? { name: { contains: search } } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(locationId ? { locationId } : {})
      },
      include: {
        category: true,
        location: true,
        movements: { orderBy: { createdAt: 'desc' }, take: 5 }
      },
      orderBy: { name: 'asc' }
    })

    const itemsWithStatus = items.map(withStatus)
    const filtered = status ? itemsWithStatus.filter(item => item.status === status) : itemsWithStatus

    return NextResponse.json({ items: filtered })
  } catch (error) {
    console.error('Error fetching household inventory items:', error)
    return jsonError('Gagal mengambil stok rumah', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = householdItemCreateSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data barang tidak valid')

    const data = parsed.data
    const categoryOk = await ensureHouseholdCategory(auth.userId, data.categoryId)
    if (!categoryOk) return jsonError('Kategori tidak valid', 400)

    const locationOk = await ensureHouseholdLocation(auth.userId, data.locationId)
    if (!locationOk) return jsonError('Lokasi tidak valid', 400)

    if (data.barcode) {
      const existing = await prisma.householdInventoryItem.findFirst({
        where: { userId: auth.userId, barcode: data.barcode, deletedAt: null },
        select: { id: true, name: true }
      })
      if (existing) {
        return NextResponse.json({ error: 'Barcode sudah dipakai', item: existing }, { status: 409 })
      }
    }

    const item = await prisma.$transaction(async tx => {
      const created = await tx.householdInventoryItem.create({
        data: {
          userId: auth.userId,
          name: data.name,
          barcode: data.barcode || null,
          categoryId: data.categoryId || null,
          locationId: data.locationId || null,
          quantity: data.quantity,
          unit: data.unit,
          minimumQuantity: data.minimumQuantity,
          expiredAt: data.expiredAt ? new Date(data.expiredAt) : null,
          notes: data.notes || null
        },
        include: { category: true, location: true }
      })

      if (created.quantity > 0) {
        await tx.householdStockMovement.create({
          data: {
            userId: auth.userId,
            itemId: created.id,
            type: 'RESTOCK',
            quantityBefore: 0,
            quantityAfter: created.quantity,
            delta: created.quantity,
            reason: 'Initial stock'
          }
        })
      }

      return created
    })

    return NextResponse.json({ item: withStatus(item) }, { status: 201 })
  } catch (error) {
    console.error('Error creating household inventory item:', error)
    return jsonError('Gagal membuat barang stok rumah', 500)
  }
}
