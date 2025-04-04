import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session found');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('User ID:', session.user.id);

    // Get total balance from all wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        balance: true
      }
    });

    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    console.log('Total Balance:', totalBalance);

    // Get savings transactions grouped by description
    const savingsTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        description: {
          startsWith: 'Tabungan'
        },
        category: {
          name: 'Savings'
        }
      },
      orderBy: {
        date: 'desc'
      },
      include: {
        category: true,
        wallet: true
      }
    });

    console.log('Found savings transactions:', savingsTransactions.length);
    console.log('Raw transactions:', JSON.stringify(savingsTransactions, null, 2));

    // Get all categories of type SAVINGS
    const savingsCategories = await prisma.category.findMany({
      where: {
        userId: session.user.id,
        type: 'SAVINGS'
      }
    });

    console.log('Savings categories:', JSON.stringify(savingsCategories, null, 2));

    // Calculate savings by description
    const savingsByType = savingsTransactions.reduce((acc, transaction) => {
      // Use transaction description as the key, fallback to category name or 'Other Savings'
      const description = transaction.description || 
                         (transaction.category?.name ?? 'Other Savings');
      
      // Initialize if not exists
      if (!acc[description]) {
        acc[description] = 0;
      }

      // For savings:
      // - EXPENSE means money is being saved (added to savings)
      // - INCOME means money is being withdrawn from savings
      const amount = transaction.type === 'EXPENSE' ? transaction.amount : -transaction.amount;
      acc[description] += amount;

      console.log(`Processing transaction:
        Description: ${description}
        Type: ${transaction.type}
        Amount: ${amount}
        Category: ${transaction.category?.name}
        Category Type: ${transaction.category?.type}
        Running total for ${description}: ${acc[description]}`);

      return acc;
    }, {} as Record<string, number>);

    console.log('Initial savings by type:', savingsByType);

    // Filter out zero or negative balances and format the result
    const filteredSavingsByType: Record<string, number> = {};
    for (const [description, amount] of Object.entries(savingsByType)) {
      if (amount > 0) {
        filteredSavingsByType[description] = amount;
      }
    }

    console.log('Filtered savings:', filteredSavingsByType);

    // Calculate total savings from filtered amounts
    const totalSavings = Object.values(filteredSavingsByType).reduce((sum, amount) => sum + amount, 0);
    console.log('Total savings:', totalSavings);

    const response = {
      totalBalance,
      emergencyFund: totalBalance,
      totalSavings,
      savingsByType: filteredSavingsByType
    };

    console.log('Final response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating emergency fund:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 