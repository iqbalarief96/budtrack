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
    const isBatch = Array.isArray(body)
    const items = isBatch ? body : [body]

    if (items.length === 0) return NextResponse.json({ error: 'No transactions provided' }, { status: 400 })
    if (items.length > 500) return NextResponse.json({ error: 'Max 500 transactions per import' }, { status: 400 })

    let currentCard = card

    const created: any[] = []
    const errors: string[] = []

    for (const item of items) {
      try {
        const type = typeof item.type === 'string' && VALID_CREDIT_CARD_TRANSACTION_TYPES.has(item.type) ? item.type : 'charge'
        const amount = Math.abs(numberOrDefault(item.amount, 0))
        if (amount <= 0) throw new Error('Amount must be greater than zero')

        const delta = transactionDelta(type, amount)
        const nextBalance = Math.max(0, currentCard.currentBalance + delta)

        const result = await prisma.$transaction(async (tx) => {
          const transaction = await tx.creditCardTransaction.create({
            data: {
              userId: session.user.id,
              cardId: params.cardId,
              amount,
              type,
              description: item.description ? String(item.description).trim() : null,
              merchant: item.merchant ? String(item.merchant).trim() : null,
              category: item.category ? String(item.category).trim() : null,
              date: parseOptionalDate(item.date) ?? new Date(),
              statementId: item.statementId ? String(item.statementId).trim() : null,
              installmentTenor: item.installmentTenor != null ? Math.max(1, Number.parseInt(String(item.installmentTenor), 10) || 1) : null,
              installmentTerm: item.installmentTerm != null ? Math.max(1, Number.parseInt(String(item.installmentTerm), 10) || 1) : null,
              installmentTotal: item.installmentTotal != null ? Math.max(0, numberOrDefault(item.installmentTotal, 0)) : null,
              installmentPaid: item.installmentPaid != null ? Math.max(0, numberOrDefault(item.installmentPaid, 0)) : null,
              originalAmount: item.originalAmount != null ? Math.max(0, numberOrDefault(item.originalAmount, 0)) : null,
              currency: item.currency ? String(item.currency).trim().toUpperCase().slice(0, 8) : 'IDR',
              exchangeRate: item.exchangeRate != null ? Math.max(0, numberOrDefault(item.exchangeRate, 0)) : null,
              reversalOfId: item.reversalOfId ? String(item.reversalOfId).trim() : null,
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

          return { transaction, updatedCard }
        })

        created.push(result.transaction)
        currentCard = result.updatedCard
      } catch (err) {
        errors.push(`${item.merchant || item.description || 'transaction'}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    if (!isBatch) {
      const updatedCard = created[0] ? created[0].updatedCard : await prisma.creditCard.findUnique({ where: { id: params.cardId } })
      return NextResponse.json({ transaction: created[0]?.transaction, creditCard: updatedCard ? withSummary(updatedCard) : undefined }, { status: created.length > 0 ? 201 : 400 })
    }

    return NextResponse.json({ transactions: created.map(c => c.transaction), total: created.length, errors }, { status: errors.length === items.length ? 400 : 201 })
  } catch (error) {
    console.error('Error creating credit card transaction:', error)
    return NextResponse.json({ error: 'Failed to create credit card transaction' }, { status: 500 })
  }
}
