import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'
import { locationCreateSchema } from '@/lib/household-inventory/validation'

export async function GET() {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const locations = await prisma.householdInventoryLocation.findMany({
      where: { userId: auth.userId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('Error fetching household locations:', error)
    return jsonError('Gagal mengambil lokasi stok rumah', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    const parsed = locationCreateSchema.safeParse(await request.json())
    if (!parsed.success) return jsonError('Data lokasi tidak valid')

    const location = await prisma.householdInventoryLocation.create({
      data: { ...parsed.data, userId: auth.userId }
    })

    return NextResponse.json({ location }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') return jsonError('Lokasi sudah ada', 409)
    console.error('Error creating household location:', error)
    return jsonError('Gagal membuat lokasi stok rumah', 500)
  }
}
