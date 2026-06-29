import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const VALID_STATUSES = new Set(['trial', 'active', 'paused', 'cancelled', 'expired'])
const VALID_CYCLES = new Set(['weekly', 'monthly', 'quarterly', 'yearly', 'one_time', 'trial_only'])

function parseDate(value: unknown) {
  if (!value || typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizePatch(body: any) {
  const data: Record<string, unknown> = {}

  if ('walletId' in body) data.walletId = body.walletId || null
  if ('name' in body) data.name = String(body.name || '').trim()
  if ('provider' in body) data.provider = body.provider ? String(body.provider).trim() : null
  if ('description' in body) data.description = body.description ? String(body.description).trim() : null
  if ('category' in body) data.category = body.category ? String(body.category).trim() : 'other'
  if ('amount' in body) {
    const amount = Number(body.amount ?? 0)
    data.amount = Number.isFinite(amount) ? amount : 0
  }
  if ('currencyCode' in body) data.currencyCode = body.currencyCode ? String(body.currencyCode).trim().toUpperCase() : 'IDR'
  if ('billingCycle' in body && VALID_CYCLES.has(String(body.billingCycle))) data.billingCycle = String(body.billingCycle)
  if ('status' in body && VALID_STATUSES.has(String(body.status))) data.status = String(body.status)
  if ('startDate' in body) data.startDate = parseDate(body.startDate)
  if ('trialEndsAt' in body) data.trialEndsAt = parseDate(body.trialEndsAt)
  if ('nextBillingAt' in body) data.nextBillingAt = parseDate(body.nextBillingAt)
  if ('cancelBeforeAt' in body) data.cancelBeforeAt = parseDate(body.cancelBeforeAt)
  if ('reminderDaysBefore' in body) {
    const days = Number.parseInt(String(body.reminderDaysBefore ?? 3), 10)
    data.reminderDaysBefore = Number.isFinite(days) ? Math.max(0, days) : 3
  }
  if ('autoRenew' in body) data.autoRenew = Boolean(body.autoRenew)
  if ('reminderEnabled' in body) data.reminderEnabled = Boolean(body.reminderEnabled)
  if ('website' in body) data.website = body.website ? String(body.website).trim() : null
  if ('notes' in body) data.notes = body.notes ? String(body.notes).trim() : null

  return data
}

async function getOwnedSubscription(subscriptionId: string, userId: string) {
  return prisma.subscriptionTracker.findFirst({
    where: {
      id: subscriptionId,
      userId,
    },
  })
}

async function assertWalletOwnership(walletId: unknown, userId: string) {
  if (!walletId || typeof walletId !== 'string') return true

  const wallet = await prisma.wallet.findFirst({
    where: {
      id: walletId,
      userId,
    },
    select: { id: true },
  })

  return Boolean(wallet)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await prisma.subscriptionTracker.findFirst({
      where: {
        id: params.subscriptionId,
        userId: session.user.id,
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
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error fetching subscription tracker:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription tracker' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await getOwnedSubscription(params.subscriptionId, session.user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const body = await request.json()
    const data = normalizePatch(body)

    if ('name' in data && !data.name) {
      return NextResponse.json({ error: 'Subscription name is required' }, { status: 400 })
    }

    if ('walletId' in data) {
      const ownsWallet = await assertWalletOwnership(data.walletId, session.user.id)
      if (!ownsWallet) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
      }
    }

    const subscription = await prisma.subscriptionTracker.update({
      where: { id: params.subscriptionId },
      data,
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
    })

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error updating subscription tracker:', error)
    return NextResponse.json({ error: 'Failed to update subscription tracker' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await getOwnedSubscription(params.subscriptionId, session.user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    await prisma.subscriptionTracker.delete({
      where: { id: params.subscriptionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subscription tracker:', error)
    return NextResponse.json({ error: 'Failed to delete subscription tracker' }, { status: 500 })
  }
}
