import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateAIResponse } from '@/lib/ai';
import { resolveAIConfig } from '@/lib/ai-settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        wallets: true,
        transactions: {
          take: 100,
          orderBy: { date: 'desc' },
          include: { category: true }
        },
        settings: true
      }
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'User not found' }),
        { status: 404 }
      );
    }

    // Check if AI settings are configured
    const aiConfig = resolveAIConfig(user.settings);
    if (!aiConfig) {
      // Fallback to sample recommendations if AI is not configured
      return NextResponse.json({ 
        recommendations: generateSampleRecommendations(user),
        source: 'fallback'
      });
    }

    // Prepare user financial data for AI analysis
    const financialData = prepareFinancialData(user);
    
    // Generate AI prompt
    const prompt = `
    As a financial product recommendation engine, analyze the following user financial data and suggest 4-6 personalized financial products that would be suitable for this individual. 
    
    Focus on Indonesian financial products like:
    - Reksadana (mutual funds) - pasar uang, pendapatan tetap, campuran, saham
    - Tabungan dengan benefits (savings accounts with benefits)
    - Asuransi (insurance) products - jiwa, kesehatan, pendidikan
    - Kartu kredit dengan cashback/rewards
    - Obligasi or SBN (government bonds)
    - Emas digital (digital gold)
    
    USER FINANCIAL PROFILE:
    ${JSON.stringify(financialData, null, 2)}
    
    For each recommendation, include:
    - type: The category of financial product (e.g., "Investment", "Savings", "Insurance", "Credit Card")
    - title: A specific product name (generic but realistic)
    - description: A brief explanation of what the product is
    - suitability: Why this product is specifically suitable for this user based on their financial situation
    - benefits: The potential benefits the user could gain
    
    Format your response as a valid JSON array of recommendation objects, with no additional commentary.
    Example:
    [
      {
        "type": "Investment",
        "title": "Reksadana Pasar Uang Premium",
        "description": "Low-risk money market fund suitable for emergency funds",
        "suitability": "Based on your high cash balance and minimal investment allocation",
        "benefits": "Returns of 5-7% annually with high liquidity and minimal risk"
      },
      ...more recommendations
    ]
    `;

    try {
      // Use AI to generate personalized recommendations
      const aiResponse = await generateAIResponse({
        prompt,
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        customEndpoint: aiConfig.customEndpoint
      });
      
      // Parse AI response as JSON
      let recommendations;
      try {
        // Log the raw AI response for debugging
        console.log('Raw AI response:', aiResponse);
        
        // Sanitize the response to fix common JSON issues
        let sanitizedResponse = aiResponse.trim();
        
        // More aggressive sanitization for markdown code blocks
        // Remove any occurrence of ```json or ``` (with or without newlines)
        sanitizedResponse = sanitizedResponse.replace(/```json[\r\n]*/g, '');
        sanitizedResponse = sanitizedResponse.replace(/```[\r\n]*/g, '');
        sanitizedResponse = sanitizedResponse.replace(/[\r\n]*```/g, '');
        
        // Make sure we're only trying to parse what looks like a JSON array
        if (!sanitizedResponse.startsWith('[') || !sanitizedResponse.endsWith(']')) {
          console.error('AI response is not a JSON array format:', sanitizedResponse);
          // Try to extract array from response if possible
          const arrayMatch = sanitizedResponse.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            sanitizedResponse = arrayMatch[0];
          } else {
            throw new Error('Response is not in the expected JSON array format');
          }
        }
        
        console.log('Sanitized response:', sanitizedResponse);
        
        recommendations = JSON.parse(sanitizedResponse);
        
        // Handle case where AI doesn't return an array
        if (!Array.isArray(recommendations)) {
          throw new Error("AI response is not an array");
        }
        
        // Validate each recommendation has the required fields
        recommendations = recommendations.filter(rec => 
          rec.type && rec.title && rec.description && rec.suitability && rec.benefits
        );
      } catch (err) {
        console.error('Error parsing AI recommendations:', err);
        // Fallback to sample recommendations
        return NextResponse.json({ 
          recommendations: generateSampleRecommendations(user),
          source: 'fallback'
        });
      }
      
      return NextResponse.json({ 
        recommendations,
        source: 'ai'
      });
      
    } catch (aiError) {
      console.error("Error generating AI recommendations:", aiError);
      // Fallback to sample recommendations on AI error
      return NextResponse.json({ 
        recommendations: generateSampleRecommendations(user),
        source: 'fallback' 
      });
    }
  } catch (error) {
    console.error('Error fetching product recommendations:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch product recommendations' }),
      { status: 500 }
    );
  }
}

function prepareFinancialData(user: any) {
  // Calculate total assets
  const totalBalance = user.wallets.reduce((sum: number, wallet: any) => sum + wallet.balance, 0);
  
  // Calculate monthly income and expenses
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const thisMonthTransactions = user.transactions.filter((t: any) => 
    new Date(t.date) >= firstDayOfMonth
  );
  
  // Sum income (positive amounts) and expenses (negative amounts)
  const monthlyIncome = thisMonthTransactions
    .filter((t: any) => t.amount > 0)
    .reduce((sum: number, t: any) => sum + t.amount, 0);
    
  const monthlyExpenses = thisMonthTransactions
    .filter((t: any) => t.amount < 0)
    .reduce((sum: number, t: any) => sum - t.amount, 0); // Convert to positive
  
  // Get top spending categories
  const categorizedExpenses = thisMonthTransactions
    .filter((t: any) => t.amount < 0)
    .reduce((acc: any, t: any) => {
      const categoryName = t.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] -= t.amount; // Convert to positive
      return acc;
    }, {});
  
  // Convert to array and sort by amount
  const topCategories = Object.entries(categorizedExpenses)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => (b.amount as number) - (a.amount as number))
    .slice(0, 5); // Top 5 categories
  
  // Check if savings rate is healthy (saving at least 20% of income)
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  
  // Get regular recurring transactions
  const subscriptions = user.transactions
    .filter((t: any) => t.isRecurring && t.amount < 0)
    .map((t: any) => ({
      name: t.description,
      amount: -t.amount,
      category: t.category?.name || 'Uncategorized'
    }));
  
  return {
    totalAssets: totalBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    savingsRateHealthy: savingsRate >= 20,
    topSpendingCategories: topCategories,
    walletCount: user.wallets.length,
    subscriptions,
    walletDetails: user.wallets.map((w: any) => ({
      name: w.name,
      balance: w.balance
    }))
  };
}

function generateSampleRecommendations(user: any) {
  const recommendations = [];
  
  // Check if user has high balance in wallets but few investments
  const totalBalance = user.wallets.reduce((sum: number, wallet: any) => sum + wallet.balance, 0);
  const hasHighBalance = totalBalance > 10000000; // 10 juta IDR
  
  if (hasHighBalance) {
    recommendations.push({
      type: 'Investment',
      title: 'Reksadana Pasar Uang Premium',
      description: 'Reksadana pasar uang dengan return stabil untuk dana darurat kamu',
      suitability: 'Kamu memiliki dana idle cukup besar di rekening yang bisa menghasilkan return lebih tinggi sambil tetap aman',
      benefits: 'Return 5-7% per tahun dengan risiko rendah dan likuiditas tinggi'
    });
    
    recommendations.push({
      type: 'Investment',
      title: 'SBN Ritel Seri SR',
      description: 'Surat Berharga Negara untuk investor ritel dengan tenor 2-3 tahun',
      suitability: 'Cocok untuk alokasi dana jangka menengah dengan risk profile konservatif',
      benefits: 'Kupon kompetitif 6-7% p.a. dengan jaminan pemerintah dan pembebasan pajak kupon'
    });
  }
  
  // Check spending patterns for credit card recommendation
  const monthlySpending = calculateMonthlySpending(user.transactions);
  if (monthlySpending > 5000000) { // 5 juta IDR per bulan
    recommendations.push({
      type: 'Credit Card',
      title: 'Kartu Kredit Platinum Cashback',
      description: 'Kartu kredit premium dengan program cashback hingga 5% untuk pengeluaran sehari-hari',
      suitability: 'Pola belanja bulanan kamu yang tinggi bisa menghasilkan cashback signifikan dengan kartu ini',
      benefits: 'Cashback 5% untuk groceries, 3% untuk dining & travel, 1% untuk transaksi lainnya, plus airport lounge access'
    });
  }
  
  // Always recommend insurance if possible
  recommendations.push({
    type: 'Insurance',
    title: 'Asuransi Jiwa Plus Investasi',
    description: 'Proteksi jiwa komprehensif dengan tambahan manfaat investasi',
    suitability: 'Memberikan perlindungan finansial untuk kamu dan keluarga sekaligus mengembangkan dana',
    benefits: 'Perlindungan hingga Rp 1 Miliar plus potensi return investasi 8-10% per tahun'
  });
  
  // Savings recommendation
  recommendations.push({
    type: 'Savings',
    title: 'Tabungan Prioritas Digital',
    description: 'Rekening tabungan digital dengan suku bunga tinggi dan fitur premium',
    suitability: 'Maksimalkan return dari dana cash yang kamu miliki dengan akses mudah',
    benefits: 'Bunga 3.5% p.a., gratis transfer antar bank, dan bebas biaya admin bulanan'
  });
  
  // Digital gold
  recommendations.push({
    type: 'Investment',
    title: 'Emas Digital Syariah',
    description: 'Investasi emas berbasis digital dengan sertifikasi ANTAM',
    suitability: 'Diversifikasi portfolio investasi kamu dengan aset yang tahan inflasi',
    benefits: 'Mulai dari 0.001 gram, bebas biaya penyimpanan, dan spread beli-jual kompetitif'
  });
  
  return recommendations;
}

function calculateMonthlySpending(transactions: any[]) {
  // Get transactions from the current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthTransactions = transactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && 
           transDate.getFullYear() === currentYear &&
           t.amount < 0; // Only count expenses
  });
  
  // Calculate total spending (expenses are negative, so we negate)
  return thisMonthTransactions.reduce((sum, t) => sum - t.amount, 0);
} 