import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/wallets/recalculate-all
// Endpoint ini akan menghitung ulang saldo semua wallet berdasarkan riwayat transaksi
export async function POST(request: NextRequest) {
  try {
    // Bypass authentication for now
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('Starting wallet balance recalculation...')
    
    // 1. Ambil semua wallet (tanpa filter user untuk sementara)
    const wallets = await prisma.wallet.findMany()
    
    console.log(`Found ${wallets.length} wallets total`)
    
    if (wallets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No wallets found to recalculate.',
        results: []
      })
    }
    
    const results = []
    
    // 2. Loop setiap wallet
    for (const wallet of wallets) {
      console.log(`Processing wallet: ${wallet.name} (ID: ${wallet.id})`)
      
      // 3. Ambil semua transaksi untuk wallet ini
      const transactions = await prisma.transaction.findMany({
        where: {
          walletId: wallet.id
        }
      })
      
      // 4. Hitung saldo seharusnya
      let calculatedBalance = 0
      transactions.forEach(tx => {
        if (tx.type === 'INCOME') {
          calculatedBalance += tx.amount
        } else if (tx.type === 'EXPENSE') {
          calculatedBalance -= tx.amount
        }
      })
      
      console.log(`  - Found ${transactions.length} transactions.`)
      console.log(`  - Current DB balance: ${wallet.balance}`)
      console.log(`  - Calculated balance: ${calculatedBalance}`)
      
      // 5. Update balance di database jika berbeda
      if (wallet.balance !== calculatedBalance) {
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: calculatedBalance }
        })
        console.log(`  - Balance updated in DB.`)
        results.push({
          walletId: wallet.id,
          walletName: wallet.name,
          oldBalance: wallet.balance,
          newBalance: calculatedBalance,
          status: 'Updated'
        })
      } else {
        console.log(`  - Balance is already correct. No update needed.`)
        results.push({
          walletId: wallet.id,
          walletName: wallet.name,
          oldBalance: wallet.balance,
          newBalance: calculatedBalance,
          status: 'No Change'
        })
      }
    }
    
    console.log('Recalculation finished.')
    
    return NextResponse.json({
      success: true,
      message: `Recalculated balances for ${wallets.length} wallets.`,
      results
    })

  } catch (error) {
    console.error('Error recalculating wallet balances:', error)
    return NextResponse.json({ 
      error: 'Failed to recalculate wallet balances',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 