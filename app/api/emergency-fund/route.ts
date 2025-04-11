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

    // Get total balance from all transactions
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        wallet: true,
        category: true
      }
    });

    // Group transactions by wallet and calculate balance for each wallet
    const walletBalances = new Map();

    allTransactions.forEach(tx => {
      const walletId = tx.wallet.id;
      if (!walletBalances.has(walletId)) {
        walletBalances.set(walletId, 0);
      }

      const currentBalance = walletBalances.get(walletId);
      if (tx.type === 'INCOME') {
        walletBalances.set(walletId, currentBalance + tx.amount);
      } else if (tx.type === 'EXPENSE') {
        walletBalances.set(walletId, currentBalance - tx.amount);
      }

      console.log(`Processing wallet transaction:
        Wallet: ${tx.wallet.name}
        Type: ${tx.type}
        Amount: ${tx.amount}
        Category: ${tx.category?.name}
        Description: ${tx.description}
        New Balance: ${walletBalances.get(walletId)}`);
    });

    // Update wallet balances in database
    for (const [walletId, balance] of walletBalances) {
      await prisma.wallet.update({
        where: { id: walletId },
        data: { balance }
      });
    }

    // Calculate total balance from updated wallet balances
    const totalBalance = Array.from(walletBalances.values()).reduce((sum, balance) => sum + balance, 0);
    console.log('Total Balance from wallets:', totalBalance);

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

    // Calculate the accurate total balance that includes all wallet balances and savings
    const actualTotalBalance = totalBalance + totalSavings;
    console.log('Actual total balance (including savings):', actualTotalBalance);

    const response = {
      totalBalance: totalBalance,
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