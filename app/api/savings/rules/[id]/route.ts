import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.savingsRule.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  if (body.isRegex || (body.isRegex === undefined && existing.isRegex)) {
    try { new RegExp(body.pattern ?? existing.pattern) } catch { return NextResponse.json({ error: 'Invalid regex' }, { status: 400 }) }
  }
  if (body.destinationWalletId) {
    const wallet = await prisma.wallet.findFirst({ where: { id: body.destinationWalletId, userId: session.user.id, type: 'SAVINGS' } })
    if (!wallet) return NextResponse.json({ error: 'Destination wallet not found' }, { status: 400 })
  }

  const rule = await prisma.savingsRule.update({
    where: { id: params.id },
    data: {
      name: body.name,
      pattern: body.pattern,
      isRegex: body.isRegex,
      isActive: body.isActive,
      destinationWalletId: body.destinationWalletId,
      priority: body.priority === undefined ? undefined : Number(body.priority),
    },
  })
  return NextResponse.json({ rule })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.savingsRule.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.savingsRule.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
