import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { dismissReminder, snoozeReminder } from '@/lib/bill/reminder-service'

export const dynamic = 'force-dynamic'

type NotificationPayload = {
  kind: 'bill' | 'subscription'
  sourceId: string
  userId: string
  title: string
  message: string
  channels: Array<'telegram' | 'whatsapp'>
  metadata: Record<string, unknown>
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatIdr(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function daysUntil(date: Date) {
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function billPayload(reminder: Awaited<ReturnType<typeof findDueBillReminders>>[number]): NotificationPayload {
  const remainingDays = daysUntil(reminder.bill.dueDate)
  const dueText = remainingDays < 0 ? `${Math.abs(remainingDays)} hari lewat jatuh tempo` : `${remainingDays} hari lagi`

  return {
    kind: 'bill',
    sourceId: reminder.id,
    userId: reminder.userId,
    title: `Tagihan jatuh tempo: ${reminder.bill.name}`,
    message: `${reminder.bill.name} sebesar ${formatIdr(reminder.bill.amount)} jatuh tempo ${dueText}.`,
    channels: ['telegram', 'whatsapp'],
    metadata: {
      billId: reminder.billId,
      reminderId: reminder.id,
      amount: reminder.bill.amount,
      dueDate: reminder.bill.dueDate.toISOString(),
      daysBefore: reminder.daysBefore,
      walletId: reminder.bill.walletId,
      categoryId: reminder.bill.categoryId,
    },
  }
}

function subscriptionPayload(subscription: Awaited<ReturnType<typeof findDueSubscriptions>>[number]): NotificationPayload {
  const eventDate = subscription.cancelBeforeAt ?? subscription.trialEndsAt ?? subscription.nextBillingAt
  const remainingDays = eventDate ? daysUntil(eventDate) : 0
  const suffix = subscription.trialEndsAt && subscription.trialEndsAt === eventDate
    ? 'trial berakhir'
    : subscription.cancelBeforeAt && subscription.cancelBeforeAt === eventDate
      ? 'batas cancel'
      : 'billing berikutnya'

  return {
    kind: 'subscription',
    sourceId: subscription.id,
    userId: subscription.userId,
    title: `Subscription reminder: ${subscription.name}`,
    message: `${subscription.name} (${formatIdr(subscription.amount)}) punya ${suffix} ${remainingDays <= 0 ? 'hari ini' : `dalam ${remainingDays} hari`}.`,
    channels: ['telegram', 'whatsapp'],
    metadata: {
      subscriptionId: subscription.id,
      provider: subscription.provider,
      amount: subscription.amount,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      eventDate: eventDate?.toISOString() ?? null,
      walletId: subscription.walletId,
    },
  }
}

async function findDueBillReminders(userId: string, horizonDays: number) {
  const now = new Date()
  const horizon = addDays(now, horizonDays)

  return prisma.billReminder.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'SNOOZED'] },
      OR: [
        { reminderDate: { lte: horizon } },
        { snoozedUntil: { lte: horizon } },
      ],
    },
    include: {
      bill: {
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          wallet: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { reminderDate: 'asc' },
  })
}

async function findDueSubscriptions(userId: string, horizonDays: number) {
  const now = new Date()
  const horizon = addDays(now, horizonDays)
  const today = startOfDay(now)

  return prisma.subscriptionTracker.findMany({
    where: {
      userId,
      reminderEnabled: true,
      status: { in: ['trial', 'active'] },
      OR: [
        { nextBillingAt: { lte: horizon } },
        { trialEndsAt: { lte: horizon } },
        { cancelBeforeAt: { lte: horizon } },
      ],
      AND: [
        {
          OR: [
            { lastReminderSentAt: null },
            { lastReminderSentAt: { lt: today } },
          ],
        },
      ],
    },
    include: { wallet: { select: { id: true, name: true } } },
    orderBy: [{ nextBillingAt: 'asc' }, { trialEndsAt: 'asc' }, { cancelBeforeAt: 'asc' }],
  })
}

async function createAlert(payload: NotificationPayload) {
  return prisma.alert.create({
    data: {
      userId: payload.userId,
      type: payload.kind === 'bill' ? 'BILL_REMINDER' : 'SUBSCRIPTION_REMINDER',
      title: payload.title,
      message: payload.message,
      additionalData: JSON.stringify({
        channels: payload.channels,
        delivery: {
          telegramReady: true,
          whatsappReady: true,
          deliveredAt: null,
        },
        ...payload.metadata,
      }),
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const horizonDays = Math.min(Math.max(Number(searchParams.get('days') ?? 7), 0), 60)

    const [billReminders, subscriptions, unreadAlerts] = await Promise.all([
      findDueBillReminders(session.user.id, horizonDays),
      findDueSubscriptions(session.user.id, horizonDays),
      prisma.alert.findMany({
        where: {
          userId: session.user.id,
          isRead: false,
          type: { in: ['BILL_REMINDER', 'SUBSCRIPTION_REMINDER'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const billNotifications = billReminders.map(billPayload)
    const subscriptionNotifications = subscriptions.map(subscriptionPayload)

    return NextResponse.json({
      horizonDays,
      counts: {
        billReminders: billReminders.length,
        subscriptionReminders: subscriptions.length,
        unreadAlerts: unreadAlerts.length,
      },
      billReminders,
      subscriptionReminders: subscriptions,
      notifications: [...billNotifications, ...subscriptionNotifications],
      unreadAlerts,
    })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun === true
    const horizonDays = Math.min(Math.max(Number(body.days ?? 0), 0), 60)

    const [billReminders, subscriptions] = await Promise.all([
      findDueBillReminders(session.user.id, horizonDays),
      findDueSubscriptions(session.user.id, horizonDays),
    ])

    const notifications = [
      ...billReminders.map(billPayload),
      ...subscriptions.map(subscriptionPayload),
    ]

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        for (const payload of notifications) {
          await tx.alert.create({
            data: {
              userId: payload.userId,
              type: payload.kind === 'bill' ? 'BILL_REMINDER' : 'SUBSCRIPTION_REMINDER',
              title: payload.title,
              message: payload.message,
              additionalData: JSON.stringify({
                channels: payload.channels,
                delivery: {
                  telegramReady: true,
                  whatsappReady: true,
                  deliveredAt: null,
                },
                ...payload.metadata,
              }),
            },
          })
        }

        if (billReminders.length > 0) {
          await tx.billReminder.updateMany({
            where: { id: { in: billReminders.map((reminder) => reminder.id) }, userId: session.user.id },
            data: { status: 'SENT' },
          })
        }

        if (subscriptions.length > 0) {
          await tx.subscriptionTracker.updateMany({
            where: { id: { in: subscriptions.map((subscription) => subscription.id) }, userId: session.user.id },
            data: { lastReminderSentAt: new Date() },
          })
        }
      })
    }

    return NextResponse.json({
      dryRun,
      processed: dryRun ? 0 : notifications.length,
      notifications,
    })
  } catch (error) {
    console.error('Error processing reminders:', error)
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const reminderId = String(body.reminderId || '')
    const action = String(body.action || '')

    if (!reminderId) {
      return NextResponse.json({ error: 'reminderId is required' }, { status: 400 })
    }

    if (action === 'dismiss') {
      await dismissReminder(reminderId, session.user.id)
      return NextResponse.json({ success: true })
    }

    if (action === 'snooze') {
      const hours = Math.min(Math.max(Number(body.hours ?? 24), 1), 24 * 30)
      const reminder = await snoozeReminder(reminderId, session.user.id, hours)
      return NextResponse.json({ success: true, reminder })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update reminder' }, { status: 500 })
  }
}
