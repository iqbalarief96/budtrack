import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { summarizeCreditCard } from '@/lib/credit-cards'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { cardId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amount, walletId, date, note } = await request.json()
    const payAmount = Number(amount || 0)
    if (payAmount <= 0) return NextResponse.json({ error: 'Jumlah pembayaran harus > 0' }, { status: 400 })
    if (!walletId) return NextResponse.json({ error: 'Pilih dompet untuk pembayaran' }, { status: 400 })

    const card = await prisma.creditCard.findFirst({ where: { id: params.cardId, userId: session.user.id } })
    if (!card) return NextResponse.json({ error: 'Kartu kredit tidak ditemukan' }, { status: 404 })

    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId: session.user.id } })
    if (!wallet) return NextResponse.json({ error: 'Dompet tidak ditemukan' }, { status: 404 })

    const payDate = date ? new Date(date) : new Date()
    const newCardBalance = Math.max(0, card.currentBalance - payAmount)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat transaksi pembayaran CC
      const ccTx = await tx.creditCardTransaction.create({
        data: {
          userId: session.user.id,
          cardId: params.cardId,
          amount: payAmount,
          type: 'payment',
          merchant: `Bayar CC ${card.name}`,
          description: note || `Pembayaran tagihan via dompet ${wallet.name}`,
          date: payDate,
        },
      })

      // 2. Buat transaksi pengeluaran di Wallet
      const walletTx = await tx.transaction.create({
        data: {
          userId: session.user.id,
          walletId: wallet.id,
          amount: payAmount,
          type: 'EXPENSE',
          description: `Bayar Kartu Kredit: ${card.name}`,
          date: payDate,
        },
      })

      // 3. Potong saldo wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - payAmount },
      })

      // 4. Update saldo kartu kredit
      const updatedCard = await tx.creditCard.update({
        where: { id: params.cardId },
        data: { currentBalance: newCardBalance },
        include: { wallet: { select: { id: true, name: true, color: true, currencyCode: true } } },
      })

      return { ccTx, walletTx, updatedWallet, updatedCard }
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil membayar ${card.name} sebesar Rp${payAmount.toLocaleString('id-ID')} via ${wallet.name}`,
      creditCard: { ...result.updatedCard, summary: summarizeCreditCard(result.updatedCard) },
      wallet: result.updatedWallet,
    })
  } catch (error) {
    console.error('Error paying credit card:', error)
    return NextResponse.json({ error: 'Gagal memproses pembayaran kartu kredit' }, { status: 500 })
  }
}
