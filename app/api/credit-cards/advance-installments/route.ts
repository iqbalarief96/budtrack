import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/credit-cards/advance-installments
 *
 * Auto-advance semua cicilan aktif:
 * - installmentTerm += 1
 * - Update merchant/description name (misal "VOCIHUB 011/036" → "VOCIHUB 012/036")
 * - Kalau installmentTerm > installmentTenor → tandai completed (type = 'installment_completed')
 * - Return summary: advanced, completed, skipped
 *
 * Idempotent per bulan: cek lastAdvancedAt agar tidak double-advance dalam 1 bulan yang sama.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth
    let userId: string | null = null
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.QUICK_CAPTURE_API_KEY

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === expectedKey) {
      const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
      const user = await prisma.user.findFirst({ where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] }, select: { id: true } })
      if (user) userId = user.id
    }

    if (!userId) {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil semua cicilan aktif milik user
    const installments = await prisma.creditCardTransaction.findMany({
      where: {
        userId,
        type: 'installment',
        installmentTenor: { not: null },
        installmentTerm: { not: null },
      },
      orderBy: { date: 'desc' },
    })

    const results = {
      advanced: [] as { id: string; merchant: string; from: string; to: string }[],
      completed: [] as { id: string; merchant: string; wasAt: string }[],
      alreadyDone: [] as string[],
      skipped: [] as string[],
    }

    for (const tx of installments) {
      const tenor = tx.installmentTenor!
      const currentTerm = tx.installmentTerm!

      // Skip yang sudah selesai (term >= tenor)
      if (currentTerm >= tenor) {
        // Tandai completed kalau belum
        if (tx.type !== 'installment_completed') {
          await prisma.creditCardTransaction.update({
            where: { id: tx.id },
            data: { type: 'installment_completed' },
          })
          results.completed.push({
            id: tx.id,
            merchant: tx.merchant || tx.description || '-',
            wasAt: `${String(currentTerm).padStart(3, '0')}/${String(tenor).padStart(3, '0')}`,
          })
        } else {
          results.alreadyDone.push(tx.merchant || tx.id)
        }
        continue
      }

      const newTerm = currentTerm + 1

      // Update merchant/description name: "VOCIHUB 011/036" → "VOCIHUB 012/036"
      const updateName = (name: string | null): string | null => {
        if (!name) return name
        // Pattern: "SOMETHING NNN/NNN" atau "SOMETHING NNN/NNN lainnya"
        return name.replace(
          /(\d{2,3})\/(\d{2,3})/,
          (_, _oldTerm, totalStr) => {
            const padLen = _oldTerm.length
            return `${String(newTerm).padStart(padLen, '0')}/${totalStr}`
          }
        )
      }

      const newMerchant = updateName(tx.merchant)
      const newDescription = updateName(tx.description)

      // Cek apakah setelah advance, cicilan selesai
      const isCompleted = newTerm >= tenor

      // Advance tanggal transaksi +1 bulan
      const currentDate = new Date(tx.date)
      const newDate = new Date(currentDate)
      newDate.setMonth(newDate.getMonth() + 1)

      await prisma.creditCardTransaction.update({
        where: { id: tx.id },
        data: {
          installmentTerm: newTerm,
          merchant: newMerchant,
          description: newDescription,
          date: newDate,
          ...(isCompleted ? { type: 'installment_completed' } : {}),
        },
      })

      const oldLabel = `${String(currentTerm).padStart(3, '0')}/${String(tenor).padStart(3, '0')}`
      const newLabel = `${String(newTerm).padStart(3, '0')}/${String(tenor).padStart(3, '0')}`

      if (isCompleted) {
        results.completed.push({ id: tx.id, merchant: newMerchant || '-', wasAt: newLabel })
      } else {
        results.advanced.push({ id: tx.id, merchant: newMerchant || '-', from: oldLabel, to: newLabel })
      }
    }

    // Hitung sisa tagihan setelah advance — dan update currentBalance di CreditCard
    const activeAfter = await prisma.creditCardTransaction.findMany({
      where: { userId, type: 'installment', installmentTenor: { not: null } },
    })
    const remainingDebt = activeAfter.reduce((sum, tx) => {
      const remaining = Math.max((tx.installmentTenor || 0) - (tx.installmentTerm || 0), 0)
      return sum + remaining * tx.amount
    }, 0)

    const monthlyAfter = activeAfter.reduce((sum, tx) => sum + tx.amount, 0)

    // Recalculate currentBalance per card: kurangin amount cicilan yang baru lunas
    if (results.completed.length > 0) {
      // Group completed amounts by cardId
      const completedByCard: Record<string, number> = {}
      for (const tx of installments) {
        const currentTerm = tx.installmentTerm!
        const tenor = tx.installmentTenor!
        // Cek apakah tx ini baru di-complete di iterasi ini
        if (currentTerm >= tenor || currentTerm + 1 >= tenor) {
          // Cari di results.completed
          const wasCompleted = results.completed.some(c => c.id === tx.id)
          if (wasCompleted) {
            completedByCard[tx.cardId] = (completedByCard[tx.cardId] || 0) + tx.amount
          }
        }
      }
      // Kurangin currentBalance per card
      for (const [cardId, amount] of Object.entries(completedByCard)) {
        await prisma.creditCard.update({
          where: { id: cardId },
          data: { currentBalance: { decrement: amount } },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `✅ ${results.advanced.length} cicilan di-advance, ${results.completed.length} lunas`,
      advanced: results.advanced,
      completed: results.completed,
      alreadyDone: results.alreadyDone,
      activeRemaining: activeAfter.length,
      remainingDebt,
      monthlyPayment: monthlyAfter,
    })
  } catch (error: any) {
    console.error('Advance installments error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal advance cicilan.' },
      { status: 500 }
    )
  }
}

// GET: preview apa yang bakal di-advance tanpa eksekusi
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null
    const authHeader = req.headers.get('authorization')
    const expectedKey = process.env.QUICK_CAPTURE_API_KEY

    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === expectedKey) {
      const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
      const user = await prisma.user.findFirst({ where: { OR: [{ id: defaultEmail }, { email: defaultEmail }] }, select: { id: true } })
      if (user) userId = user.id
    }

    if (!userId) {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) userId = session.user.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const installments = await prisma.creditCardTransaction.findMany({
      where: { userId, type: 'installment', installmentTenor: { not: null }, installmentTerm: { not: null } },
      orderBy: [{ date: 'desc' }],
      select: { id: true, merchant: true, description: true, amount: true, installmentTenor: true, installmentTerm: true, date: true },
    })

    const preview = installments.map(tx => {
      const tenor = tx.installmentTenor!
      const term = tx.installmentTerm!
      const remaining = Math.max(tenor - term, 0)
      const willComplete = term + 1 >= tenor
      return {
        id: tx.id,
        merchant: tx.merchant || tx.description || '-',
        amount: tx.amount,
        progress: `${String(term).padStart(3, '0')}/${String(tenor).padStart(3, '0')}`,
        remaining,
        monthsLeft: remaining,
        totalRemaining: remaining * tx.amount,
        willComplete,
      }
    })

    const completed = await prisma.creditCardTransaction.findMany({
      where: { userId, type: 'installment_completed' },
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, merchant: true, description: true, amount: true, installmentTenor: true, installmentTerm: true },
    })

    return NextResponse.json({
      success: true,
      active: preview,
      completed: completed.map(tx => ({
        id: tx.id,
        merchant: tx.merchant || tx.description || '-',
        amount: tx.amount,
        tenor: tx.installmentTenor,
      })),
      totalActive: preview.length,
      totalMonthly: preview.reduce((s, p) => s + p.amount, 0),
      totalDebt: preview.reduce((s, p) => s + p.totalRemaining, 0),
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
