import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { analyzeTransactions } from '../../lib/insights';
import { generateAIResponse } from '@/lib/ai';
import { resolveAIConfig, type ResolvedAIConfig } from '@/lib/ai-settings';

// Short, user-safe error string for the UI: never includes the API key.
function sanitizeAIError(error: unknown, apiKey?: string | null): string {
  let message = error instanceof Error ? error.message : String(error);
  if (apiKey) message = message.split(apiKey).join('[redacted]');
  message = message.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
  return message.length > 160 ? message.slice(0, 160) : message;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const url = new URL(req.url);
  const walletId = url.searchParams.get('walletId');
  const useAI = url.searchParams.get('useAI') === 'true';
  
  try {
    // Get transactions from the last 3 months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    // Build query based on wallet filter
    const whereClause: any = {
      userId: session.user.id,
      date: { gte: startDate }
    };
    
    // Add wallet filter if specified
    if (walletId) {
      whereClause.walletId = walletId;
    }
    
    const dbTransactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        wallet: true
      },
      orderBy: { date: 'desc' }
    });
    
    // Convert to the format expected by analyzeTransactions
    const transactions = dbTransactions.map(tx => ({
      id: tx.id,
      type: tx.type as 'INCOME' | 'EXPENSE',
      amount: tx.amount,
      description: tx.description || '',
      date: tx.date,
      category: tx.category || undefined,
      wallet: tx.wallet
    }));
    
    // Generate base insights from transactions
    const baseInsights = analyzeTransactions(transactions);
    
    // If AI enhancement is requested, get user's AI settings and enhance insights
    if (useAI) {
      let aiConfig: ResolvedAIConfig | null = null;
      try {
        // Get user's AI settings
        const userSettings = await prisma.userSettings.findUnique({
          where: {
            userId: session.user.id
          }
        });
        
        aiConfig = resolveAIConfig(userSettings);
        if (!aiConfig) {
          return NextResponse.json({ 
            insights: baseInsights, 
            aiStatus: 'not_configured',
            message: "AI enhancement not available - please configure AI settings first" 
          });
        }
        
        // Create a simplified transaction summary for the AI prompt
        const transactionSummary = transactions.map(tx => ({
          type: tx.type,
          amount: tx.amount,
          category: tx.category?.name || 'Uncategorized',
          date: new Date(tx.date).toISOString().slice(0, 10),
          description: tx.description
        }));
        
        // Create summary statistics
        const totalIncome = transactions
          .filter(tx => tx.type === 'INCOME')
          .reduce((sum, tx) => sum + tx.amount, 0);
          
        const totalExpense = transactions
          .filter(tx => tx.type === 'EXPENSE')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        // Group expenses by category
        const categoryExpenses: Record<string, number> = {};
        transactions
          .filter(tx => tx.type === 'EXPENSE' && tx.category)
          .forEach(tx => {
            const catName = tx.category?.name || 'Uncategorized';
            categoryExpenses[catName] = (categoryExpenses[catName] || 0) + tx.amount;
          });
          
        // Format category expenses for prompt
        const categoryBreakdown = Object.entries(categoryExpenses)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5) // Top 5 categories
          .map(([cat, amount]) => `${cat}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}`)
          .join('\n');
        
        // Build prompt for AI
        let prompt = `Analyze the following transaction data and provide 4-6 creative and personality-rich financial insights in Bahasa Indonesia with casual Jaksel style (mix of Indonesian and English). Make the insights sound like they're coming from a smart, witty financial friend.

Transaction Period: Past 3 months
Total Income: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalIncome)}
Total Expense: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalExpense)}
Balance: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalIncome - totalExpense)}

Top Spending Categories:
${categoryBreakdown}

Use these insight types:
1. "warning" for concerning trends (overspending, deficit, etc)
2. "success" for positive trends (saving money, reduced spending)
3. "info" for neutral observations

DO NOT REUSE these exact template messages but create new ones with your own flair:
- "Bulan ini pengeluaran lo lebih gede X dari pemasukan."
- "Pengeluaran di kategori X naik Y% dibanding bulan lalu."
- "Total pengeluaran lo naik X% dibanding bulan lalu."

Instead, be creative and personal. Comment on specific category changes, suggest actionable tips, and use anak Jaksel expressions.

IMPORTANT: You MUST return ONLY a valid JSON array of objects, with ABSOLUTELY NO additional text before or after the JSON.
Each insight should be a JSON object with:
- "type": either "success", "warning", or "info"
- "message": insight text in Bahasa Indonesia with casual Jaksel style

Example of CORRECT response format:
[
  {"type": "success", "message": "Spending on Entertainment turun 30% dibanding bulan lalu. Good job cutting those expenses!"},
  {"type": "warning", "message": "Noticed kamu spent more on food delivery dibanding groceries, mungkin bisa try meal prepping?"}
]

DO NOT include any text like "Here are the insights" or explanations - ONLY return the JSON array.`;

        // Generate AI response
        const aiResponse = await generateAIResponse({
          prompt,
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          customEndpoint: aiConfig.customEndpoint
        });
        
        let aiInsights = [];
        try {
          // Try to parse JSON response
          aiInsights = JSON.parse(aiResponse);
          if (!Array.isArray(aiInsights)) {
            throw new Error('Response is not an array');
          }
        } catch (parseError) {
          console.error('Failed to parse AI insights:', parseError);
          // If parsing fails, try to extract JSON from text response
          // More robust regex that can handle multiline JSON with multiple objects
          const jsonPattern = /\[\s*\{[\s\S]*\}\s*\]/;
          const jsonMatch = jsonPattern.exec(aiResponse);
          
          if (jsonMatch) {
            try {
              aiInsights = JSON.parse(jsonMatch[0]);
              console.log('Successfully extracted JSON from text response');
            } catch (e) {
              console.error('Failed to extract JSON from response');
              
              // Try another approach - look for array of objects in the text
              try {
                // Extract all possible JSON objects and combine them
                const objectPattern = /\{\s*"type"\s*:\s*"[^"]+"\s*,\s*"message"\s*:\s*"[^"]+"\s*\}/g;
                const matches = [...aiResponse.matchAll(objectPattern)];
                
                if (matches.length > 0) {
                  aiInsights = matches.map(match => JSON.parse(match[0]));
                  console.log('Extracted individual JSON objects:', aiInsights.length);
                } else {
                  aiInsights = [];
                }
              } catch (objError) {
                console.error('Failed to extract individual JSON objects:', objError);
                aiInsights = [];
              }
            }
          } else {
            // Create a single insight with the raw response
            console.log('No JSON found in AI response, using raw text');
            
            // Extract text that looks like insights and format it as insights
            const lines = aiResponse.split(/\n+/);
            aiInsights = lines
              .filter(line => line.trim().length > 20) // Only keep meaningful lines
              .map(line => ({
                type: line.toLowerCase().includes('turun') || line.toLowerCase().includes('kurang') ? 'warning' : 'info',
                message: line.trim().slice(0, 200) // Limit length
              }))
              .slice(0, 3); // Maximum 3 insights
            
            if (aiInsights.length === 0) {
              // Last resort - create a single insight from the beginning of the response
              aiInsights = [{
                type: 'info',
                message: aiResponse.trim().slice(0, 200) + '...'
              }];
            }
          }
        }
        
        // Return ONLY AI insights, not combined with base insights
        if (aiInsights.length > 0) {
          return NextResponse.json({ 
            insights: aiInsights,
            aiStatus: 'ok'
          });
        }
        return NextResponse.json({ 
          insights: baseInsights,
          aiStatus: 'failed',
          message: "AI response could not be parsed - using base insights only"
        });
      } catch (aiError) {
        console.error('Error generating AI insights:', aiError);
        // Return base insights if AI generation fails
        return NextResponse.json({ 
          insights: baseInsights,
          aiStatus: 'failed',
          message: "AI enhancement failed - using base insights only",
          aiError: sanitizeAIError(aiError, aiConfig?.apiKey)
        });
      }
    } else {
      // Return just the base insights if AI is not requested
      return NextResponse.json({ insights: baseInsights });
    }
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
} 