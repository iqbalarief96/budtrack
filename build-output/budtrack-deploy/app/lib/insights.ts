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
  
  // Skip if no transactions
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get current date and first day of current and previous month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthStart = new Date(currentYear, currentMonth, 1);
  const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
  
  // Group expenses by category for current and previous month
  const categorySpendings = new Map<string, { current: number; previous: number }>();
  
  // Process all transactions
  transactions.forEach(tx => {
    if (tx.type !== 'EXPENSE' || !tx.category) return;
    
    const txDate = new Date(tx.date);
    const categoryName = tx.category.name;
    
    // Initialize category if not exists
    if (!categorySpendings.has(categoryName)) {
      categorySpendings.set(categoryName, { current: 0, previous: 0 });
    }
    
    const spending = categorySpendings.get(categoryName)!;
    
    // Categorize by month
    if (txDate >= currentMonthStart) {
      spending.current += tx.amount;
    } else if (txDate >= previousMonthStart && txDate < currentMonthStart) {
      spending.previous += tx.amount;
    }
  });
  
  // Get current month transactions
  const currentMonthTransactions = transactions.filter(tx => 
    new Date(tx.date) >= currentMonthStart
  );
  
  // Calculate income and expenses for current month
  const totalIncome = currentMonthTransactions
    .filter(tx => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpense = currentMonthTransactions
    .filter(tx => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // 1. Monthly spending insights
  if (totalIncome > 0 && totalExpense > 0) {
    const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
    
    if (savingsRate < 0) {
      insights.push({
        type: 'warning',
        message: `Bulan ini pengeluaran lo lebih gede ${formatCurrency(Math.abs(totalIncome - totalExpense))} dari pemasukan. Coba review budget lo lagi bro.`
      });
    } else if (savingsRate < 15) {
      insights.push({
        type: 'warning',
        message: `Savings rate lo cuma ${savingsRate.toFixed(1)}%. Idealnya 20% dari penghasilan ditabung, jaga-jaga buat masa depan.`
      });
    } else if (savingsRate > 30) {
      insights.push({
        type: 'success',
        message: `Keren! Savings rate lo ${savingsRate.toFixed(1)}%, jauh di atas rata-rata. Keep it up! 💪`
      });
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
  
  // 3. Find repeated merchants/descriptions for subscription detection
  const merchantFrequency = findFrequentMerchants(transactions);
  const potentialSubscriptions = [];
  
  for (const [merchant, count] of Object.entries(merchantFrequency)) {
    if (count >= 2 && merchant.toLowerCase().includes("subscription") || 
        merchant.toLowerCase().includes("langganan") ||
        merchant.toLowerCase().includes("netflix") ||
        merchant.toLowerCase().includes("spotify")) {
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
    .filter(tx => 
      tx.type === 'EXPENSE' && 
      new Date(tx.date) >= previousMonthStart && 
      new Date(tx.date) < currentMonthStart
    )
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