import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  numberOrDefault,
  parseOptionalDate,
  summarizeCreditCard,
  transactionDelta,
  VALID_CREDIT_CARD_TRANSACTION_TYPES,
} from '@/lib/credit-cards'

export const dynamic = 'force-dynamic'

function withSummary<T extends { creditLimit: number; currentBalance: number; statementDay: number; dueDay: number; minimumPaymentRate: number }>(card: T) {
  return { ...card, summary: summarizeCreditCard(card) }
}

export async function GET(request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const card = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!card) return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const take = Math.min(Math.max(Number.parseInt(searchParams.get('take') || '50', 10), 1), 200)

    const transactions = await prisma.creditCardTransaction.findMany({
      where: {
        userId: session.user.id,
        cardId: params.cardId,
        ...(type && { type }),
      },
      orderBy: { date: 'desc' },
      take,
    })

    return NextResponse.json({ transactions, total: transactions.length })
  } catch (error) {
    console.error('Error fetching credit card transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch credit card transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const card = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!card) return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })

    const body = await request.json()
    const type = typeof body.type === 'string' && VALID_CREDIT_CARD_TRANSACTION_TYPES.has(body.type) ? body.type : 'charge'
    const amount = Math.abs(numberOrDefault(body.amount, 0))
    if (amount <= 0) return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })

    const delta = transactionDelta(type, amount)
    const nextBalance = Math.max(0, card.currentBalance + delta)

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.creditCardTransaction.create({
        data: {
          userId: session.user.id,
          cardId: params.cardId,
          amount,
          type,
          description: body.description ? String(body.description).trim() : null,
          merchant: body.merchant ? String(body.merchant).trim() : null,
          category: body.category ? String(body.category).trim() : null,
          date: parseOptionalDate(body.date) ?? new Date(),
          statementId: body.statementId ? String(body.statementId).trim() : null,
        },
      })

      const updatedCard = await tx.creditCard.update({
        where: { id: params.cardId },
        data: { currentBalance: nextBalance },
        include: {
          wallet: { select: { id: true, name: true, color: true, currencyCode: true } },
          transactions: { orderBy: { date: 'desc' }, take: 5 },
        },
      })

      const summary = summarizeCreditCard(updatedCard)
      if (summary.isHighUtilization || summary.isDueSoon) {
        await tx.alert.create({
          data: {
            userId: session.user.id,
            title: summary.isHighUtilization ? 'High credit card utilization' : 'Credit card due soon',
            message: summary.isHighUtilization
              ? `${updatedCard.name} utilization is ${summary.utilization.toFixed(1)}%. Consider paying it down.`
              : `${updatedCard.name} payment is due in ${summary.daysUntilDue} day(s). Minimum payment: ${summary.minimumPayment}.`,
            type: summary.isHighUtilization ? 'warning' : 'info',
            additionalData: JSON.stringify({ category: 'credit_card', creditCardId: updatedCard.id, transactionId: transaction.id }),
            isRead: false,
          },
        })
      }

      return { transaction, creditCard: withSummary(updatedCard) }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating credit card transaction:', error)
    return NextResponse.json({ error: 'Failed to create credit card transaction' }, { status: 500 })
  }
}
