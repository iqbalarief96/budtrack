'use server';

import prisma from '@/lib/prisma';
import type { Category, UserSettings } from '@prisma/client';

type CategoryLike = Category & { isDefault?: boolean };

type SuggestionParams = {
  userId: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  categories?: CategoryLike[];
  userSettings?: UserSettings | null;
};

export type SuggestionResult = {
  category: CategoryLike | null;
  source: 'ai' | 'fallback' | 'none';
};

export async function fetchUserCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
  });
}

export async function fetchUserSettings(userId: string) {
  return prisma.userSettings.findUnique({
    where: { userId },
  });
}

export async function suggestCategoryForTransaction({
  userId,
  description,
  type,
  categories,
  userSettings,
}: SuggestionParams): Promise<SuggestionResult> {
  if (!description?.trim()) {
    return { category: null, source: 'none' };
  }

  const categoryList = categories ?? (await fetchUserCategories(userId));
  const settings = userSettings ?? (await fetchUserSettings(userId));

  if (!categoryList.length) {
    return { category: null, source: 'none' };
  }

  let matched: CategoryLike | null = null;
  let source: SuggestionResult['source'] = 'none';

  const aiCategory = await getAICategoryRecommendation(description, type, categoryList, settings);
  if (aiCategory) {
    matched = aiCategory;
    source = 'ai';
  }

  if (!matched) {
    const fallback = await findFallbackCategory(description, type, categoryList);
    if (fallback) {
      matched = fallback;
      source = 'fallback';
    }
  }

  return { category: matched, source };
}

async function getAICategoryRecommendation(
  description: string,
  type: 'INCOME' | 'EXPENSE',
  availableCategories: CategoryLike[],
  userSettings: UserSettings | null | undefined
) {
  try {
    if (!userSettings?.provider || !userSettings.apiKey) {
      return null;
    }

    const provider = userSettings.provider.toLowerCase();
    const categoryOptions = availableCategories
      .filter((cat) => cat.type === type || cat.type === 'BOTH')
      .map((cat) => `"${cat.name}"`)
      .join(', ');

    let apiEndpoint = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let payload: any = {};

    const basePrompt = [
      {
        role: 'system',
        content:
          'You are a financial transaction categorization assistant. You will analyze transaction descriptions and assign the most appropriate category from a provided list. Respond ONLY with the category name, nothing else.',
      },
      {
        role: 'user',
        content: `Categorize this ${type.toLowerCase()} transaction: "${description}".
Available categories: ${categoryOptions}.
Return ONLY the category name without any extra text or punctuation.`,
      },
    ];

    if (provider === 'openai') {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${userSettings.apiKey}`;
      payload = {
        model: userSettings.selectedModel || 'gpt-3.5-turbo',
        messages: basePrompt,
        temperature: 0.3,
        max_tokens: 20,
      };
    } else if (provider === 'deepseek') {
      apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${userSettings.apiKey}`;
      payload = {
        model: userSettings.selectedModel || 'deepseek-chat',
        messages: basePrompt,
        temperature: 0.3,
        max_tokens: 20,
      };
    } else if (provider === 'openrouter') {
      apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${userSettings.apiKey}`;
      headers['HTTP-Referer'] = 'https://budtrack.app';
      headers['X-Title'] = 'Budtrack App';
      payload = {
        model: userSettings.selectedModel || 'openai/gpt-3.5-turbo',
        messages: basePrompt,
        temperature: 0.3,
        max_tokens: 20,
      };
    } else {
      return null;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('AI API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const aiRecommendation = data.choices?.[0]?.message?.content?.trim();
    if (!aiRecommendation) return null;

    return findClosestCategoryMatch(aiRecommendation, availableCategories, type);
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return null;
  }
}

function findClosestCategoryMatch(
  aiRecommendation: string,
  categories: CategoryLike[],
  type: 'INCOME' | 'EXPENSE'
) {
  const relevantCategories = categories.filter((cat) => cat.type === type || cat.type === 'BOTH');

  const exactMatch = relevantCategories.find(
    (cat) => cat.name.toLowerCase() === aiRecommendation.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  const partialMatch = relevantCategories.find(
    (cat) =>
      aiRecommendation.toLowerCase().includes(cat.name.toLowerCase()) ||
      cat.name.toLowerCase().includes(aiRecommendation.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  const defaultCategory = relevantCategories.find((cat) => cat.isDefault === true);
  if (defaultCategory) return defaultCategory;

  return relevantCategories[0] || null;
}

export async function findFallbackCategory(
  description: string,
  type: 'INCOME' | 'EXPENSE',
  categories: CategoryLike[]
): Promise<CategoryLike | null> {
  const patterns = [
    {
      regex: /(?:belanja|supermarket|mart|swalayan|grocery|food|makanan|makan|resto|restaurant|cafe|alfamart|indomaret|indo maret|alfa mart|superindo|griya|yogya|yomart|alfamidi|hypermart|lotte|transmart|carrefour|hero|farmers market|ranch market|papaya)/i,
      category: 'Food',
      type: 'EXPENSE',
    },
    {
      regex: /(?:obat|medicine|apotek|pharmacy|guardian|health|kesehatan|vitamin|doctor|dokter)/i,
      category: 'Healthcare',
      type: 'EXPENSE',
    },
    {
      regex: /(?:transportasi|transport|travel|grab|gojek|uber|taksi|taxi|bensin|gas|toll|tol|parkir|parking)/i,
      category: 'Transportation',
      type: 'EXPENSE',
    },
    {
      regex: /(?:listrik|electricity|air|water|internet|wifi|phone|pulsa|gas|pln|pdam)/i,
      category: 'Utilities',
      type: 'EXPENSE',
    },
    {
      regex: /(?:film|movie|netflix|disney|spotify|music|game|entertainment|hiburan)/i,
      category: 'Entertainment',
      type: 'EXPENSE',
    },
    {
      regex: /(?:baju|pakaian|clothes|fashion|shoes|sepatu|bag|tas)/i,
      category: 'Shopping',
      type: 'EXPENSE',
    },
    {
      regex: /(?:gaji|salary|upah|wage|income|pendapatan)/i,
      category: 'Salary',
      type: 'INCOME',
    },
    {
      regex: /(?:bonus|dividend|dividen|bunga|interest|investasi|investment)/i,
      category: 'Investment',
      type: 'INCOME',
    },
    {
      regex: /(?:tabungan|savings|deposit|deposito)/i,
      category: 'Savings',
      type: 'EXPENSE',
    },
  ];

  for (const pattern of patterns) {
    if (pattern.type === type && pattern.regex.test(description)) {
      const matchedCategory = categories.find(
        (cat) =>
          (cat.type === type || cat.type === 'BOTH') &&
          cat.name.toLowerCase() === pattern.category.toLowerCase()
      );

      if (matchedCategory) {
        return matchedCategory;
      }
    }
  }

  const defaultCategory = categories.find(
    (cat) => (cat.type === type || cat.type === 'BOTH') && (cat as any).isDefault === true
  );
  if (defaultCategory) return defaultCategory;

  return categories.find((cat) => cat.type === type || cat.type === 'BOTH') || null;
}
