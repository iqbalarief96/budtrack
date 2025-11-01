// Types for transactions analysis
type Transaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date: string | Date;
  category?: {
    id: string;
    name: string;
    type: string;
  };
  wallet?: {
    id: string;
    name: string;
    currencyCode: string;
  };
  [key: string]: any;
};

export type Insight = {
  type: 'info' | 'warning' | 'success';
  message: string;
};

/**
 * Analyzes transaction data to provide smart insights about spending patterns
 */
export function analyzeTransactions(transactions: Transaction[]): Insight[] {
  const insights: Insight[] = [];
  
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Determine the most recent month that actually has transactions
  const transactionDates = transactions
    .map(tx => new Date(tx.date))
    .filter(date => !Number.isNaN(date.getTime()));

  if (transactionDates.length === 0) {
    return [];
  }

  const latestTxDate = transactionDates.reduce((latest, current) =>
    current > latest ? current : latest
  , transactionDates[0]);

  const analysisMonthStart = new Date(latestTxDate.getFullYear(), latestTxDate.getMonth(), 1);
  const nextMonthStart = new Date(latestTxDate.getFullYear(), latestTxDate.getMonth() + 1, 1);
  const previousMonthStart = new Date(latestTxDate.getFullYear(), latestTxDate.getMonth() - 1, 1);

  // Group expenses by category for current and previous month
  const categorySpendings = new Map<string, { current: number; previous: number }>();
  
  transactions.forEach(tx => {
    if (tx.type !== 'EXPENSE' || !tx.category) return;

    const txDate = new Date(tx.date);
    if (Number.isNaN(txDate.getTime())) return;
    
    const categoryName = tx.category.name;
    
    if (!categorySpendings.has(categoryName)) {
      categorySpendings.set(categoryName, { current: 0, previous: 0 });
    }
    
    const spending = categorySpendings.get(categoryName)!;
    
    // Categorize by month
    if (txDate >= analysisMonthStart && txDate < nextMonthStart) {
      spending.current += tx.amount;
    } else if (txDate >= previousMonthStart && txDate < analysisMonthStart) {
      spending.previous += tx.amount;
    }
  });
  
  // Get transactions within the latest month
  const currentMonthTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return !Number.isNaN(txDate.getTime()) && txDate >= analysisMonthStart && txDate < nextMonthStart;
  });
  
  // Calculate income and expenses for current month
  const totalIncome = currentMonthTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpense = currentMonthTransactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // 1. Monthly spending insights
  if (totalIncome === 0 && totalExpense > 0) {
    insights.push({
      type: 'warning',
      message: `Bulan ini belum ada income masuk tapi spending sudah ${formatCurrency(totalExpense)}. Coba cek lagi sumber pemasukan lo ya.`
    });
  } else if (totalIncome > 0) {
    const netDifference = totalIncome - totalExpense;
    const savingsRate = totalExpense === 0 ? 100 : ((totalIncome - totalExpense) / totalIncome) * 100;
    
    if (savingsRate < 0) {
      insights.push({
        type: 'warning',
        message: `Bulan ini pengeluaran lo lebih gede ${formatCurrency(Math.abs(netDifference))} dari pemasukan. Saatnya rem dikit biar cashflow gak bocor.`
      });
    } else if (savingsRate < 15) {
      insights.push({
        type: 'warning',
        message: `Savings rate lo cuma ${savingsRate.toFixed(1)}%. Idealnya 20% dari penghasilan ditabung, let's push a bit more buat masa depan.`
      });
    } else if (savingsRate > 30) {
      insights.push({
        type: 'success',
        message: `Keren! Savings rate lo ${savingsRate.toFixed(1)}%, jauh di atas rata-rata. Keep it up, vibes-nya kece banget!`
      });
    }

    if (totalExpense === 0) {
      insights.push({
        type: 'success',
        message: `Spending lo nol bulan ini, semuanya masuk kantong. Mantap, lanjutkan disiplin kaya gini!`
      });
    } else {
      const absoluteNet = Math.abs(netDifference);
      const significantNet = absoluteNet >= Math.max(200000, totalIncome * 0.15, totalExpense * 0.15);
  
      if (significantNet && netDifference > 0) {
        insights.push({
          type: 'success',
          message: `Cashflow lo positif ${formatCurrency(netDifference)} bulan ini. Cocok banget buat dialihin ke tabungan atau investasi.`
        });
      } else if (significantNet && netDifference < 0) {
        insights.push({
          type: 'warning',
          message: `Cashflow bulan ini minus ${formatCurrency(absoluteNet)}. Coba cek kategori yang paling bikin jebol.`
        });
      }
    }
  }
  
  // 2. Category spending analysis
  categorySpendings.forEach((spending, category) => {
    const { current, previous } = spending;
    
    // Skip if no spending in current month
    if (current === 0) return;
    
    // Compare with previous month if available
    if (previous > 0) {
      const percentChange = ((current - previous) / previous) * 100;
      
      if (percentChange >= 50 && current > 100000) {
        insights.push({
          type: 'warning',
          message: `Pengeluaran di kategori ${category} naik ${percentChange.toFixed(0)}% dibanding bulan lalu.`
        });
      } else if (percentChange <= -20 && previous > 100000) {
        insights.push({
          type: 'success',
          message: `Keren! Pengeluaran di kategori ${category} turun ${Math.abs(percentChange).toFixed(0)}% dibanding bulan lalu.`
        });
      }
    } else if (current > 1000000) { // High spending with no previous data
      insights.push({
        type: 'info',
        message: `Pengeluaran di kategori ${category} cukup tinggi bulan ini (${formatCurrency(current)}).`
      });
    }
  });

  // Highlight the most dominant spending category
  if (totalExpense > 0) {
    const rankedCategories = Array.from(categorySpendings.entries())
      .map(([name, spending]) => ({ name, amount: spending.current }))
      .filter(entry => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  
    if (rankedCategories.length > 0) {
      const topCategory = rankedCategories[0];
      const share = (topCategory.amount / totalExpense) * 100;
      const messageType: Insight['type'] = share >= 40 ? 'warning' : 'info';
      
      insights.push({
        type: messageType,
        message: `Kategori ${topCategory.name} nyedot ${share.toFixed(0)}% dari total spending bulan ini (${formatCurrency(topCategory.amount)}). Worth it nggak?`
      });
    }
  }
  
  // 3. Find repeated merchants/descriptions for subscription detection
  const merchantFrequency = findFrequentMerchants(transactions);
  const potentialSubscriptions = [];
  
  for (const [merchant, count] of Object.entries(merchantFrequency)) {
    const normalized = merchant.toLowerCase();
    const subscriptionKeywords = ['subscription', 'langganan', 'netflix', 'spotify', 'youtube', 'disney', 'patreon', 'prime', 'iflix'];
    
    if (
      count >= 2 &&
      subscriptionKeywords.some(keyword => normalized.includes(keyword))
    ) {
      potentialSubscriptions.push(merchant);
    }
  }
  
  if (potentialSubscriptions.length > 0) {
    insights.push({
      type: 'info',
      message: `Gw detect beberapa transaksi rutin: ${potentialSubscriptions.join(', ')}. Mungkin bisa setup recurring transactions?`
    });
  }
  
  // 4. Overall spending trend
  const previousMonthExpenses = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'EXPENSE' &&
        !Number.isNaN(txDate.getTime()) &&
        txDate >= previousMonthStart &&
        txDate < analysisMonthStart;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  if (previousMonthExpenses > 0 && totalExpense > 0) {
    const monthlyChangePercent = ((totalExpense - previousMonthExpenses) / previousMonthExpenses) * 100;
    
    if (monthlyChangePercent > 20) {
      insights.push({
        type: 'warning',
        message: `Total pengeluaran lo naik ${monthlyChangePercent.toFixed(0)}% dibanding bulan lalu. Ada apa nih?`
      });
    } else if (monthlyChangePercent < -10) {
      insights.push({
        type: 'success',
        message: `Total pengeluaran lo turun ${Math.abs(monthlyChangePercent).toFixed(0)}% dari bulan lalu. Good job!`
      });
    }
  }
  
  return insights;
}

// Helper to find frequently occurring merchants
function findFrequentMerchants(transactions: Transaction[]): Record<string, number> {
  const frequencyMap: Record<string, number> = {};
  
  transactions.forEach(tx => {
    if (tx.description) {
      const description = tx.description.trim();
      if (description.length > 0) {
        frequencyMap[description] = (frequencyMap[description] || 0) + 1;
      }
    }
  });
  
  return frequencyMap;
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
