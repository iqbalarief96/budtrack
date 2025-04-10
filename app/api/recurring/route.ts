import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// GET /api/recurring
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const walletId = searchParams.get('walletId')
    
    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 })
    }
    
    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        user: {
          email: session.user.email
        }
      }
    })
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: {
        walletId: walletId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(recurringTransactions)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 })
  }
}

// POST /api/recurring
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, amount, category, frequency, startDate, walletId, description, type } = body
    
    // Validate required fields
    if (!name || !amount || !frequency || !startDate || !walletId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Validate type
    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }
    
    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        user: {
          email: session.user.email
        }
      }
    })
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Calculate next payment date
    const nextPaymentDate = new Date(startDate)
    
    console.log('Creating recurring transaction with data:', {
      name,
      amount: Number(amount),
      category,
      frequency,
      startDate: new Date(startDate),
      nextPaymentDate,
      description,
      type,
      walletId,
      userId: user.id
    })
    
    // Create the recurring transaction
    const recurringTransaction = await prisma.recurringTransaction.create({
      data: {
        name,
        amount: Number(amount),
        category,
        frequency,
        startDate: new Date(startDate),
        nextPaymentDate,
        description,
        isActive: true,
        type,
        wallet: {
          connect: {
            id: walletId
          }
        },
        user: {
          connect: {
            id: user.id
          }
        }
      }
    })
    
    // Konversi tipe ke format yang benar untuk model Transaction (kapital)
    const formattedType = type.toUpperCase() as 'INCOME' | 'EXPENSE'
    
    console.log(`Creating new transaction for recurring: ${name} with type ${formattedType} and amount ${amount}`)
    
    // Validasi category jika ada
    let categoryId = null
    if (category) {
      // Category bisa berupa ID atau nama
      // Coba cari langsung dengan ID dulu
      let categoryObj = await prisma.category.findFirst({
        where: {
          id: category,
          userId: user.id
        }
      });

      // Jika tidak ditemukan dengan ID, mungkin itu nama kategori
      if (!categoryObj) {
        categoryObj = await prisma.category.findFirst({
          where: {
            name: category,
            userId: user.id
          }
        });
      }
      
      if (categoryObj) {
        categoryId = categoryObj.id;
        console.log(`Kategori '${categoryObj.name}' ditemukan dengan id: ${categoryId}`);
      } else {
        console.log(`Kategori '${category}' tidak ditemukan`);
      }
    }
    
    // Tentukan tanggal transaksi (hari ini)
    const transactionDate = new Date();
    
    // Buat transaksi baru untuk saat ini
    const transaction = await prisma.transaction.create({
      data: {
        amount: Number(amount),
        description: name,
        date: transactionDate,
        type: formattedType,
        categoryId: categoryId,
        walletId: walletId,
        userId: user.id
      }
    });
    
    console.log('Transaction created:', transaction)
    
    // Update saldo wallet
    let newBalance = wallet.balance;
    
    if (formattedType === 'INCOME') {
      newBalance = wallet.balance + Number(amount);
      console.log(`Income: Adding ${amount} to wallet balance. Old: ${wallet.balance}, New: ${newBalance}`);
    } else { // EXPENSE (termasuk savings)
      newBalance = wallet.balance - Number(amount);
      console.log(`Expense: Subtracting ${amount} from wallet balance. Old: ${wallet.balance}, New: ${newBalance}`);
    }
    
    await prisma.wallet.update({
      where: { id: walletId },
      data: { balance: newBalance }
    });
    
    // Get updated wallet to verify balance change
    const updatedWallet = await prisma.wallet.findUnique({
      where: { id: walletId }
    });
    
    console.log('Wallet balance updated:', {
      oldBalance: wallet.balance,
      newBalance: updatedWallet?.balance,
      difference: (updatedWallet?.balance || 0) - wallet.balance
    });
    
    return NextResponse.json(recurringTransaction, { status: 201 })
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
    return NextResponse.json({ error: 'Failed to create recurring transaction' }, { status: 500 })
  }
}

// DELETE /api/recurring
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }
    
    // Verify transaction belongs to user
    const transaction = await prisma.recurringTransaction.findFirst({
      where: {
        id,
        wallet: {
          user: {
            email: session.user.email
          }
        }
      }
    })
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    // Delete the transaction
    await prisma.recurringTransaction.delete({
      where: {
        id
      }
    })
    
    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    return NextResponse.json({ error: 'Failed to delete recurring transaction' }, { status: 500 })
  }
} 