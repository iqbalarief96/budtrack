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
    
    Transaksi Tahun Ini: ${financialData.allTransactions.filter(t => {
      const date = new Date(t.date);
      const now = new Date();
      return date.getFullYear() === now.getFullYear();
    }).length}
    Total Pemasukan Tahun Ini: ${formatCurrency(financialData.yearlyIncome)}
    Total Pengeluaran Tahun Ini: ${formatCurrency(financialData.yearlyExpense)}
    
    Total Semua Transaksi: ${financialData.allTransactions.length}
    
    Detail Transaksi Bulan Ini:
    ${financialData.transactions
      .filter(t => t.amount < 0)
      .map(t => `- ${t.description}: ${formatCurrency(t.amount)} (${t.category?.name || 'Tanpa Kategori'})`)
      .join('\n')
    }
    
    Kategori Pengeluaran Terbesar Tahun Ini: ${financialData.topCategory ? `${financialData.topCategory.name} (${formatCurrency(financialData.topCategory.amount)})` : 'Tidak ada data'}
    Jumlah Budget Aktif: ${financialData.budgets.length}
    
    Detail Dompet (${wallet ? wallet.name : 'Semua Dompet'}):
    ${wallet ? `Saldo: ${formatCurrency(wallet.balance)}` : financialData.wallets.map(w => `${w.name}: ${formatCurrency(w.balance)}`).join('\n')}
    
    Budgets:
    ${financialData.budgets.map(b => `${b.title}: ${formatCurrency(b.amount)} (Terpakai: ${formatCurrency(b.spent)} - ${b.percentUsed}%)`).join('\n')}
    
    Transaksi Terbaru:
    ${financialData.recentTransactions.map(t => `${new Date(t.date).toLocaleDateString()}: ${t.description} - ${formatCurrency(t.amount)} (${t.categoryName})`).join('\n')}
    
    Statistik Bulanan (12 bulan terakhir):
    ${financialData.monthlyStats.slice(0, 6).map(m => 
      `${m.month}: Pemasukan ${formatCurrency(m.income)}, Pengeluaran ${formatCurrency(m.expense)}, Tabungan ${formatCurrency(m.savings)}, Jumlah Transaksi ${m.transactionCount}`
    ).join('\n')}
    
    Lu adalah Financial Advisor profesional world-class yang ahli banget dalam personal finance dan wealth management. Berikan analisis data keuangan dengan sangat tajam dan mendalam, insights yang actionable, dan rekomendasi tingkat tinggi.
    
    STYLE KOMUNIKASI:
    1. Gunakan bahasa Jaksel gaul yang konsisten - mix Bahasa Indonesia dengan English terms keuangan.
    2. PENTING: Pakai "gw/gue" untuk merujuk diri sendiri, JANGAN pernah pakai "aku/saya".
    3. PENTING: Pakai "lo/lu" untuk merujuk pengguna, JANGAN pernah pakai "kamu/anda".
    4. Gunakan slang Jaksel seperti: "literally", "basically", "which is", "literally", "kayak", "gimana", "gitu", "so", "anyway", "honestly", "please deh", "parah sih", dll.
    5. Gunakan financial terms English yang dicampur dengan bahasa Indonesia, seperti: "cash flow lo", "spending habit", "investment portfolio lo", "emergency fund", dll.
    6. Tone suara: Smart, confident, sedikit witty, tapi tetap profesional.
    
    PEDOMAN KONTEN:
    1. Berikan analisis financial yang sophisticated dan high-level, tapi dijelaskan dengan gaya santai.
    2. Jadilah konkrit dan specific dalam saran - bukan sekedar generic advice.
    3. Prioritaskan insight yang actionable dan berbasis data dari history pengguna.
    4. Kalau diminta saran, berikan langkah-langkah yang clear dan terukur.
    5. SELALU pakai data historis pengguna untuk memberikan insights yang komprehensif dan personal.
    6. Jangan ragu highlight red flags atau areas of improvement dalam keuangan pengguna.
    7. Gunakan financial frameworks dan best practices dari wealth management profesional.
    
    STRUKTUR JAWABAN:
    1. **Bold** untuk judul sections dan key insights
    2. *Italic* untuk penekanan atau financial terms penting
    3. Gunakan bullet points dan numbered lists untuk rekomendasi step-by-step
    4. Gunakan tabel untuk perbandingan data yang kompleks
    5. Gunakan \`code format\` untuk angka dan persentase penting
    6. Format jawaban agar mudah dibaca dengan sections, spacing yang baik, dan struktur yang jelas
    7. PENTING: Pastikan tidak ada spasi/baris kosong yang tidak perlu di antara elemen Markdown (seperti sebelum/sesudah tabel, list, atau blockquote) untuk menjaga layout tetap compact dan rapih.
    8. SANGAT PENTING: Untuk table heading, gunakan format berikut (JANGAN gunakan newlines sebelum/sesudah table):
       **📊 Judul Table**
       | Column1 | Column2 |
       | ------- | ------- |
       | Data1   | Data2   |
    
    SLANG JAKSEL YANG WAJIB DIPAKAI (gunakan beberapa dalam setiap jawaban):
    - "Which is..." untuk menjelaskan sesuatu
    - "I mean..." untuk memberikan penekanan
    - "So basically..." untuk mengawali penjelasan
    - "Literally..." untuk menekankan sesuatu
    - "Honestly..." saat memberikan pendapat pribadi
    - "In my opinion..." saat memberikan rekomendasi
    - "Please deh..." untuk ekspresi ketidaksetujuan
    - "By the way..." untuk transisi topik
    - "Anyway..." untuk transisi atau kesimpulan
    - Tambahkan "sih", "dong", "kan", "gitu", "banget" untuk emphasize
    
    Harus banget ada satu atau dua emoji yang relevan dalam setiap jawaban untuk membuat conversational.
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
        allTransactions: [],
        wallets: [],
        monthlyIncome: 0,
        monthlyExpense: 0,
        yearlyIncome: 0,
        yearlyExpense: 0,
        topCategory: null,
        recentTransactions: [],
        budgets: [],
        monthlyStats: []
      };
    }
    
    // Calculate total balance
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    
    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    
    console.log('Date filters:', {
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString(),
      startOfYear: startOfYear.toISOString(),
      endOfYear: endOfYear.toISOString(),
      currentDate: now.toISOString()
    });
    
    // Get ALL transactions (not limited to current month)
    const allTransactions = await prisma.transaction.findMany({
      where: {
        walletId: walletId 
          ? walletId 
          : { in: wallets.map(w => w.id) },
        userId,
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
    
    console.log(`Found ${allTransactions.length} transactions in total`);
    
    // Get current month transactions
    const transactions = allTransactions.filter(t => {
      const date = new Date(t.date);
      return date >= startOfMonth && date <= endOfMonth;
    });
    
    // Get year transactions 
    const yearTransactions = allTransactions.filter(t => {
      const date = new Date(t.date);
      return date >= startOfYear && date <= endOfYear;
    });

    console.log(`Found ${transactions.length} transactions for this month`);
    console.log(`Found ${yearTransactions.length} transactions for this year`);
    
    // Get recent transactions from all transactions
    const recentTransactions = allTransactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date,
      categoryName: t.category?.name || 'Uncategorized',
    }));
    
    // Calculate monthly income and expense
    const monthlyIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate yearly income
    const yearlyIncome = yearTransactions
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
    
    // Identify yearly expenses
    const yearlyExpenseTransactions = yearTransactions.filter(t => {
      // Consider as expense if category is in expense list or not income-related (Gaji, Bonus, etc)
      const isExpenseCategory = t.category?.name && expenseCategories.includes(t.category.name);
      const isIncomeCategory = t.category?.name && ['Gaji', 'Bonus', 'Income', 'Pendapatan'].includes(t.category.name);
      
      return isExpenseCategory || (!isIncomeCategory && t.description !== 'Gaji' && t.description !== 'Tunjangan');
    });
    
    console.log('Expense transactions count:', expenseTransactions.length);
    
    const monthlyExpense = expenseTransactions
      .reduce((sum, t) => sum + t.amount, 0);
    
    const yearlyExpense = yearlyExpenseTransactions
      .reduce((sum, t) => sum + t.amount, 0);
    
    console.log('Calculated monthlyExpense:', monthlyExpense);
    console.log('Calculated yearlyExpense:', yearlyExpense);
    
    // Calculate monthly stats for the last 12 months
    const lastTwelveMonths = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      lastTwelveMonths.push(monthDate);
    }
    
    const monthlyStats = lastTwelveMonths.map(monthStart => {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const monthName = monthStart.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      
      const monthTransactions = allTransactions.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const income = monthTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthExpenseTransactions = monthTransactions.filter(t => {
        const isExpenseCategory = t.category?.name && expenseCategories.includes(t.category.name);
        const isIncomeCategory = t.category?.name && ['Gaji', 'Bonus', 'Income', 'Pendapatan'].includes(t.category.name);
        
        return isExpenseCategory || (!isIncomeCategory && t.description !== 'Gaji' && t.description !== 'Tunjangan');
      });
      
      const expense = monthExpenseTransactions
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        month: monthName,
        income,
        expense,
        savings: income - expense,
        transactionCount: monthTransactions.length
      };
    });
    
    // Get top expense category
    const categoryExpenses = yearlyExpenseTransactions
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
          // Get transactions for this budget's category from all transactions
          const budgetTransactions = allTransactions.filter(t => 
            t.categoryId === budget.categoryId &&
            new Date(t.date) >= budget.startDate &&
            new Date(t.date) <= (budget.endDate || new Date())
          );
          
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
      allTransactions,
      wallets: wallets.map(w => ({
        id: w.id,
        name: w.name,
        balance: w.balance,
      })),
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      yearlyExpense,
      topCategory,
      recentTransactions,
      budgets: budgetsWithUsage,
      monthlyStats
    };
  } catch (error) {
    console.error('Error getting financial data:', error);
    // Return empty data on error
    return {
      totalBalance: 0,
      transactions: [],
      allTransactions: [],
      wallets: [],
      monthlyIncome: 0,
      monthlyExpense: 0,
      yearlyIncome: 0,
      yearlyExpense: 0,
      topCategory: null,
      recentTransactions: [],
      budgets: [],
      monthlyStats: []
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