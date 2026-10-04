import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createAutoSavingsTransfer } from '@/lib/savings/auto-route'
import { autoTrackTransactionToGoals } from '../transactions/auto-track-goals'
import { detectSavingsType } from '@/lib/savingsTracker'
import { autoLinkSavingsToGoal } from '@/lib/savingsGoalAutoLink'

export const dynamic = 'force-dynamic'

function parseQuickCapture(input: string) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input teks kosong.')
  }

  // Pisahkan dengan tanda strip (-)
  const parts = input.split('-').map(s => s.trim()).filter(Boolean)
  if (parts.length < 4) {
    throw new Error('Format salah! Wajib: DESKRIPSI-KATEGORI-DOMPET-JUMLAH (contoh: Kopi Kenangan-Makanan-Dompet Utama-28000)')
  }

  const rawAmount = parts[parts.length - 1]
  const rawWallet = parts[parts.length - 2]
  const rawCategory = parts[parts.length - 3]
  const description = parts.slice(0, parts.length - 3).join(' - ')

  // Bersihkan dan parse jumlah
  let cleaned = rawAmount.toLowerCase().replace(/rp/g, '').replace(/\s/g, '').replace(/,/g, '.')
  let multiplier = 1

  if (cleaned.endsWith('jt') || cleaned.endsWith('m')) {
    multiplier = 1000000
    cleaned = cleaned.replace(/(jt|m)$/, '')
  } else if (cleaned.endsWith('k') || cleaned.endsWith('rb')) {
    multiplier = 1000
    cleaned = cleaned.replace(/(k|rb)$/, '')
  } else {
    // Hilangkan titik ribuan jika bukan format desimal k/rb
    cleaned = cleaned.replace(/\./g, '')
  }

  const amount = parseFloat(cleaned) * multiplier
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Nominal tidak valid: "${rawAmount}"`)
  }

  return {
    description,
    rawCategory,
    rawWallet,
    amount,
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validasi Autentikasi Token
    const authHeader = req.headers.get('authorization')
    const queryKey = req.nextUrl.searchParams.get('key')
    const expectedKey = process.env.QUICK_CAPTURE_API_KEY

    let providedKey = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7).trim()
    } else if (queryKey) {
      providedKey = queryKey.trim()
    }

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: API Key salah atau tidak ditemukan.' },
        { status: 401 }
      )
    }

    // 2. Ambil User Target
    const defaultEmail = process.env.QUICK_CAPTURE_DEFAULT_USER || 'muhamad.iqbal70@gmail.com'
    const user = await prisma.user.findFirst({
      where: { email: defaultEmail },
      include: {
        wallets: true,
        categories: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: `User dengan email ${defaultEmail} tidak ditemukan.` },
        { status: 404 }
      )
    }

    // 3. Baca body
    let rawText = ''
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      rawText = body.text || body.input || body.query || ''
    } else {
      rawText = await req.text()
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Payload kosong. Kirim teks atau json {"text": "DESKRIPSI-KATEGORI-DOMPET-JUMLAH"}' },
        { status: 400 }
      )
    }

    // 4. Parse text
    const { description, rawCategory, rawWallet, amount } = parseQuickCapture(rawText)

    // 5. Match Wallet
    const walletQuery = rawWallet.toLowerCase()
    let matchedWallet = user.wallets.find(w => w.name.toLowerCase() === walletQuery)
    if (!matchedWallet) {
      matchedWallet = user.wallets.find(w => 
        w.name.toLowerCase().includes(walletQuery) || walletQuery.includes(w.name.toLowerCase())
      )
    }
    if (!matchedWallet) {
      // Fallback ke Dompet Utama atau dompet pertama
      matchedWallet = user.wallets.find(w => w.type === 'MAIN') || user.wallets[0]
    }
    if (!matchedWallet) {
      return NextResponse.json(
        { success: false, error: 'User tidak memiliki dompet aktif.' },
        { status: 400 }
      )
    }

    // 6. Match Category
    const categoryQuery = rawCategory.toLowerCase()
    let matchedCategory = user.categories.find(c => c.name.toLowerCase() === categoryQuery)
    if (!matchedCategory) {
      matchedCategory = user.categories.find(c =>
        c.name.toLowerCase().includes(categoryQuery) || categoryQuery.includes(c.name.toLowerCase())
      )
    }

    // Deteksi tipe transaksi (INCOME vs EXPENSE)
    const incomeKeywords = ['gaji', 'bonus', 'pendapatan', 'income', 'hadiah', 'transfer masuk', 'profit', 'dividen']
    const isIncomeIntent = incomeKeywords.some(k => categoryQuery.includes(k) || description.toLowerCase().includes(k))
    const transactionType: 'INCOME' | 'EXPENSE' = matchedCategory?.type === 'INCOME' || isIncomeIntent ? 'INCOME' : 'EXPENSE'

    // Jika kategori belum ada sama sekali, buatkan otomatis
    if (!matchedCategory) {
      matchedCategory = await prisma.category.create({
        data: {
          name: rawCategory,
          type: transactionType,
          userId: user.id,
        },
      })
    }

    // 7. Eksekusi Transaksi (Atomic Transaction di DB)
    const now = new Date()
    const shouldIncrement = transactionType === 'INCOME'

    const transaction = await prisma.$transaction(async (tx) => {
      // Buat transaksi
      const createdTx = await tx.transaction.create({
        data: {
          amount,
          type: transactionType,
          date: now,
          description,
          userId: user.id,
          walletId: matchedWallet.id,
          categoryId: matchedCategory.id,
        },
        include: {
          category: true,
          wallet: true,
        },
      })

      // Update saldo dompet
      await tx.wallet.update({
        where: { id: matchedWallet.id },
        data: {
          balance: {
            [shouldIncrement ? 'increment' : 'decrement']: amount,
          },
        },
      })

      return createdTx
    })

    // 8. Background Hooks: Savings auto-transfer & Goal tracking
    try {
      if (transactionType === 'EXPENSE' && matchedCategory) {
        await createAutoSavingsTransfer({
          userId: user.id,
          sourceTransactionId: transaction.id,
          sourceWalletId: matchedWallet.id,
          categoryId: matchedCategory.id,
          amount,
          date: now,
          description,
          categoryName: matchedCategory.name,
        })
      }

      if (matchedCategory) {
        await autoTrackTransactionToGoals(
          transaction.id,
          matchedCategory.id,
          user.id,
          amount,
          transactionType,
          description,
          now
        )
      }

      if (transactionType === 'EXPENSE' && matchedCategory) {
        const savingsType = detectSavingsType(
          description ?? '',
          matchedCategory.name,
          matchedWallet.name
        )
        if (savingsType) {
          await autoLinkSavingsToGoal({
            userId: user.id,
            transactionId: transaction.id,
            amount,
            savingsType,
            date: now,
            description: description ?? '',
          })
        }
      }
    } catch (hookErr) {
      console.warn('Post-transaction hook warning:', hookErr)
    }

    // Revalidate dashboard paths
    try {
      revalidatePath('/dashboard')
      revalidatePath('/transactions')
    } catch (_) {}

    // 9. Format response ramah iOS Notification
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)

    const signSymbol = transactionType === 'INCOME' ? '+' : '-'
    const friendlyMessage = `✅ Tercatat: ${signSymbol}${formattedAmount} [${matchedWallet.name}] (${matchedCategory.name}) - ${description}`

    return NextResponse.json({
      success: true,
      message: friendlyMessage,
      data: {
        id: transaction.id,
        amount,
        type: transactionType,
        description,
        wallet: matchedWallet.name,
        category: matchedCategory.name,
        date: now.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Quick capture error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem saat memproses transaksi.',
      },
      { status: 400 }
    )
  }
}
