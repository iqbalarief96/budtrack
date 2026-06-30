import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateChatbotResponse, parseChatbotToolCalls, streamChatbotResponse } from '@/lib/ai';
import { getAiActionValidationContext } from '@/lib/ai/actions/context';
import { validateProposedActions } from '@/lib/ai/actions/validate';

type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

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

    if (body?.walletId && typeof body.walletId !== 'string') {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid walletId' }),
        { status: 400 }
      );
    }
    
    const rawPrompt = typeof body?.prompt === 'string' ? body.prompt : '';
    const trimmedPrompt = rawPrompt.trim();
    const walletId = typeof body?.walletId === 'string' && body.walletId.trim().length > 0
      ? body.walletId.trim()
      : undefined;
    const safeHistory = sanitizeHistory(body?.history);
    
    if (!trimmedPrompt) {
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
    
    const provider = user.settings?.provider || '';
    const providerApiKey = provider === 'deepseek'
      ? user.settings?.deepseekApiKey || user.settings?.apiKey
      : provider === 'openrouter'
        ? user.settings?.openrouterApiKey || user.settings?.apiKey
        : provider === 'zai'
          ? user.settings?.zaiApiKey || user.settings?.apiKey
          : provider === 'custom'
            ? user.settings?.customApiKey || user.settings?.apiKey
            : user.settings?.apiKey;

    // Check if AI settings are configured
    if (!provider || !providerApiKey || !user.settings?.selectedModel) {
      return new NextResponse(
        JSON.stringify({ error: 'AI settings not configured' }),
        { status: 400 }
      );
    }
    
    // Get wallet data if walletId is provided
    let wallet: { id: string; name: string; balance: number } | null = null;
    if (walletId) {
      wallet = await prisma.wallet.findFirst({
        where: {
          id: walletId,
          userId: user.id,
        },
        select: {
          id: true,
          name: true,
          balance: true,
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
    Dompet Terpilih: ${wallet ? `${wallet.name} (${formatCurrency(wallet.balance)})` : 'Semua dompet'}
    
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
      .filter(t => t.type === 'EXPENSE')
      .slice(0, 10)
      .map(t => `- ${t.description}: ${formatCurrency(Math.abs(t.amount))} (${t.category?.name || 'Tanpa Kategori'})`)
      .join('\n')
    }
    
    Kategori Pengeluaran Terbesar Tahun Ini: ${financialData.topCategory ? `${financialData.topCategory.name} (${formatCurrency(financialData.topCategory.amount)})` : 'Tidak ada data'}
    Jumlah Budget Aktif: ${financialData.budgets.length}
    
    Detail Dompet (${wallet ? wallet.name : 'Semua Dompet'}):
    ${wallet
      ? `Saldo: ${formatCurrency(wallet.balance)}`
      : financialData.wallets.slice(0, 5).map(w => `${w.name}: ${formatCurrency(w.balance)}`).join('\n')}
    
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
    
    const shouldStream = body?.stream === true;

    if (shouldStream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          let raw = '';
          let sentText = '';

          try {
            for await (const chunk of streamChatbotResponse({
              prompt: trimmedPrompt,
              provider,
              apiKey: providerApiKey,
              model: user.settings.selectedModel,
              customEndpoint: provider === 'custom' ? user.settings.customEndpoint : null,
              context,
              history: safeHistory,
              timeoutMs: 120000,
              maxTokens: 2000,
            })) {
              raw += chunk;
              const { visibleText } = parseChatbotToolCalls(raw);
              const delta = visibleText.slice(sentText.length);

              if (delta) {
                sentText = visibleText;
                controller.enqueue(encoder.encode(sse('text', { delta })));
              }
            }

            const parsed = parseChatbotToolCalls(raw);
            const tail = parsed.visibleText.slice(sentText.length);
            if (tail) controller.enqueue(encoder.encode(sse('text', { delta: tail })));

            const actionContext = await getAiActionValidationContext(user.id);
            const actions = validateProposedActions(parsed.proposedActions, actionContext);
            if (actions.length > 0) {
              controller.enqueue(encoder.encode(sse('actions', { actions })));
            }

            controller.enqueue(encoder.encode(sse('done', {})));
            controller.close();
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown chatbot stream error';
            controller.enqueue(encoder.encode(sse('error', { message })));
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Generate AI response
    const aiResponse = await generateChatbotResponse({
      prompt: trimmedPrompt,
      provider,
      apiKey: providerApiKey,
      model: user.settings.selectedModel,
      customEndpoint: provider === 'custom' ? user.settings.customEndpoint : null,
      context,
      history: safeHistory,
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


function sse(event: string, data: unknown) {
  return `event: ${event}
data: ${JSON.stringify(data)}

`;
}

function sanitizeHistory(history: unknown): ChatHistoryItem[] {
  if (!Array.isArray(history)) {
    return [];
  }

  const cleaned: ChatHistoryItem[] = [];

  for (const entry of history) {
    if (!entry || typeof entry !== 'object') continue;
    const roleValue = (entry as any).role;
    const contentValue = (entry as any).content;

    const role = roleValue === 'assistant' ? 'assistant' : roleValue === 'user' ? 'user' : null;
    const content = typeof contentValue === 'string' ? contentValue.trim() : '';

    if (!role || !content) continue;
    cleaned.push({ role, content });
  }

  return cleaned.slice(-10);
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
    
    const lookbackStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    
    // Get transactions within the last 12 months (capped to 500 records for prompt size)
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(walletId
          ? { walletId }
          : { walletId: { in: wallets.map(w => w.id) } }),
        date: {
          gte: lookbackStart,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 500,
    });
    
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

    // Get recent transactions from all transactions
    const recentTransactions = allTransactions.slice(0, 5).map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date,
      categoryName: t.category?.name || 'Uncategorized',
    }));
    
    // Calculate monthly income and expense
    const monthlyIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Calculate yearly income
    const yearlyIncome = yearTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Identify expenses by transaction type
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
    const yearlyExpenseTransactions = yearTransactions.filter(t => t.type === 'EXPENSE');
    
    const monthlyExpense = expenseTransactions
      .reduce((sum, t) => sum + t.amount, 0);
    
    const yearlyExpense = yearlyExpenseTransactions
      .reduce((sum, t) => sum + t.amount, 0);
    
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
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const expense = monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
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
        acc[categoryName] += Math.abs(t.amount);
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });
    
    // Calculate budget usage
    const budgetsWithUsage = await Promise.all(
      budgets.map(async (budget) => {
        try {
          // Get transactions for this budget's category from all transactions
          const budgetTransactions = allTransactions.filter(t => {
            if (t.type !== 'EXPENSE') return false;
            if (budget.categoryId && t.categoryId !== budget.categoryId) return false;
            if (budget.walletId && t.walletId !== budget.walletId) return false;
            
            const txDate = new Date(t.date);
            const endDate = budget.endDate || now;
            return txDate >= budget.startDate && txDate <= endDate;
          });
          
          const spent = budgetTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
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
