import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { parseBillingText, validateBillingTransactions } from '@/lib/credit-cards/billing-parser'
import { transactionDelta, summarizeCreditCard } from '@/lib/credit-cards'

export const dynamic = 'force-dynamic'

const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15MB

function withSummary<T extends { creditLimit: number; currentBalance: number; statementDay: number; dueDay: number; minimumPaymentRate: number }>(card: T) {
  return { ...card, summary: summarizeCreditCard(card) }
}

export async function POST(request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const card = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!card) return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const password = (formData.get('password') as string | null) || ''

    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Extract text from PDF via pdftotext (poppler binary — supports password via -upw)
    let text: string
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)

      // Write bytes to temp file
      const { writeFileSync, unlinkSync } = await import('fs')
      const { join } = await import('path')
      const tmpPath = join('/tmp', `cc_billing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`)
      writeFileSync(tmpPath, bytes)

      try {
        const args = ['-layout']
        if (password) args.push('-upw', password)
        args.push(tmpPath, '-')
        const { stdout } = await execFileAsync('/usr/bin/pdftotext', args, { maxBuffer: 50 * 1024 * 1024, timeout: 30000 })
        text = stdout
      } finally {
        try { unlinkSync(tmpPath) } catch { /* ignore */ }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('password')) {
        return NextResponse.json({ error: 'Password PDF salah atau PDF butuh password.' }, { status: 400 })
      }
      return NextResponse.json({ error: `Gagal ekstrak PDF: ${msg.slice(0, 120)}` }, { status: 400 })
    }

    // Parse billing text
    const parsed = parseBillingText(text)
    const { valid, warnings } = validateBillingTransactions(parsed.transactions)

    if (valid.length === 0) {
      return NextResponse.json({ error: 'Tidak ada transaksi valid ditemukan di PDF. Pastikan file e-billing benar.' }, { status: 400 })
    }

    // Dedupe: cek transaksi yang udah ada (merchant + date + amount + type yang sama)
    const existing = await prisma.creditCardTransaction.findMany({
      where: { cardId: params.cardId },
      select: { merchant: true, date: true, amount: true, type: true },
    })
    const existingKeys = new Set(existing.map((e) => `${e.merchant}|${e.date.getTime()}|${e.amount}|${e.type}`))
    const unique = valid.filter((tx) => {
      const key = `${tx.merchant}|${tx.date ? new Date(tx.date).getTime() : 0}|${tx.amount}|${tx.type}`
      if (existingKeys.has(key)) return false
      existingKeys.add(key)
      return true
    })
    const skippedDupes = valid.length - unique.length

    if (unique.length === 0) {
      return NextResponse.json({ error: 'Semua transaksi di PDF ini sudah pernah diimport. Tidak ada data baru.', skippedDupes }, { status: 200 })
    }

    // Create transactions without modifying balance via delta, set currentBalance directly from e-Billing totalBalance
    const targetBalance = parsed.totalBalance != null ? parsed.totalBalance : card.currentBalance
    const created = []
    const errors: string[] = []
    for (const tx of unique) {
      try {
        const createdTx = await prisma.creditCardTransaction.create({
          data: {
            userId: session.user.id,
            cardId: params.cardId,
            amount: tx.amount,
            type: tx.type,
            description: tx.description || null,
            merchant: tx.merchant || null,
            category: tx.category || null,
            date: tx.date ? new Date(tx.date) : new Date(),
            installmentTenor: tx.installmentTenor ?? null,
            installmentTerm: tx.installmentTerm ?? null,
            originalAmount: tx.originalAmount ?? null,
            currency: tx.currency || 'IDR',
            exchangeRate: tx.exchangeRate ?? null,
            reversalOfId: null,
          },
        })
        created.push(createdTx)
      } catch (err) {
        errors.push(`${tx.merchant}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }

    // Update card balance to exact e-Billing statement balance
    const updatedCard = await prisma.creditCard.update({
      where: { id: params.cardId },
      data: { currentBalance: targetBalance },
      include: { wallet: { select: { id: true, name: true, color: true, currencyCode: true } } },
    })

    return NextResponse.json({
      parsed: {
        cardNumber: parsed.cardNumber,
        productName: parsed.productName,
        totalBalance: parsed.totalBalance,
        minimumPayment: parsed.minimumPayment,
        statementDate: parsed.statementDate,
        dueDate: parsed.dueDate,
        creditLimit: parsed.creditLimit,
        remainingInstallment: parsed.remainingInstallment,
      },
      transactions: created.map((t) => ({ id: t.id, merchant: t.merchant, amount: t.amount, type: t.type, date: t.date })),
      total: created.length,
      skippedDupes,
      errors,
      warnings,
      creditCard: withSummary(updatedCard),
    }, { status: created.length > 0 ? 201 : 400 })
  } catch (error) {
    console.error('Error importing billing PDF:', error)
    return NextResponse.json({ error: 'Failed to import billing PDF' }, { status: 500 })
  }
}
