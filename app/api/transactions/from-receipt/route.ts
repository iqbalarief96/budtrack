import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { ReceiptData } from '@/lib/receipt-scanner'

// POST /api/transactions/from-receipt - Save confirmed receipt data
export async function POST(request: NextRequest) {
  try {
    console.log('[FROM-RECEIPT] Request received')

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('[FROM-RECEIPT] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data, walletId, categoryId } = body as {
      data: ReceiptData
      walletId: string
      categoryId?: string
    }

    console.log('[FROM-RECEIPT] Received data:', {
      itemsCount: data?.items?.length,
      totalAmount: data?.transaction?.total_amount,
      walletId,
      categoryId,
      fullData: JSON.stringify(data, null, 2)
    })

    // Validate data
    if (!data || !data.transaction || !data.items || !walletId) {
      return NextResponse.json(
        { error: 'Invalid data. Missing required fields.' },
        { status: 400 }
      )
    }

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id,
      },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Get or create category
    let category
    if (categoryId) {
      category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: session.user.id,
        },
      })
    }

    if (!category) {
      // Create default "Belanja" category
      category = await prisma.category.create({
        data: {
          userId: session.user.id,
          name: 'Belanja',
          type: 'EXPENSE',
          icon: '🛒',
          color: '#10B981',
        },
      })
      console.log('[FROM-RECEIPT] Created new category:', category.id)
    }

    console.log('[FROM-RECEIPT] Using category:', category.id, category.name)

    // Create transaction with items in a single database operation
    console.log('[FROM-RECEIPT] Creating transaction with items...')
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        walletId: wallet.id,
        categoryId: category.id,
        description: data.transaction.description,
        amount: data.transaction.total_amount,
        date: new Date(data.transaction.date),
        type: 'EXPENSE',
        // Create items inline using nested create
        items: {
          create: data.items.map((item, index) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            notes: item.notes || null,
            category: item.category || null,
            order: index,
          })),
        },
      },
      include: {
        items: true,
        wallet: true,
        category: true,
      },
    })

    console.log('[FROM-RECEIPT] Success! Created transaction:', transaction.id)
    console.log('[FROM-RECEIPT] Created items:', transaction.items.length)

    return NextResponse.json({
      success: true,
      transaction,
      message: `Transaction created with ${transaction.items.length} items!`,
    })
  } catch (error) {
    console.error('[FROM-RECEIPT] Error:', error)
    console.error('[FROM-RECEIPT] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
