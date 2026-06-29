import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { normalizeCreditCardPayload, summarizeCreditCard } from '@/lib/credit-cards'

export const dynamic = 'force-dynamic'

function withSummary<T extends { creditLimit: number; currentBalance: number; statementDay: number; dueDay: number; minimumPaymentRate: number }>(card: T) {
  return { ...card, summary: summarizeCreditCard(card) }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const cards = await prisma.creditCard.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        wallet: { select: { id: true, name: true, color: true, currencyCode: true } },
        transactions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    })

    const cardsWithSummary = cards.map(withSummary)
    const summary = cardsWithSummary.reduce(
      (acc, card) => {
        acc.totalLimit += card.creditLimit
        acc.totalBalance += card.currentBalance
        acc.availableCredit += card.summary.availableCredit
        if (card.summary.isHighUtilization) acc.highUtilizationCount += 1
        if (card.summary.isDueSoon) acc.dueSoonCount += 1
        return acc
      },
      { totalLimit: 0, totalBalance: 0, availableCredit: 0, highUtilizationCount: 0, dueSoonCount: 0 }
    )

    return NextResponse.json({
      creditCards: cardsWithSummary,
      total: cardsWithSummary.length,
      summary: {
        ...summary,
        utilization: summary.totalLimit > 0 ? (summary.totalBalance / summary.totalLimit) * 100 : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching credit cards:', error)
    return NextResponse.json({ error: 'Failed to fetch credit cards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = normalizeCreditCardPayload(body)

    if (!data.name) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 })
    }

    if (data.walletId) {
      const wallet = await prisma.wallet.findFirst({ where: { id: data.walletId, userId: session.user.id } })
      if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const card = await prisma.creditCard.create({
      data: { ...data, userId: session.user.id },
      include: { wallet: { select: { id: true, name: true, color: true, currencyCode: true } } },
    })

    return NextResponse.json({ creditCard: withSummary(card) }, { status: 201 })
  } catch (error) {
    console.error('Error creating credit card:', error)
    return NextResponse.json({ error: 'Failed to create credit card' }, { status: 500 })
  }
}
