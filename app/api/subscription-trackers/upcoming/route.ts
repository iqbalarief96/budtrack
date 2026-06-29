import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(from)
  const end = new Date(to)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get('days') || '14', 10)
    const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(days, 90)) : 14
    const today = startOfToday()
    const until = addDays(today, safeDays)

    const subscriptions = await prisma.subscriptionTracker.findMany({
      where: {
        userId: session.user.id,
        reminderEnabled: true,
        status: { in: ['trial', 'active'] },
        OR: [
          { trialEndsAt: { lte: until } },
          { nextBillingAt: { lte: until } },
          { cancelBeforeAt: { lte: until } },
        ],
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            color: true,
            currencyCode: true,
          },
        },
      },
      orderBy: [
        { trialEndsAt: 'asc' },
        { cancelBeforeAt: 'asc' },
        { nextBillingAt: 'asc' },
      ],
    })

    const alerts = subscriptions
      .flatMap((subscription) => {
        const items = []
        const name = subscription.name

        if (subscription.status === 'trial' && subscription.trialEndsAt) {
          items.push({
            id: `${subscription.id}:trial`,
            type: 'trial_ending',
            severity: daysBetween(today, subscription.trialEndsAt) <= 3 ? 'high' : 'medium',
            title: `${name} trial mau habis`,
            dueAt: subscription.trialEndsAt,
            daysLeft: daysBetween(today, subscription.trialEndsAt),
            subscription,
          })
        }

        if (subscription.cancelBeforeAt) {
          items.push({
            id: `${subscription.id}:cancel`,
            type: 'cancel_before',
            severity: daysBetween(today, subscription.cancelBeforeAt) <= 3 ? 'high' : 'medium',
            title: `Cancel ${name} sebelum tanggal ini`,
            dueAt: subscription.cancelBeforeAt,
            daysLeft: daysBetween(today, subscription.cancelBeforeAt),
            subscription,
          })
        }

        if (subscription.nextBillingAt) {
          items.push({
            id: `${subscription.id}:billing`,
            type: 'next_billing',
            severity: daysBetween(today, subscription.nextBillingAt) <= 3 ? 'medium' : 'low',
            title: `${name} akan nagih`,
            dueAt: subscription.nextBillingAt,
            daysLeft: daysBetween(today, subscription.nextBillingAt),
            subscription,
          })
        }

        return items
      })
      .filter((alert) => alert.daysLeft <= safeDays)
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())

    return NextResponse.json({ alerts, total: alerts.length, days: safeDays })
  } catch (error) {
    console.error('Error fetching subscription tracker alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription tracker alerts' }, { status: 500 })
  }
}
