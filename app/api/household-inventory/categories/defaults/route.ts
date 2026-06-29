import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DEFAULT_HOUSEHOLD_CATEGORIES } from '@/lib/household-inventory/constants'
import { jsonError, requireUserId } from '@/lib/household-inventory/api'

export async function POST() {
  try {
    const auth = await requireUserId()
    if ('error' in auth) return auth.error

    let created = 0
    let skipped = 0

    for (const name of DEFAULT_HOUSEHOLD_CATEGORIES) {
      const existing = await prisma.householdInventoryCategory.findFirst({
        where: { userId: auth.userId, name }
      })
      if (existing) {
        skipped += 1
        continue
      }
      await prisma.householdInventoryCategory.create({
        data: { userId: auth.userId, name }
      })
      created += 1
    }

    return NextResponse.json({ created, skipped })
  } catch (error) {
    console.error('Error creating default household categories:', error)
    return jsonError('Gagal membuat kategori default stok rumah', 500)
  }
}
