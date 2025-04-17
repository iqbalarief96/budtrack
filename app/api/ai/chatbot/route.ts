import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateChatbotResponse } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { prompt, walletId, history } = body;
    
    if (!prompt) {
      return new NextResponse(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400 }
      );
    }
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        settings: true,
      },
    });
    
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }
    
    // Check if AI settings are configured
    if (!user.settings?.provider || !user.settings?.apiKey || !user.settings?.selectedModel) {
      return new NextResponse(
        JSON.stringify({ error: 'AI settings not configured' }),
        { status: 400 }
      );
    }
    
    // Get wallet data if walletId is provided
    let wallet = null;
    if (walletId) {
      wallet = await prisma.wallet.findUnique({
        where: {
          id: walletId,
          userId: user.id
        },
      });
      
      if (!wallet) {
        return new NextResponse(
          JSON.stringify({ error: 'Wallet not found' }),
          { status: 404 }
        );
      }
    }
    
    // Get user's financial data to provide context to AI
    const financialData = await getFinancialData(user.id, walletId);
    
    // Create context for AI
    const context = `
    Data Keuangan Pengguna:
    Nama: ${user.name || 'Pengguna'}
    Total Saldo: ${formatCurrency(financialData.totalBalance)}
    Transaksi Bulan Ini: ${financialData.transactions.length}
    Total Pemasukan Bulan Ini: ${formatCurrency(financialData.monthlyIncome)}
    Total Pengeluaran Bulan Ini: ${formatCurrency(financialData.monthlyExpense)}
    
    Detail Transaksi Bulan Ini:
    ${financialData.transactions
      .filter(t => t.amount < 0)
      .map(t => `- ${t.description}: ${formatCurrency(t.amount)} (${t.category?.name || 'Tanpa Kategori'})`)
      .join('\n')
    }
    
    Kategori Pengeluaran Terbesar: ${financialData.topCategory ? `${financialData.topCategory.name} (${formatCurrency(financialData.topCategory.amount)})` : 'Tidak ada data'}
    Jumlah Budget Aktif: ${financialData.budgets.length}
    
    Detail Dompet (${wallet ? wallet.name : 'Semua Dompet'}):
    ${wallet ? `Saldo: ${formatCurrency(wallet.balance)}` : financialData.wallets.map(w => `${w.name}: ${formatCurrency(w.balance)}`).join('\n')}
    
    Budgets:
    ${financialData.budgets.map(b => `${b.title}: ${formatCurrency(b.amount)} (Terpakai: ${formatCurrency(b.spent)} - ${b.percentUsed}%)`).join('\n')}
    
    Transaksi Terbaru:
    ${financialData.recentTransactions.map(t => `${new Date(t.date).toLocaleDateString()}: ${t.description} - ${formatCurrency(t.amount)} (${t.categoryName})`).join('\n')}
    
    Saat merespons, bersikaplah seperti asisten keuangan santai dan ramah. Gunakan bahasa Indonesia yang santai (campuran bahasa Inggris-Indonesia gaya anak Jaksel, seperti "cash flow kamu", "budget management", "spending habits", dll).
    Berikan jawaban yang singkat, jelas, dan bermanfaat. Buat analisis berdasarkan data pengguna.
    Jangan menginventasi data yang tidak tersedia. Jika tidak yakin, minta pengguna untuk menyediakan informasi lebih lanjut.
    `;
    
    // Generate AI response
    const aiResponse = await generateChatbotResponse({
      prompt,
      provider: user.settings.provider,
      apiKey: user.settings.apiKey,
      model: user.settings.selectedModel,
      context,
      history: history || [],
    });
    
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    // Log detailed error info
    if (error instanceof Error) {
      console.error('Error in chatbot API:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      console.error('Unknown error in chatbot API:', error);
    }
    
    // Return more descriptive error
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500 }
    );
  }
}

// Helper function to get user's financial data
async function getFinancialData(userId: string, walletId?: string) {
  try {
    // Get all user wallets or specific wallet
    const wallets = await prisma.wallet.findMany({
      where: walletId
        ? { id: walletId, userId }
        : { userId },
    });
    
    // Handle no wallets case
    if (wallets.length === 0) {
      return {
        totalBalance: 0,
        transactions: [],
        wallets: [],
        monthlyIncome: 0,
        monthlyExpense: 0,
        topCategory: null,
        recentTransactions: [],
        budgets: [],
      };
    }
    
    // Calculate total balance
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    
    // Get current month transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    console.log('Date filters:', {
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString(),
      currentDate: now.toISOString()
    });
    
    // Get transactions for this month
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId: walletId 
          ? walletId 
          : { in: wallets.map(w => w.id) },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    console.log(`Found ${transactions.length} transactions for this month`);
    
    // Get recent transactions
    const recentTransactions = transactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date,
      categoryName: t.category?.name || 'Uncategorized',
    }));
    
    // Calculate monthly income and expense
    const monthlyIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Check which categories are expenses based on name
    const expenseCategories = ['Makanan', 'Food', 'Transport', 'Transportasi', 'Entertainment', 'Shopping', 'Savings', 'Health'];
    
    // Identify expenses by category name, not just by negative amount
    const expenseTransactions = transactions.filter(t => {
      // Consider as expense if category is in expense list or not income-related (Gaji, Bonus, etc)
      const isExpenseCategory = t.category?.name && expenseCategories.includes(t.category.name);
      const isIncomeCategory = t.category?.name && ['Gaji', 'Bonus', 'Income', 'Pendapatan'].includes(t.category.name);
      
      return isExpenseCategory || (!isIncomeCategory && t.description !== 'Gaji' && t.description !== 'Tunjangan');
    });
    
    console.log('Expense transactions count:', expenseTransactions.length);
    console.log('Expense transactions:', expenseTransactions.map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category?.name
    })));
    
    const monthlyExpense = expenseTransactions
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log('Calculated monthlyExpense:', monthlyExpense);
    
    // Get top expense category
    const categoryExpenses = expenseTransactions
      .reduce((acc, t) => {
        const categoryName = t.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName] += t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const categories = Object.entries(categoryExpenses)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    const topCategory = categories.length > 0 ? categories[0] : null;
    
    // Get user's budgets
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        endDate: {
          gte: new Date()
        }
      },
      include: {
        category: true,
      },
    });
    
    // Calculate budget usage
    const budgetsWithUsage = await Promise.all(
      budgets.map(async (budget) => {
        try {
          // Get transactions for this budget's category
          const budgetTransactions = await prisma.transaction.findMany({
            where: {
              walletId: walletId 
                ? walletId 
                : { in: wallets.map(w => w.id) },
              categoryId: budget.categoryId,
              date: {
                gte: budget.startDate || startOfMonth,
                lte: budget.endDate || new Date(),
              },
              OR: [
                { 
                  category: {
                    name: {
                      in: ['Makanan', 'Food', 'Transport', 'Transportasi', 'Entertainment', 'Shopping', 'Savings', 'Health']
                    }
                  } 
                },
                {
                  AND: [
                    {
                      category: {
                        name: {
                          notIn: ['Gaji', 'Bonus', 'Income', 'Pendapatan']
                        }
                      }
                    },
                    {
                      description: {
                        notIn: ['Gaji', 'Tunjangan']
                      }
                    }
                  ]
                }
              ]
            },
          });
          
          const spent = budgetTransactions.length > 0 
            ? budgetTransactions.reduce((sum, t) => sum + t.amount, 0)
            : 0;
          const percentUsed = budget.amount > 0 
            ? Math.round((spent / budget.amount) * 100)
            : 0;
          
          return {
            id: budget.id,
            title: `Budget: ${budget.category?.name || 'Uncategorized'}`,
            amount: budget.amount,
            spent,
            percentUsed,
            category: budget.category?.name || 'Uncategorized',
          };
        } catch (error) {
          console.error(`Error processing budget ${budget.id}:`, error);
          // Return default values on error
          return {
            id: budget.id,
            title: `Budget: ${budget.category?.name || 'Uncategorized'}`,
            amount: budget.amount,
            spent: 0,
            percentUsed: 0,
            category: budget.category?.name || 'Uncategorized',
          };
        }
      })
    );
    
    return {
      totalBalance,
      transactions,
      wallets: wallets.map(w => ({
        id: w.id,
        name: w.name,
        balance: w.balance,
      })),
      monthlyIncome,
      monthlyExpense,
      topCategory,
      recentTransactions,
      budgets: budgetsWithUsage,
    };
  } catch (error) {
    console.error('Error getting financial data:', error);
    // Return empty data on error
    return {
      totalBalance: 0,
      transactions: [],
      wallets: [],
      monthlyIncome: 0,
      monthlyExpense: 0,
      topCategory: null,
      recentTransactions: [],
      budgets: [],
    };
  }
}

// Helper function to format currency
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
} 