import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null

    const authHeader = req.headers.get('authorization')
    const queryKey = req.nextUrl.searchParams.get('key')
    const expectedKey = process.env.QUICK_CAPTURE_API_KEY

    let providedKey = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim()
    } else if (queryKey) {
      providedKey = queryKey.trim()
    }

    if (expectedKey && providedKey && providedKey === expectedKey) {
      const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
      const user = await prisma.user.findFirst({
        where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] },
        select: { id: true },
      })
      if (user) userId = user.id
    }

    if (!userId) {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const limitParam = req.nextUrl.searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 365) : 30

    // Filter by walletId (opsional)
    const walletParam = req.nextUrl.searchParams.get('wallet')
    let walletFilter: any = {}

    if (walletParam === '_all') {
      // Semua wallet — tanpa filter walletId
    } else if (walletParam) {
      // Cari wallet by name
      const wallet = await prisma.wallet.findFirst({
        where: {
          userId,
          name: walletParam,
        },
        select: { id: true },
      })
      if (wallet) {
        walletFilter = { walletId: wallet.id }
      } else {
        // Wallet nggak ditemukan — return empty
        return NextResponse.json({ success: true, data: [], count: 0, wallets: [] })
      }
    } else {
      // Default: tanpa filter (semua data milik user ini)
    }

    const metrics = await prisma.healthMetric.findMany({
      where: { userId, ...walletFilter },
      include: { wallet: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: limit,
    })

    // Ambil daftar wallet yang punya data health (untuk dropdown UI)
    const walletsWithHealth = await prisma.healthMetric.findMany({
      where: { userId },
      select: { walletId: true },
      distinct: ['walletId'],
    })

    const walletIds = walletsWithHealth
      .map((w) => w.walletId)
      .filter((id): id is string => id !== null)

    let wallets: { id: string; name: string }[] = []
    if (walletIds.length > 0) {
      wallets = await prisma.wallet.findMany({
        where: { id: { in: walletIds } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    }

    // Cek apakah ada data tanpa wallet (migrasi lama)
    const hasUnlinked = walletsWithHealth.some((w) => w.walletId === null)

    return NextResponse.json({
      success: true,
      data: metrics,
      count: metrics.length,
      wallets, // Dropdown options
      hasUnlinkedData: hasUnlinked, // Ada data lama tanpa wallet
    })
  } catch (error: any) {
    console.error('Fetch health error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat data kesehatan.' },
      { status: 500 }
    )
  }
}
