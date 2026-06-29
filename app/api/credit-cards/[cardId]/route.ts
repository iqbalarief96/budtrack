import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { normalizeCreditCardPatch, summarizeCreditCard } from '@/lib/credit-cards'

export const dynamic = 'force-dynamic'

function withSummary<T extends { creditLimit: number; currentBalance: number; statementDay: number; dueDay: number; minimumPaymentRate: number }>(card: T) {
  return { ...card, summary: summarizeCreditCard(card) }
}

export async function GET(_request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const card = await prisma.creditCard.findFirst({
      where: { id: params.cardId, userId: session.user.id },
      include: {
        wallet: { select: { id: true, name: true, color: true, currencyCode: true } },
        transactions: { orderBy: { date: 'desc' }, take: 100 },
      },
    })

    if (!card) return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })

    return NextResponse.json({ creditCard: withSummary(card) })
  } catch (error) {
    console.error('Error fetching credit card:', error)
    return NextResponse.json({ error: 'Failed to fetch credit card' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!existing) return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })

    const body = await request.json()
    const data = normalizeCreditCardPatch(body)

    if ('walletId' in data && data.walletId) {
      const wallet = await prisma.wallet.findFirst({ where: { id: String(data.walletId), userId: session.user.id } })
      if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const card = await prisma.creditCard.update({
      where: { id: params.cardId },
      data,
      include: {
        wallet: { select: { id: true, name: true, color: true, currencyCode: true } },
        transactions: { orderBy: { date: 'desc' }, take: 20 },
      },
    })

    return NextResponse.json({ creditCard: withSummary(card) })
  } catch (error) {
    console.error('Error updating credit card:', error)
    return NextResponse.json({ error: 'Failed to update credit card' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!existing) return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })

    await prisma.creditCard.delete({ where: { id: params.cardId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credit card:', error)
    return NextResponse.json({ error: 'Failed to delete credit card' }, { status: 500 })
  }
}
