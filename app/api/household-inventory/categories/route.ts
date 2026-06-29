import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { categoryCreateSchema } from '@/lib/household-inventory/validation'

export async function GET() {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const categories = await prisma.householdInventoryCategory.findMany({
      where: { userId: auth.userId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching household categories:', error)
    return jsonError('Gagal mengambil kategori stok rumah', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = categoryCreateSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data kategori tidak valid')

    const category = await prisma.householdInventoryCategory.create({
      data: { ...parsed.data, userId: auth.userId }
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') return jsonError('Kategori sudah ada', 409)
    console.error('Error creating household category:', error)
    return jsonError('Gagal membuat kategori stok rumah', 500)
  }
}
