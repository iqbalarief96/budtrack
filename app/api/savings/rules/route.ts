import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await prisma.savingsRule.findMany({
    where: { userId: session.user.id },
    include: { destinationWallet: { select: { id: true, name: true, icon: true, color: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.name || !body.pattern || !body.destinationWalletId) {
    return NextResponse.json({ error: 'name, pattern, destinationWalletId required' }, { status: 400 })
  }
  if (body.isRegex) {
    try { new RegExp(body.pattern) } catch { return NextResponse.json({ error: 'Invalid regex' }, { status: 400 }) }
  }

  const wallet = await prisma.wallet.findFirst({ where: { id: body.destinationWalletId, userId: session.user.id, type: 'SAVINGS' } })
  if (!wallet) return NextResponse.json({ error: 'Destination wallet not found' }, { status: 400 })

  const rule = await prisma.savingsRule.create({
    data: {
      userId: session.user.id,
      name: body.name,
      pattern: body.pattern,
      isRegex: Boolean(body.isRegex),
      isActive: body.isActive ?? true,
      destinationWalletId: body.destinationWalletId,
      priority: Number(body.priority ?? 100),
    },
  })
  return NextResponse.json({ rule }, { status: 201 })
}
