import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Function to get category recommendation from AI
async function getAICategoryRecommendation(description: string, type: 'INCOME' | 'EXPENSE', availableCategories: any[], userId: string) {
  try {
    console.log(`Asking AI for category recommendation for: "${description}", type: ${type}`);
    
    // Get user's AI settings from database
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    if (!userSettings?.apiKey || !userSettings.provider) {
      console.log('No API settings found for user. Check settings page to configure AI.');
      return null;
    }
    
    // Format available categories for the prompt
    const categoryOptions = availableCategories
      .filter(cat => cat.type === type || cat.type === 'BOTH')
      .map(cat => `"${cat.name}"`).join(', ');
    
    // Setup the API endpoint based on provider
    let apiEndpoint = '';
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    let payload: any = {};
    
    // Configure request based on provider
    if (userSettings.provider === 'openai') {
      // For OpenAI
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${userSettings.apiKey}`;
      
      payload = {
        model: userSettings.selectedModel || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction categorization assistant. 
            You will analyze transaction descriptions and assign the most appropriate category from a provided list. 
            Respond ONLY with the category name, nothing else.`
          },
          {
            role: 'user',
            content: `Categorize this ${type.toLowerCase()} transaction: "${description}".
            Available categories: ${categoryOptions}.
            Return ONLY the category name without any extra text or punctuation.`
          }
        ],
        temperature: 0.3,
        max_tokens: 20,
      };
    } else if (userSettings.provider === 'deepseek') {
      // For Deepseek
      apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${userSettings.apiKey}`;
      
      payload = {
        model: userSettings.selectedModel || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction categorization assistant. 
            You will analyze transaction descriptions and assign the most appropriate category from a provided list. 
            Respond ONLY with the category name, nothing else.`
          },
          {
            role: 'user',
            content: `Categorize this ${type.toLowerCase()} transaction: "${description}".
            Available categories: ${categoryOptions}.
            Return ONLY the category name without any extra text or punctuation.`
          }
        ],
        temperature: 0.3,
        max_tokens: 20,
      };
    } else if (userSettings.provider === 'openrouter') {
      // For OpenRouter
      apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${userSettings.apiKey}`;
      // Add OpenRouter specific headers
      headers['HTTP-Referer'] = 'https://budtrack.app'; // For attribution
      headers['X-Title'] = 'Budtrack App'; // For attribution
      
      payload = {
        model: userSettings.selectedModel || 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction categorization assistant. 
            You will analyze transaction descriptions and assign the most appropriate category from a provided list. 
            Respond ONLY with the category name, nothing else.`
          },
          {
            role: 'user',
            content: `Categorize this ${type.toLowerCase()} transaction: "${description}".
            Available categories: ${categoryOptions}.
            Return ONLY the category name without any extra text or punctuation.`
          }
        ],
        temperature: 0.3,
        max_tokens: 20,
      };
    } else {
      // Provider not supported
      console.log(`Provider ${userSettings.provider} not supported, falling back to pattern matching`);
      return null;
    }
    
    console.log(`Using ${userSettings.provider} model ${userSettings.selectedModel || 'default'} for categorization`);
    
    // Make API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI API error:', errorData);
      return null;
    }

    const data = await response.json();
    let aiRecommendation = '';
    
    // Extract recommendation based on provider
    if (userSettings.provider === 'openai') {
      aiRecommendation = data.choices[0].message.content.trim();
    } else if (userSettings.provider === 'deepseek') {
      aiRecommendation = data.choices[0].message.content.trim();
    } else if (userSettings.provider === 'openrouter') {
      aiRecommendation = data.choices[0].message.content.trim();
    }
    
    console.log(`AI recommended category: "${aiRecommendation}"`);

    // Find the category that best matches the AI recommendation
    const matchedCategory = findClosestCategoryMatch(aiRecommendation, availableCategories, type);
    return matchedCategory;
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return null;
  }
}

// Function to find the closest category match from AI recommendation
function findClosestCategoryMatch(aiRecommendation: string, categories: any[], type: 'INCOME' | 'EXPENSE') {
  // Filter categories by type
  const relevantCategories = categories.filter(cat => cat.type === type || cat.type === 'BOTH');
  
  // First try for exact match (case insensitive)
  const exactMatch = relevantCategories.find(
    cat => cat.name.toLowerCase() === aiRecommendation.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // Then try for partial match
  const partialMatch = relevantCategories.find(
    cat => aiRecommendation.toLowerCase().includes(cat.name.toLowerCase()) ||
           cat.name.toLowerCase().includes(aiRecommendation.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // If we couldn't find a match, look for default category
  const defaultCategory = relevantCategories.find(c => c.isDefault === true);
  if (defaultCategory) return defaultCategory;
  
  // Last resort: return first category of the right type
  return relevantCategories[0] || null;
}

// POST /api/transactions/auto-categorize - Auto-categorize transactions
export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's categories
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
    });

    console.log(`Found ${categories.length} categories for auto-categorization`);

    // Get uncategorized transactions
    const uncategorizedTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        categoryId: null,
      },
    });

    console.log(`Found ${uncategorizedTransactions.length} uncategorized transactions`);

    // Track which transactions were categorized
    const categorized = [];

    // Use AI to categorize each transaction
    for (const transaction of uncategorizedTransactions) {
      // Skip if description is null
      if (!transaction.description) continue;
      
      console.log(`Processing transaction: ${transaction.description}`);
      
      // First try to use AI for categorization
      let matchedCategory = null;
      
      const aiCategory = await getAICategoryRecommendation(
        transaction.description,
        transaction.type as 'INCOME' | 'EXPENSE',
        categories,
        user.id
      );
      
      if (aiCategory) {
        matchedCategory = aiCategory;
        console.log(`AI suggested category: ${matchedCategory.name}`);
      } else {
        console.log('AI categorization failed, falling back to pattern matching');
        
        // Fall back to pattern matching if AI fails
        matchedCategory = findFallbackCategory(
          transaction.description,
          transaction.type as 'INCOME' | 'EXPENSE',
          categories
        );
      }
      
      if (matchedCategory && matchedCategory.id) {
        // Update the transaction with the matched category
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { categoryId: matchedCategory.id },
        });
        
        // Add to categorized list with category info
        categorized.push({
          ...transaction,
          categoryId: matchedCategory.id,
          category: {
            id: matchedCategory.id,
            name: matchedCategory.name,
            color: matchedCategory.color,
            type: matchedCategory.type,
          },
        });
      }
    }

    console.log(`Successfully categorized ${categorized.length} out of ${uncategorizedTransactions.length} transactions`);

    return NextResponse.json({ 
      success: true, 
      message: `Auto-categorized ${categorized.length} out of ${uncategorizedTransactions.length} transactions`,
      categorized
    });
  } catch (error) {
    console.error('Error during auto-categorization:', error);
    return NextResponse.json({ error: 'Failed to auto-categorize transactions' }, { status: 500 });
  }
}

// Fallback pattern matching if AI is not available
function findFallbackCategory(description: string, type: 'INCOME' | 'EXPENSE', categories: any[]) {
  console.log(`Using pattern matching for: "${description}", type: ${type}`);
  
  // Common patterns for different categories (can be expanded)
  const patterns = [
    { regex: /(?:belanja|supermarket|mart|swalayan|grocery|food|makanan|makan|resto|restaurant|cafe)/i, category: 'Food', type: 'EXPENSE' },
    { regex: /(?:obat|medicine|apotek|pharmacy|guardian|health|kesehatan|vitamin|doctor|dokter)/i, category: 'Healthcare', type: 'EXPENSE' },
    { regex: /(?:transportasi|transport|travel|grab|gojek|uber|taksi|taxi|bensin|gas|toll|tol|parkir|parking)/i, category: 'Transportation', type: 'EXPENSE' },
    { regex: /(?:listrik|electricity|air|water|internet|wifi|phone|pulsa|gas|pln|pdam)/i, category: 'Utilities', type: 'EXPENSE' },
    { regex: /(?:film|movie|netflix|disney|spotify|music|game|entertainment|hiburan)/i, category: 'Entertainment', type: 'EXPENSE' },
    { regex: /(?:baju|pakaian|clothes|fashion|shoes|sepatu|bag|tas)/i, category: 'Shopping', type: 'EXPENSE' },
    { regex: /(?:gaji|salary|upah|wage|income|pendapatan)/i, category: 'Salary', type: 'INCOME' },
    { regex: /(?:bonus|dividend|dividen|bunga|interest|investasi|investment)/i, category: 'Investment', type: 'INCOME' },
    { regex: /(?:tabungan|savings|deposit|deposito)/i, category: 'Savings', type: 'EXPENSE' },
  ];
  
  // Find matching pattern
  for (const pattern of patterns) {
    if (pattern.type === type && pattern.regex.test(description)) {
      // Find category by name
      const matchedCategory = categories.find(
        cat => (cat.type === type || cat.type === 'BOTH') && 
               cat.name.toLowerCase() === pattern.category.toLowerCase()
      );
      
      if (matchedCategory) {
        console.log(`Pattern match found: ${pattern.category}`);
        return matchedCategory;
      }
    }
  }
  
  // If no match, get default category for this type
  const defaultCategory = categories.find(
    cat => (cat.type === type || cat.type === 'BOTH') && cat.isDefault === true
  );
  
  if (defaultCategory) {
    console.log(`Using default category: ${defaultCategory.name}`);
    return defaultCategory;
  }
  
  // Last resort: first category of the correct type
  const fallbackCategory = categories.find(cat => cat.type === type || cat.type === 'BOTH');
  if (fallbackCategory) {
    console.log(`Using fallback category: ${fallbackCategory.name}`);
    return fallbackCategory;
  }
  
  console.log(`No matching category found for "${description}"`);
  return null;
} 