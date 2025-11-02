import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { formatCurrency } from '@/lib/utils';
import { generateAIResponse } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const data = await request.json();
    const { walletId } = data;
    
    console.log('AI Emergency Fund Target Generation requested for walletId:', walletId);
    
    // Get the user with AI settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true,
        settings: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Fetch the transactions to analyze spending patterns
    // Get 3-6 months of expense transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    console.log('Fetching transactions since:', sixMonthsAgo.toISOString());
    
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'EXPENSE', // Only analyze expenses
        date: {
          gte: sixMonthsAgo // Get last 6 months
        },
        ...(walletId ? { walletId } : {})
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    console.log(`Found ${transactions.length} expense transactions for analysis`);
    
    // Calculate monthly expenses by filtering out savings and investments
    // We don't want to include savings/investments in emergency fund calculations
    const essentialExpenses = transactions.filter(tx => {
      // Skip transactions that are savings or investments
      const isSavings = tx.description?.toLowerCase().includes('tabungan') || false;
      const isInvestment = tx.description?.toLowerCase().includes('investasi') || 
                          tx.description?.toLowerCase().includes('investment') || false;
      const isSavingsCategory = tx.category?.type?.toUpperCase() === 'SAVINGS';
      
      return !(isSavings || isInvestment || isSavingsCategory);
    });
    
    console.log(`Filtered to ${essentialExpenses.length} essential expenses`);
    
    // Calculate total expenses over the period
    const totalEssentialExpenses = essentialExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate average monthly expense
    const months = 6; // We fetched 6 months of data
    const averageMonthlyExpense = totalEssentialExpenses / months;
    
    console.log(`Average monthly essential expenses: ${averageMonthlyExpense}`);
    
    let multiplier = 3; // Default multiplier
    let aiEnhancedMultiplier = false;
    let aiReasoning = '';
    let aiMultiplier = 0; // Add declaration here for wider scope
    
    // Check if user has AI settings configured
    if (user.settings?.provider && user.settings?.apiKey) {
      try {
        // Format transaction data for the AI
        const transactionsSummary = essentialExpenses.slice(0, 20).map(tx => {
          return `- ${tx.description || 'Unnamed transaction'}: ${formatCurrency(tx.amount)}`;
        }).join('\n');
        
        // Calculate expense variation for additional context
        const amounts = essentialExpenses.map(tx => tx.amount);
        const mean = amounts.length > 0 ? amounts.reduce((sum, val) => sum + val, 0) / amounts.length : 0;
        const variance = amounts.length > 0 ? amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length : 0;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
        
        const prompt = `
        I need to recommend an emergency fund target amount for a user based on their financial data. Analyze the information below and respond using a casual, Jakarta-style (Jaksel) tone — chill, insightful, and relatable, but **not alay or over the top**.

        Monthly expense summary:
        - Average monthly essential expenses: ${formatCurrency(averageMonthlyExpense)}
        - Standard deviation of expenses: ${formatCurrency(stdDev)}
        - Coefficient of Variation (CV – higher means spending is more volatile): ${coefficientOfVariation.toFixed(2)}
        - Total essential expense transactions analyzed: ${essentialExpenses.length}
        - Sample transactions:
        ${transactionsSummary}

        Based on this data:
        1. Recommend a **multiplier (between 3 to 6)** to apply to the average monthly essential expenses to calculate the ideal emergency fund target.
        2. Provide a **brief explanation in a Jaksel style** — 1 to 2 sentences that are insightful, friendly, and to-the-point.
        3. Highlight **which factors** influenced your recommendation (e.g., spending volatility, patterns, stability, etc).

        Format your response like this:

        **Multiplier:** [number between 3–6]  
        **Reasoning:** [Jaksel-style explanation, 1–2 sentences]  
        **Factors:** [mention CV, stability, patterns, etc.]
        `;
        
        // Call the AI with user's settings
        const aiResponse = await generateAIResponse({
          provider: user.settings.provider,
          model: user.settings.selectedModel || (user.settings.provider === 'deepseek' ? 'deepseek-chat' : 'google/gemini-pro'),
          apiKey: user.settings.apiKey,
          prompt: prompt
        });
        
        console.log('AI response received:', aiResponse);
        console.log('AI provider:', user.settings.provider);
        console.log('AI model:', user.settings.selectedModel || (user.settings.provider === 'deepseek' ? 'deepseek-chat' : 'google/gemini-pro'));
        
        // Parse the AI response - try multiple patterns since AI might format responses differently
        let multiplierMatch = aiResponse.match(/[*]?Multiplier:?\s*([3-6](\.\d+)?)/i) || 
                             aiResponse.match(/multiplier.*?([3-6](\.\d+)?)/i) ||
                             aiResponse.match(/([3-6](\.\d+)?)\s*x/i);
                             
        let reasoningMatch = aiResponse.match(/[*]?Reasoning:?\s*(.*?)(\n|$)/i) || 
                            aiResponse.match(/I recommend.*?(.*?)(\n|$)/i);
                            
        let factorsMatch = aiResponse.match(/[*]?Factors:?\s*(.*?)(\n|$)/i) || 
                          aiResponse.match(/factors.*?(.*?)(\n|$)/i);
        
        console.log('Regex matches:', { 
          multiplierMatch: multiplierMatch ? multiplierMatch[1] : null,
          reasoningMatch: reasoningMatch ? reasoningMatch[1] : null,
          factorsMatch: factorsMatch ? factorsMatch[1] : null
        });
        
        // If we can't parse with regex, try to use the full response
        if (!multiplierMatch && !reasoningMatch) {
          console.log('Failed to parse AI response with regex, using full response');
          
          // Try to extract any number between 3-6 from the response
          const anyNumberMatch = aiResponse.match(/([3-6](\.\d+)?)/);
          if (anyNumberMatch) {
            multiplierMatch = anyNumberMatch;
            aiReasoning = aiResponse.replace(anyNumberMatch[0], '').trim();
          } else {
            aiReasoning = aiResponse;
          }
        }
        
        if (multiplierMatch && multiplierMatch[1]) {
          aiMultiplier = parseFloat(multiplierMatch[1]);
          console.log(`AI recommended multiplier: ${aiMultiplier}`);
          
          // Set the flag that we got something from AI
          aiEnhancedMultiplier = true;
          
          if (reasoningMatch && reasoningMatch[1]) {
            aiReasoning = reasoningMatch[1].trim();
            console.log(`AI reasoning: ${aiReasoning}`);
            
            // If we also got factors, append them to the reasoning
            if (factorsMatch && factorsMatch[1]) {
              const factors = factorsMatch[1].trim();
              aiReasoning += ` Factors: ${factors}`;
            }
          }
        }
      } catch (aiError) {
        console.error('Error using AI for multiplier recommendation:', aiError);
        // Fall back to algorithmic approach on AI error
      }
    }
    
    // If AI didn't provide a multiplier, use the algorithmic approach
    if (!aiEnhancedMultiplier) {
      // Calculate expense variation
      const amounts = essentialExpenses.map(tx => tx.amount);
      if (amounts.length > 0) {
        const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;
        
        console.log(`Expense variation (CV): ${coefficientOfVariation}`);
        
        // Adjust multiplier based on expense variation
        if (coefficientOfVariation > 0.5) { // High variation
          multiplier = 6; // Recommend 6 months
        } else if (coefficientOfVariation > 0.3) { // Moderate variation
          multiplier = 4; // Recommend 4 months
        }
      }
    } else {
      // We got AI input, but let's verify if we need to override the multiplier
      // based on our algorithmic check for safety
      const amounts = essentialExpenses.map(tx => tx.amount);
      if (amounts.length > 0) {
        const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;
        
        console.log(`Expense variation (CV): ${coefficientOfVariation}`);
        
        // If CV is very high, we might want to override the AI's suggestion
        // but we'll keep the reasoning from AI
        let algorithmMultiplier = aiMultiplier;
        
        if (coefficientOfVariation > 0.5) { // High variation
          algorithmMultiplier = 6; // Recommend 6 months
        } else if (coefficientOfVariation > 0.3) { // Moderate variation
          algorithmMultiplier = Math.max(4, aiMultiplier); // At least 4 months
        }
        
        if (algorithmMultiplier > aiMultiplier) {
          console.log(`Overriding AI multiplier (${aiMultiplier}) with algorithm multiplier (${algorithmMultiplier}) due to high CV (${coefficientOfVariation})`);
          multiplier = algorithmMultiplier;
          
          // Append a note to the reasoning about the override
          if (aiReasoning) {
            aiReasoning += ` (Catatan sistem: Karena volatilitas pengeluaran sangat tinggi, multiplier ditingkatkan dari ${aiMultiplier}x jadi ${multiplier}x untuk keamanan lebih.)`;
          }
        } else {
          multiplier = aiMultiplier;
        }
      } else {
        multiplier = aiMultiplier;
      }
    }
    
    // Generate the AI target amount
    const recommendedTarget = Math.ceil(averageMonthlyExpense * multiplier / 1000) * 1000;
    
    // Create success messages for toast notifications
    const successMessages = [
      `Rekomendasi dana darurat berhasil dihitung: ${formatCurrency(recommendedTarget)} 🔥`,
      `Dengan rata-rata pengeluaran ${formatCurrency(Math.ceil(averageMonthlyExpense))}/bulan, kamu butuh dana darurat sekitar ${formatCurrency(recommendedTarget)} ✨`,
      `Bagus! Kita udah hitung target dana darurat kamu berdasarkan gaya hidup kamu 👊`
    ];
    
    // Randomly select one of the success messages
    const randomSuccessMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
    
    // Log what we're actually using at the end
    console.log('Final values:', {
      multiplier,
      aiReasoning,
      aiEnhancedMultiplier,
      recommendedTarget
    });
    
    // Prepare explanation for the user
    const explanation = {
      averageMonthlyExpense: Math.ceil(averageMonthlyExpense),
      multiplier: multiplier,
      reasoning: aiReasoning || `Karena pengeluaran lo per bulan tuh sekitar ${formatCurrency(Math.ceil(averageMonthlyExpense))}, kita rekomendasiin punya dana darurat ${multiplier}x dari itu. Biar aman kalau ada situasi tak terduga, apalagi pengeluaran lo agak fluktuatif juga.`,
      details: [
        `📊 Rata-rata pengeluaran: ${formatCurrency(Math.ceil(averageMonthlyExpense))}/bulan`,
        `📌 Multiplier yang dipakai: ${multiplier}x${aiEnhancedMultiplier ? ' (dari AI analisa)' : ''}`,
        `💰 Total dana darurat ideal: ${formatCurrency(recommendedTarget)}`
      ],
      isAIGenerated: aiEnhancedMultiplier
    };
    
    console.log('Generated emergency fund recommendation:', recommendedTarget, explanation);
    
    // Get current wallet emergency fund if exists
    let currentTarget = 0;
    let hasExistingFund = false;

    if (walletId) {
      const walletEmergencyFund = await prisma.walletEmergencyFund.findUnique({
        where: { walletId }
      });

      if (walletEmergencyFund) {
        currentTarget = walletEmergencyFund.targetAmount;
        hasExistingFund = true;
      }
    } else {
      // Fallback to general emergency fund if no walletId
      currentTarget = user.emergencyFund?.targetAmount || 0;
      hasExistingFund = !!user.emergencyFund;
    }

    // Return the recommendation
    return NextResponse.json({
      success: true,
      recommendedTarget,
      explanation,
      currentTarget,
      hasExistingFund,
      toastMessage: randomSuccessMessage,
      usedAI: aiEnhancedMultiplier,
      aiProvider: aiEnhancedMultiplier ? user.settings?.provider : null,
      walletId // Include walletId in response for client to use
    });
    
  } catch (error) {
    console.error('Error generating emergency fund target:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 