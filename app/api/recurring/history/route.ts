import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Define interfaces for our data
interface RecurringTransactionRecord {
  id: string;
  name: string;
  category: string | null;
  type: string;
}

interface TransactionRecord {
  id: string;
  amount: number;
  date: Date;
  categoryId: string | null;
  type: string;
}

// GET /api/recurring/history
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Recurring history API called');
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const walletId = searchParams.get('walletId')
    const recurringId = searchParams.get('recurringId')
    
    console.log(`📌 Request params: walletId=${walletId}, recurringId=${recurringId || 'not provided'}`);
    
    if (!walletId) {
      console.log('❌ Wallet ID is missing in request');
      return NextResponse.json({ error: 'Wallet ID is required' }, { status: 400 })
    }
    
    // Verify wallet belongs to user
    console.log(`🔍 Checking wallet ${walletId} for user ${session.user.email}`);
    
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        user: {
          email: session.user.email
        }
      }
    })
    
    if (!wallet) {
      console.log('❌ Wallet not found or does not belong to user');
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    console.log(`✅ Found wallet: ${wallet.name}`);
    
    // Get user id
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      },
      select: {
        id: true
      }
    })
    
    if (!user) {
      console.log('❌ User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log(`✅ Found user: ${user.id}`);
    
    // Find history records using the model directly
    // Using @ts-ignore to bypass TypeScript error until Prisma client is regenerated
    // @ts-ignore: Prisma client not updated yet
    let history = await prisma.recurringTransactionHistory.findMany({
      where: {
        recurringTransaction: {
          walletId: walletId,
          userId: user.id,
          ...(recurringId ? { id: recurringId } : {})
        }
      },
      include: {
        recurringTransaction: {
          select: {
            name: true,
            category: true,
            type: true
          }
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            date: true,
            type: true
          }
        }
      },
      orderBy: {
        processedDate: 'desc'
      }
    });
    
    console.log(`✅ Found ${history.length} history records`);
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('❌ Error in recurring history API:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch recurring transaction history',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 