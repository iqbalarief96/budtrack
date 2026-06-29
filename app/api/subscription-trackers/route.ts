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

function normalizePayload(body: any) {
  const status = typeof body.status === 'string' && VALID_STATUSES.has(body.status) ? body.status : 'active'
  const billingCycle = typeof body.billingCycle === 'string' && VALID_CYCLES.has(body.billingCycle) ? body.billingCycle : 'monthly'
  const amount = Number(body.amount ?? 0)
  const reminderDaysBefore = Number.parseInt(String(body.reminderDaysBefore ?? 3), 10)

  return {
    walletId: body.walletId || null,
    name: String(body.name || '').trim(),
    provider: body.provider ? String(body.provider).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    category: body.category ? String(body.category).trim() : 'other',
    amount: Number.isFinite(amount) ? amount : 0,
    currencyCode: body.currencyCode ? String(body.currencyCode).trim().toUpperCase() : 'IDR',
    billingCycle,
    status,
    startDate: parseDate(body.startDate),
    trialEndsAt: parseDate(body.trialEndsAt),
    nextBillingAt: parseDate(body.nextBillingAt),
    cancelBeforeAt: parseDate(body.cancelBeforeAt),
    reminderDaysBefore: Number.isFinite(reminderDaysBefore) ? Math.max(0, reminderDaysBefore) : 3,
    autoRenew: Boolean(body.autoRenew ?? true),
    reminderEnabled: Boolean(body.reminderEnabled ?? true),
    website: body.website ? String(body.website).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
  }
}

async function assertWalletOwnership(walletId: string | null, userId: string) {
  if (!walletId) return true

  const wallet = await prisma.wallet.findFirst({
    where: {
      id: walletId,
      userId,
    },
    select: { id: true },
  })

  return Boolean(wallet)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const walletId = searchParams.get('walletId')
    const search = searchParams.get('search')

    const subscriptions = await prisma.subscriptionTracker.findMany({
      where: {
        userId: session.user.id,
        ...(status ? { status } : {}),
        ...(walletId ? { walletId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { provider: { contains: search } },
                { category: { contains: search } },
              ],
            }
          : {}),
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
        { status: 'asc' },
        { trialEndsAt: 'asc' },
        { nextBillingAt: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ subscriptions, total: subscriptions.length })
  } catch (error) {
    console.error('Error fetching subscription trackers:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription trackers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = normalizePayload(body)

    if (!data.name) {
      return NextResponse.json({ error: 'Subscription name is required' }, { status: 400 })
    }

    const ownsWallet = await assertWalletOwnership(data.walletId, session.user.id)
    if (!ownsWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    const subscription = await prisma.subscriptionTracker.create({
      data: {
        ...data,
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

    return NextResponse.json({ subscription }, { status: 201 })
  } catch (error) {
    console.error('Error creating subscription tracker:', error)
    return NextResponse.json({ error: 'Failed to create subscription tracker' }, { status: 500 })
  }
}
