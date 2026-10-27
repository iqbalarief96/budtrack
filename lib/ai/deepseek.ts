import { generateAIResponse } from '../ai'
import { calculateMonthlyExpenses } from '../walletEmergencyFund'

interface EmergencyFundRecommendation {
  recommendedTarget: number
  multiplier: number
  explanation: string
  usedAI: boolean
  monthlyExpenses: number
  volatility: 'high' | 'medium' | 'low'
}

/**
 * Generate emergency fund target recommendation using DeepSeek AI as financial expert
 */
export async function generateEmergencyFundRecommendation(
  userId: string,
  walletId: string,
  aiSettings: {
    provider: string
    apiKey: string
    model: string
    customEndpoint?: string | null
  }
): Promise<EmergencyFundRecommendation> {
  try {
    // Calculate monthly expenses data
    const expenseData = await calculateMonthlyExpenses(userId, walletId, 6)

    // If no expense data, return default recommendation
    if (expenseData.averageMonthly === 0) {
      return {
        recommendedTarget: 5000000, // Default 5 million IDR
        multiplier: 3,
        explanation: 'Karena belum ada data pengeluaran, kami merekomendasikan target default 5 juta rupiah sebagai dana darurat awal. Sesuaikan sesuai kebutuhan kamu!',
        usedAI: false,
        monthlyExpenses: 0,
        volatility: 'low',
      }
    }

    // Determine volatility level
    const cv = expenseData.coefficientOfVariation
    let volatility: 'high' | 'medium' | 'low'
    if (cv > 0.5) volatility = 'high'
    else if (cv > 0.3) volatility = 'medium'
    else volatility = 'low'

    // Try to use AI if settings available
    if (aiSettings.provider && aiSettings.apiKey) {
      try {
        const aiRecommendation = await getAIRecommendation(expenseData, aiSettings, volatility)
        return {
          ...aiRecommendation,
          usedAI: true,
          monthlyExpenses: expenseData.averageMonthly,
          volatility,
        }
      } catch (aiError) {
        console.error('AI recommendation failed, using fallback algorithm:', aiError)
        // Fall through to fallback algorithm
      }
    }

    // Fallback: Statistical algorithm
    return getFallbackRecommendation(expenseData, volatility)
  } catch (error) {
    console.error('Error generating emergency fund recommendation:', error)
    throw error
  }
}

/**
 * Get AI-powered recommendation using DeepSeek
 */
async function getAIRecommendation(
  expenseData: any,
  aiSettings: { provider: string; apiKey: string; model: string; customEndpoint?: string | null },
  volatility: 'high' | 'medium' | 'low'
): Promise<Omit<EmergencyFundRecommendation, 'usedAI' | 'monthlyExpenses' | 'volatility'>> {
  // Build comprehensive prompt for DeepSeek
  const prompt = `You are a financial expert specializing in emergency fund planning. Your task is to recommend an emergency fund target based on the user's spending patterns.

**User's Spending Data (Last 6 Months):**
- Average Monthly Expenses: Rp ${expenseData.averageMonthly.toLocaleString('id-ID')}
- Total Expenses: Rp ${expenseData.totalExpenses.toLocaleString('id-ID')}
- Spending Volatility (CV): ${expenseData.coefficientOfVariation} (${volatility})
- Transaction Count: ${expenseData.transactionCount}

**Volatility Analysis:**
- High volatility (CV > 0.5): Unpredictable spending, recommend 5-6 months
- Medium volatility (CV 0.3-0.5): Moderate variation, recommend 4-5 months
- Low volatility (CV < 0.3): Stable spending, recommend 3-4 months

**Task:**
Analyze the user's spending pattern and recommend:
1. A multiplier (3 to 6) representing how many months of expenses to save
2. Calculate the recommended emergency fund target
3. Provide a friendly, concise explanation in Indonesian (casual Jakarta style / "Jaksel") about why this amount is recommended

**Important:**
- Be conversational and friendly (use "kamu" not "Anda")
- Keep explanation brief (2-3 sentences max)
- Focus on practical reasoning
- Use Indonesian Rupiah format

**Respond in this EXACT JSON format:**
{
  "multiplier": 4.5,
  "recommendedTarget": 13500000,
  "explanation": "Based on spending pattern kamu yang cukup stabil, gue recommend dana darurat sekitar 4.5 bulan pengeluaran. Ini cukup safety net kalau ada unexpected situations tapi gak terlalu berat buat dicapai!"
}

Generate the recommendation now:`

  try {
    const response = await generateAIResponse({
      prompt,
      provider: aiSettings.provider,
      apiKey: aiSettings.apiKey,
      model: aiSettings.model,
      customEndpoint: aiSettings.customEndpoint,
    })

    // Parse AI response
    const parsed = parseAIResponse(response)

    // Validate and sanitize
    const multiplier = Math.max(3, Math.min(6, parsed.multiplier))
    const recommendedTarget = Math.round(expenseData.averageMonthly * multiplier)

    // Safety check: If AI recommends too low and volatility is high, override
    if (volatility === 'high' && multiplier < 5) {
      return {
        multiplier: 5,
        recommendedTarget: Math.round(expenseData.averageMonthly * 5),
        explanation: `${parsed.explanation} (Disesuaikan ke 5 bulan karena spending kamu cukup volatile)`,
      }
    }

    return {
      multiplier,
      recommendedTarget,
      explanation: parsed.explanation,
    }
  } catch (error) {
    console.error('Error getting AI recommendation:', error)
    throw error
  }
}

/**
 * Parse AI response with error handling
 */
function parseAIResponse(response: string): { multiplier: number; recommendedTarget: number; explanation: string } {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.multiplier || !parsed.recommendedTarget || !parsed.explanation) {
      throw new Error('Missing required fields in AI response')
    }

    return parsed
  } catch (error) {
    console.error('Error parsing AI response:', error)
    throw new Error('Failed to parse AI response')
  }
}

/**
 * Fallback recommendation algorithm (statistical)
 */
function getFallbackRecommendation(
  expenseData: any,
  volatility: 'high' | 'medium' | 'low'
): EmergencyFundRecommendation {
  let multiplier: number
  let explanation: string

  switch (volatility) {
    case 'high':
      multiplier = 6
      explanation = `Pengeluaran kamu cukup bervariasi (volatilitas tinggi). Kami recommend dana darurat 6 bulan untuk safety net yang lebih kuat. Ini sekitar Rp ${(expenseData.averageMonthly * 6).toLocaleString('id-ID')} berdasarkan rata-rata pengeluaran kamu.`
      break

    case 'medium':
      multiplier = 4
      explanation = `Pengeluaran kamu cukup stabil dengan variasi moderate. Dana darurat 4 bulan pengeluaran (sekitar Rp ${(expenseData.averageMonthly * 4).toLocaleString('id-ID')}) sudah cukup aman untuk handle situasi emergency.`
      break

    case 'low':
    default:
      multiplier = 3
      explanation = `Pengeluaran kamu sangat stabil! Dana darurat 3 bulan pengeluaran (sekitar Rp ${(expenseData.averageMonthly * 3).toLocaleString('id-ID')}) sudah cukup sebagai cushion untuk unexpected situations.`
      break
  }

  return {
    recommendedTarget: Math.round(expenseData.averageMonthly * multiplier),
    multiplier,
    explanation,
    usedAI: false,
    monthlyExpenses: expenseData.averageMonthly,
    volatility,
  }
}

/**
 * Get random success toast message in Indonesian
 */
export function getRandomSuccessMessage(): string {
  const messages = [
    '✨ AI recommendation generated successfully!',
    '🎯 Smart recommendation ready!',
    '💡 Financial analysis complete!',
    '🚀 Target calculated with AI magic!',
    '✅ Emergency fund recommendation ready!',
  ]

  return messages[Math.floor(Math.random() * messages.length)]
}
