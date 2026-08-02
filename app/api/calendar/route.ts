import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  buildMonthDates,
  parseMonthParam,
  projectRecurringIntoRange,
  toDateKey,
  isOverdue,
  type CalendarItem,
} from '@/lib/calendar/calendar-service'

export const dynamic = 'force-dynamic'

// GET /api/calendar?month=YYYY-MM&walletId=xxx
// Financial timeline: bills + recurring + goals + shared bills + transactions per day.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId') || undefined
    const { year, month, start, end, label } = parseMonthParam(searchParams.get('month'))

    const walletScope = walletId ? { walletId } : {}

    // 1. Bills (unpaid)
    const bills = await prisma.bill.findMany({
      where: { userId: session.user.id, isPaid: false, ...walletScope },
      include: { wallet: { select: { name: true } } },
    })

    // 2. Recurring transactions (active)
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: session.user.id, isActive: true, ...walletScope },
      include: { wallet: { select: { name: true } } },
    })

    // 3. Goals with deadline in month
    const goals = await prisma.goal.findMany({
      where: {
        userId: session.user.id,
        isArchived: false,
        status: { not: 'COMPLETED' },
        deadline: { gte: start, lte: end },
      },
    })

    // 4. Shared bills (not paid) due in month
    const sharedBills = await prisma.sharedBill.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'paid' },
        dueDate: { gte: start, lte: end },
        ...(walletId ? { walletId } : {}),
      },
      include: { wallet: { select: { name: true } } },
    })

    // 5. Transactions in month
    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id, date: { gte: start, lte: end }, ...walletScope },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        categoryId: true,
      },
    })

    const items: CalendarItem[] = []
    const overdue: CalendarItem[] = []
    const rangeStartKey = toDateKey(start)
    const rangeEndKey = toDateKey(end)

    const pushItem = (item: CalendarItem) => {
      items.push(item)
      if (item.isOverdue) overdue.push(item)
    }

    for (const bill of bills) {
      const title = bill.name
      const walletName = bill.wallet?.name
      if (bill.isRecurring && bill.frequency) {
        const occurrences = projectRecurringIntoRange(bill.dueDate, bill.frequency, start, end)
        for (const occ of occurrences) {
          const dateKey = toDateKey(occ)
          pushItem({
            kind: 'bill',
            id: bill.id,
            title,
            amount: bill.amount,
            date: dateKey,
            type: 'expense',
            walletId: bill.walletId,
            walletName,
            isOverdue: isOverdue(dateKey),
          })
        }
      } else {
        const dateKey = toDateKey(bill.dueDate)
        if (dateKey >= rangeStartKey && dateKey <= rangeEndKey) {
          pushItem({
            kind: 'bill',
            id: bill.id,
            title,
            amount: bill.amount,
            date: dateKey,
            type: 'expense',
            walletId: bill.walletId,
            walletName,
            isOverdue: isOverdue(dateKey),
          })
        } else if (isOverdue(dateKey)) {
          // unpaid past-due bill should surface in the overdue banner
          overdue.push({
            kind: 'bill',
            id: bill.id,
            title,
            amount: bill.amount,
            date: dateKey,
            type: 'expense',
            walletId: bill.walletId,
            walletName,
            isOverdue: true,
          })
        }
      }
    }

    for (const rec of recurring) {
      const occurrences = projectRecurringIntoRange(rec.nextPaymentDate, rec.frequency, start, end)
      for (const occ of occurrences) {
        const dateKey = toDateKey(occ)
        pushItem({
          kind: 'recurring',
          id: rec.id,
          title: rec.name,
          amount: rec.amount,
          date: dateKey,
          type: rec.type === 'income' ? 'income' : 'expense',
          walletId: rec.walletId,
          walletName: rec.wallet?.name,
          isOverdue: isOverdue(dateKey),
        })
      }
    }

    for (const goal of goals) {
      if (!goal.deadline) continue
      const dateKey = toDateKey(goal.deadline)
      const remaining = Math.max(0, (goal.target || 0) - (goal.current || 0))
      pushItem({
        kind: 'goal',
        id: goal.id,
        title: `Goal: ${goal.name}`,
        amount: remaining,
        date: dateKey,
        type: 'goal',
        isOverdue: isOverdue(dateKey),
      })
    }

    for (const sb of sharedBills) {
      if (!sb.dueDate) continue
      const dateKey = toDateKey(sb.dueDate)
      pushItem({
        kind: 'shared_bill',
        id: sb.id,
        title: sb.title,
        amount: sb.totalAmount,
        date: dateKey,
        type: 'expense',
        walletId: sb.walletId || undefined,
        walletName: sb.wallet?.name,
        isOverdue: isOverdue(dateKey),
      })
    }

    // Transactions grouped by day
    const txByDay: Record<string, typeof transactions> = {}
    const incomeByDay: Record<string, number> = {}
    const expenseByDay: Record<string, number> = {}
    for (const tx of transactions) {
      const key = toDateKey(tx.date)
      if (!txByDay[key]) {
        txByDay[key] = []
        incomeByDay[key] = 0
        expenseByDay[key] = 0
      }
      txByDay[key].push(tx)
      if (tx.type === 'INCOME') incomeByDay[key] += tx.amount
      else expenseByDay[key] += Math.abs(tx.amount)
    }

    const days = buildMonthDates(year, month).map((date) => ({
      date,
      income: Math.round(incomeByDay[date] || 0),
      expense: Math.round(expenseByDay[date] || 0),
      items: (items.filter((i) => i.date === date) || []).sort((a, b) => b.amount - a.amount),
      transactions: txByDay[date] || [],
    }))

    const summary = {
      income: Math.round(transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)),
      expense: Math.round(
        transactions.filter((t) => t.type !== 'INCOME').reduce((s, t) => s + Math.abs(t.amount), 0)
      ),
      net: Math.round(
        transactions.reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -Math.abs(t.amount)), 0)
      ),
    }

    return NextResponse.json({ month: label, days, overdue, summary })
  } catch (error) {
    console.error('[CALENDAR] Error:', error)
    return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 })
  }
}
