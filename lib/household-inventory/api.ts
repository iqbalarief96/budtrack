import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function requireUserId() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { userId }
}

export async function ensureHouseholdCategory(userId: string, categoryId?: string | null) {
  if (!categoryId) return true
  const category = await prisma.householdInventoryCategory.findFirst({ where: { id: categoryId, userId } })
  return Boolean(category)
}

export async function ensureHouseholdLocation(userId: string, locationId?: string | null) {
  if (!locationId) return true
  const location = await prisma.householdInventoryLocation.findFirst({ where: { id: locationId, userId } })
  return Boolean(location)
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
