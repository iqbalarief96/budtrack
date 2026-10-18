import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/transactions/export
 * Export transaksi pengguna ke format CSV
 * Query params opsional:
 * - from: YYYY-MM-DD
 * - to: YYYY-MM-DD
 * - walletId: ID dompet
 * - type: INCOME | EXPENSE
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    let userId = session?.user?.id

    // Fallback via Bearer token
    if (!userId) {
      const authHeader = req.headers.get('authorization')
      const expectedKey = process.env.QUICK_CAPTURE_API_KEY
      if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === expectedKey) {
        const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
        const u = await prisma.user.findFirst({ where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] }, select: { id: true } })
        if (u) userId = u.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const walletId = searchParams.get('wallet') || searchParams.get('walletId')
    const type = searchParams.get('type')

    const where: any = { userId }
    if (walletId) where.walletId = walletId
    if (type) where.type = type
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.date.lte = toDate
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true } },
        wallet: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10000,
    })

    // Bangun CSV
    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Dompet', 'Tipe', 'Nominal']
    const escapeCsv = (str: string | null | undefined): string => {
      if (!str) return ''
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = transactions.map((t) => [
      t.date.toISOString().slice(0, 10),
      escapeCsv(t.description || ''),
      escapeCsv(t.category?.name || 'Lain-lain'),
      escapeCsv(t.wallet?.name || '-'),
      t.type,
      t.amount.toString(),
    ].join(','))

    const csvContent = [headers.join(','), ...rows].join('\r\n')
    const dateStr = new Date().toISOString().slice(0, 10)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="budtrack-transaksi-${dateStr}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Export transactions error:', error)
    return NextResponse.json({ error: error.message || 'Gagal export data' }, { status: 500 })
  }
}
