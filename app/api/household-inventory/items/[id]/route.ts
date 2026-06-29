import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ensureHouseholdCategory, ensureHouseholdLocation, jsonError, requireUserId } from '@/lib/household-inventory/api'
import { householdItemUpdateSchema } from '@/lib/household-inventory/validation'
import { getHouseholdStockStatus } from '@/lib/household-inventory/status'

interface RouteContext {
  params: { id: string }
}

function withStatus<T extends { quantity: number; minimumQuantity: number; expiredAt: Date | null }>(item: T) {
  return {
    ...item,
    status: getHouseholdStockStatus(item),
    needsShopping: item.quantity <= item.minimumQuantity
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const item = await prisma.householdInventoryItem.findFirst({
      where: { id: params.id, userId: auth.userId, deletedAt: null },
      include: {
        category: true,
        location: true,
        movements: { orderBy: { createdAt: 'desc' } }
      }
    })

    if (!item) return jsonError('Barang tidak ditemukan', 404)
    return NextResponse.json({ item: withStatus(item) })
  } catch (error) {
    console.error('Error fetching household inventory item:', error)
    return jsonError('Gagal mengambil barang stok rumah', 500)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = householdItemUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data barang tidak valid')

    const existing = await prisma.householdInventoryItem.findFirst({
      where: { id: params.id, userId: auth.userId, deletedAt: null }
    })
    if (!existing) return jsonError('Barang tidak ditemukan', 404)

    const data = parsed.data
    const categoryOk = await ensureHouseholdCategory(auth.userId, data.categoryId)
    if (!categoryOk) return jsonError('Kategori tidak valid', 400)

    const locationOk = await ensureHouseholdLocation(auth.userId, data.locationId)
    if (!locationOk) return jsonError('Lokasi tidak valid', 400)

    if (data.barcode) {
      const duplicate = await prisma.householdInventoryItem.findFirst({
        where: {
          userId: auth.userId,
          barcode: data.barcode,
          deletedAt: null,
          NOT: { id: params.id }
        },
        select: { id: true, name: true }
      })
      if (duplicate) {
        return NextResponse.json({ error: 'Barcode sudah dipakai', item: duplicate }, { status: 409 })
      }
    }

    const item = await prisma.householdInventoryItem.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode || null } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
        ...(data.locationId !== undefined ? { locationId: data.locationId || null } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.minimumQuantity !== undefined ? { minimumQuantity: data.minimumQuantity } : {}),
        ...(data.expiredAt !== undefined ? { expiredAt: data.expiredAt ? new Date(data.expiredAt) : null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {})
      },
      include: { category: true, location: true, movements: { orderBy: { createdAt: 'desc' }, take: 5 } }
    })

    return NextResponse.json({ item: withStatus(item) })
  } catch (error) {
    console.error('Error updating household inventory item:', error)
    return jsonError('Gagal mengubah barang stok rumah', 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const existing = await prisma.householdInventoryItem.findFirst({
      where: { id: params.id, userId: auth.userId, deletedAt: null }
    })
    if (!existing) return jsonError('Barang tidak ditemukan', 404)

    await prisma.householdInventoryItem.update({
      where: { id: params.id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting household inventory item:', error)
    return jsonError('Gagal menghapus barang stok rumah', 500)
  }
}
