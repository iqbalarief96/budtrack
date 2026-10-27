'use server'

import prisma from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai'
import { resolveAIConfig } from '@/lib/ai-settings'

interface SpendingPattern {
  categoryName: string
  currentSpending: number
  averageSpending: number
  percentChange: number
  transactions: number
  periodLabel: string
}

interface FinancialAdvice {
  id: string
  title: string
  description: string
  type: 'saving' | 'budgeting' | 'investment' | 'general'
  priority: 'high' | 'medium' | 'low'
  estimatedImpact?: number
}

/**
 * Generate personalized financial advice based on user's spending patterns
 * 
 * @param userId User ID to analyze
 * @param walletId Optional wallet ID to restrict analysis
 * @param timeframe Time period for analysis: 'month', 'quarter', 'year', or 'all' (default: 'month')
 * @returns Array of personalized advice
 */
export async function generatePersonalizedAdvice(
  userId: string,
  walletId?: string,
  timeframe: 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<FinancialAdvice[]> {
  try {
    // Get user settings for AI provider
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    const aiConfig = resolveAIConfig(userSettings);
    if (!aiConfig) {
      throw new Error('AI settings not configured. Please configure AI settings in your profile.');
    }

    // 1. Analyze spending patterns
    const spendingPatterns = await analyzeSpendingPatterns(userId, walletId, timeframe);
    
    // 2. Create a prompt with the spending patterns
    const prompt = createAdvicePrompt(spendingPatterns, timeframe);
    
    // 3. Generate advice using AI
    const adviceText = await generateAIResponse({
      prompt,
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      customEndpoint: aiConfig.customEndpoint
    });
    
    // 4. Parse the AI response into structured advice
    return parseAdviceResponse(adviceText);
    
  } catch (error) {
    console.error('Error generating personalized advice:', error);
    throw error;
  }
}

/**
 * Analyze spending patterns from transaction history
 */
async function analyzeSpendingPatterns(
  userId: string,
  walletId?: string,
  timeframe: 'month' | 'quarter' | 'year' | 'all' = 'month'
): Promise<SpendingPattern[]> {
  // Calculate time periods based on timeframe
  const now = new Date();
  
  // Define periods based on timeframe
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let periodLabel: string;

  switch (timeframe) {
    case 'month':
      // Current month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      // Previous month
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      periodLabel = 'month';
      break;
      
    case 'quarter':
      // Current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      // Previous quarter
      previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      if (previousStart.getMonth() < 0) {
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        previousStart.setMonth(previousStart.getMonth() + 12);
      }
      previousEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
      periodLabel = 'quarter';
      break;
      
    case 'year':
      // Current year
      currentStart = new Date(now.getFullYear(), 0, 1);
      // Previous year
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear(), 0, 0);
      periodLabel = 'year';
      break;
      
    case 'all':
      // All time - get all data and split in half
      const allTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          ...(walletId ? { walletId } : {}),
          type: { in: ['expense', 'EXPENSE'] }
        },
        orderBy: {
          date: 'asc'
        },
        // Limit to maximum 500 transactions for performance
        take: 500
      });
      
      if (allTransactions.length > 0) {
        // Instead of mid-point, use date-based approach
        // Split between first half and second half of the data's date range
        const oldestDate = new Date(allTransactions[0].date);
        const newestDate = new Date(allTransactions[allTransactions.length - 1].date);
        
        // Calculate the middle date
        const midDate = new Date((oldestDate.getTime() + newestDate.getTime()) / 2);
        
        currentStart = midDate;
        previousStart = oldestDate;
        previousEnd = new Date(midDate.getTime() - 1); // Just before midpoint
        periodLabel = 'all time period';
      } else {
        // Fallback to month if no transactions
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        periodLabel = 'month';
      }
      break;
  }
  
  // Base query filter
  const baseFilter: any = {
    userId,
    type: { in: ['expense', 'EXPENSE'] }
  };
  
  if (walletId) {
    baseFilter.walletId = walletId;
  }
  
  // Get current period transactions
  const currentTransactions = await prisma.transaction.findMany({
    where: {
      ...baseFilter,
      date: {
        gte: currentStart
      }
    },
    include: {
      category: true
    }
  });
  
  // Get previous period transactions
  const previousTransactions = await prisma.transaction.findMany({
    where: {
      ...baseFilter,
      date: {
        gte: previousStart,
        ...(timeframe !== 'all' ? { lt: currentStart } : {})
      }
    },
    include: {
      category: true
    }
  });
  
  // Group by category
  const categoriesMap = new Map<string, SpendingPattern>();
  
  // Process previous period transactions
  previousTransactions.forEach(transaction => {
    const categoryName = transaction.category?.name || 'Uncategorized';
    const categoryId = transaction.category?.id || 'uncategorized';
    
    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        categoryName,
        currentSpending: 0,
        averageSpending: 0,
        percentChange: 0,
        transactions: 0,
        periodLabel
      });
    }
    
    const category = categoriesMap.get(categoryId)!;
    category.averageSpending += transaction.amount;
    category.transactions += 1;
  });
  
  // Process current period transactions
  currentTransactions.forEach(transaction => {
    const categoryName = transaction.category?.name || 'Uncategorized';
    const categoryId = transaction.category?.id || 'uncategorized';
    
    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        categoryName,
        currentSpending: 0,
        averageSpending: 0,
        percentChange: 0,
        transactions: 0,
        periodLabel
      });
    }
    
    const category = categoriesMap.get(categoryId)!;
    category.currentSpending += transaction.amount;
    category.transactions += 1;
  });
  
  // Calculate percentages and prepare result
  const patterns: SpendingPattern[] = [];
  
  categoriesMap.forEach(category => {
    // Only include categories that have data from both periods
    if (category.currentSpending > 0 || category.averageSpending > 0) {
      // Calculate percent change if previous period had spending
      if (category.averageSpending > 0) {
        category.percentChange = ((category.currentSpending - category.averageSpending) / category.averageSpending) * 100;
      }
      
      patterns.push(category);
    }
  });
  
  // Sort by absolute percentage change (highest first)
  return patterns.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
}

/**
 * Create a prompt for generating financial advice
 */
function createAdvicePrompt(patterns: SpendingPattern[], timeframe: 'month' | 'quarter' | 'year' | 'all' = 'month'): string {
  // Format currency for better readability
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Create a base prompt
  let prompt = `
    Please analyze the following spending patterns and provide 3-5 personalized financial recommendations:
    
    Current Spending Patterns:
    `;
  
  // Add each category's data
  patterns.forEach(pattern => {
    const changeDirection = pattern.percentChange > 0 ? 'increased' : 'decreased';
    const changeAmount = Math.abs(pattern.percentChange).toFixed(1);
    
    prompt += `
    - ${pattern.categoryName}: ${formatCurrency(pattern.currentSpending)} this ${pattern.periodLabel} (${changeDirection} ${changeAmount}% from last ${pattern.periodLabel}'s ${formatCurrency(pattern.averageSpending)})`;
  });
  
  // Add instructions for the advice format
  prompt += `
    
    Please provide actionable, personalized financial advice based on these patterns.
    For each recommendation, include:
    1. A brief title 
    2. A detailed description with specific steps
    3. The type (saving, budgeting, investment, or general)
    4. Priority level (high, medium, low)
    5. Estimated financial impact when applicable
    
    IMPORTANT: Write the advice in Indonesian with a casual Jakarta Selatan (Jaksel) style - mix Indonesian and English in a natural way.
    Use phrases like "literally", "basically", "which is", "literally", "in fact", "actually", etc. Use casual language (use "gue/gw" instead of "saya", use "lo/lu" instead of "kamu").
    Keep it trendy but not excessive (don't be 'alay' or 'norak'). Make it sound friendly and relatable.
    
    Format your response as JSON with this structure:
    {
      "advice": [
        {
          "title": "Title of advice",
          "description": "Detailed description with specific actions",
          "type": "saving|budgeting|investment|general",
          "priority": "high|medium|low",
          "estimatedImpact": 500000 (optional, in IDR)
        }
      ]
    }
  `;
  
  return prompt;
}

/**
 * Parse the AI response into structured advice
 */
function parseAdviceResponse(responseText: string): FinancialAdvice[] {
  try {
    // Find JSON content (may be surrounded by markdown code blocks or other text)
    let jsonStr = responseText;
    
    // If response contains markdown code blocks, extract content between ```json and ```
    const jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1];
    }
    
    // Parse the JSON
    const parsed = JSON.parse(jsonStr);
    
    // Add unique IDs to each advice
    if (parsed && Array.isArray(parsed.advice)) {
      return parsed.advice.map((advice: any, index: number) => ({
        ...advice,
        id: `advice-${Date.now()}-${index}`
      }));
    }
    
    throw new Error('Invalid advice format returned from AI');
  } catch (error) {
    console.error('Error parsing advice response:', error, responseText);
    throw new Error('Failed to parse financial advice from AI response');
  }
} 