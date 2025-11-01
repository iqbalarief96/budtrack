import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

function escapeCsv(value: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId') || undefined
    const type = searchParams.get('type') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const minAmount = searchParams.get('minAmount') || undefined
    const maxAmount = searchParams.get('maxAmount') || undefined

    const where: Prisma.TransactionWhereInput = {
      userId: session.user.id,
    }

    if (walletId) {
      where.walletId = walletId
    }

    if (type === 'INCOME' || type === 'EXPENSE') {
      where.type = type
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        const parsedStart = new Date(startDate)
        if (!isNaN(parsedStart.getTime())) {
          where.date.gte = parsedStart
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate)
        if (!isNaN(parsedEnd.getTime())) {
          parsedEnd.setHours(23, 59, 59, 999)
          where.date.lte = parsedEnd
        }
      }
    }

    if (minAmount || maxAmount) {
      const amountFilter: Prisma.DecimalFilter = {}
      if (minAmount) {
        const parsedMin = parseFloat(minAmount)
        if (!isNaN(parsedMin)) {
          amountFilter.gte = new Prisma.Decimal(parsedMin)
        }
      }
      if (maxAmount) {
        const parsedMax = parseFloat(maxAmount)
        if (!isNaN(parsedMax)) {
          amountFilter.lte = new Prisma.Decimal(parsedMax)
        }
      }
      if (Object.keys(amountFilter).length > 0) {
        where.amount = amountFilter
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        wallet: true,
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    if (transactions.length === 0) {
      return new Response(null, { status: 204 })
    }

    const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Wallet']
    const rows = transactions.map((transaction) => {
      const amountValue = Prisma.Decimal.isDecimal(transaction.amount)
        ? transaction.amount.toString()
        : String(transaction.amount ?? '')

      return [
        transaction.date.toISOString(),
        transaction.type,
        amountValue,
        transaction.description ?? '',
        transaction.category?.name ?? '',
        transaction.wallet?.name ?? '',
      ]
    })

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n')

    const walletName = transactions[0]?.wallet?.name ?? 'all-wallets'
    const slug = walletName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'all-wallets'
    const dateSlug = new Date().toISOString().split('T')[0]
    const fileName = `transactions-${slug}-${dateSlug}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json(
      { error: 'Failed to export transactions' },
      { status: 500 }
    )
  }
}
