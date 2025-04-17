interface AIRequestParams {
  prompt: string
  provider: string
  apiKey: string
  model: string
}

interface ChatbotParams extends AIRequestParams {
  context?: string
  history?: Array<{role: 'user' | 'assistant', content: string}>
}

async function generateDeepseekResponse(params: AIRequestParams) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiKey}`
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: "user",
            content: params.prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Failed to generate DeepSeek response: ${errorMessage}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response format from DeepSeek API');
    }
    
    return data.choices[0].message.content;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request to DeepSeek API timed out after 30 seconds');
    }
    throw error;
  }
}

async function generateOpenRouterResponse(params: AIRequestParams) {
  try {
    // Increase timeout for 'all' timeframe
    const isAllTimeframe = params.prompt.includes('all time period');
    const timeoutDuration = isAllTimeframe ? 60000 : 30000; // 60 seconds for all timeframe, 30 for others
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    // Simplify the prompt if it's too large (> 4000 chars)
    let promptToUse = params.prompt;
    if (promptToUse.length > 4000) {
      console.log(`Original prompt length: ${promptToUse.length} chars, trimming...`);
      // Keep essential parts and trim the data
      const promptParts = promptToUse.split('Current Spending Patterns:');
      if (promptParts.length > 1) {
        // Take only top 10 spending patterns
        const patterns = promptParts[1].split('-').slice(0, 11);
        promptToUse = promptParts[0] + 'Current Spending Patterns:\nShowing top 10 categories only.\n' + patterns.join('-');
        console.log(`Trimmed prompt length: ${promptToUse.length} chars`);
      }
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiKey}`,
        'HTTP-Referer': 'https://budtrack.vercel.app',
        'X-Title': 'Budtrack'
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: "user",
            content: promptToUse
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`Failed to generate OpenRouter response: ${errorMessage}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response format from OpenRouter API');
    }
    
    return data.choices[0].message.content;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request to OpenRouter API timed out. For "All Time" data, try using a more specific timeframe like Month, Quarter, or Year.');
    }
    throw error;
  }
}

export async function generateAIResponse(params: AIRequestParams): Promise<string> {
  try {
    switch (params.provider.toLowerCase()) {
      case 'deepseek':
        return await generateDeepseekResponse(params)
      case 'openrouter':
        return await generateOpenRouterResponse(params)
      default:
        throw new Error(`Unsupported AI provider: ${params.provider}`)
    }
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw error
  }
}

/**
 * Generate a financial chatbot response to a user question
 * 
 * @param params Parameters including prompt, provider, apiKey, model, and optional chat context/history
 * @returns AI-generated response to the financial query
 */
export async function generateChatbotResponse(params: ChatbotParams): Promise<string> {
  try {
    const { prompt, provider, apiKey, model, context, history } = params;
    
    // Build complete prompt with context and history
    let fullPrompt = "You are a helpful financial assistant for BudTrack, a personal finance app. ";
    fullPrompt += "Provide friendly, informative and concise responses about financial topics. ";
    fullPrompt += "Focus on practical advice related to budgeting, saving, investing, and general personal finance. ";
    fullPrompt += "Don't recommend specific financial products or services by name unless explicitly asked. ";
    fullPrompt += "Keep answers brief, friendly, and easy to understand.\n\n";
    
    // Add user context if available
    if (context) {
      fullPrompt += `User Context: ${context}\n\n`;
    }
    
    // Add conversation history if available
    if (history && history.length > 0) {
      fullPrompt += "Conversation History:\n";
      history.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullPrompt += "\n";
    }
    
    // Add the current question
    fullPrompt += `User's Question: ${prompt}\n\nYour helpful response:`;
    
    // Generate response using the appropriate provider
    return await generateAIResponse({
      prompt: fullPrompt,
      provider,
      apiKey,
      model
    });
    
  } catch (error) {
    console.error('Error generating chatbot response:', error);
    throw error;
  }
}

/**
 * Analyze transaction data to detect unusual spending patterns
 * 
 * @param params Parameters including the transaction data and user financial context
 * @returns Analysis of unusual spending with recommendations
 */
export async function detectUnusualSpending(
  params: AIRequestParams & { 
    recentTransactions: any[],
    historicalData: any
  }
): Promise<{
  unusual: boolean,
  category?: string,
  amount?: number,
  reason?: string,
  recommendation?: string
}> {
  try {
    const { recentTransactions, historicalData, provider, apiKey, model } = params;
    
    // Create a prompt for analyzing unusual spending
    let prompt = "Analyze the following recent transactions and detect any unusual spending patterns ";
    prompt += "compared to the user's historical spending behavior. ";
    prompt += "Only identify truly significant deviations that would be worth alerting the user about.\n\n";
    
    // Include recent transactions data
    prompt += "Recent Transactions:\n";
    prompt += JSON.stringify(recentTransactions) + "\n\n";
    
    // Include historical spending data for context
    prompt += "Historical Spending Patterns:\n";
    prompt += JSON.stringify(historicalData) + "\n\n";
    
    prompt += "Respond in JSON format with the following structure:\n";
    prompt += "{\n";
    prompt += '  "unusual": boolean, // true if unusual spending detected\n';
    prompt += '  "category": string, // category with unusual spending (if unusual is true)\n';
    prompt += '  "amount": number, // the unusual amount spent (if unusual is true)\n';
    prompt += '  "reason": string, // brief explanation of why this is unusual (if unusual is true)\n';
    prompt += '  "recommendation": string // brief recommendation for the user (if unusual is true)\n';
    prompt += "}\n";
    
    const response = await generateAIResponse({
      prompt,
      provider,
      apiKey,
      model
    });
    
    // Parse the JSON response
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse unusual spending response:', e);
      return { unusual: false };
    }
    
  } catch (error) {
    console.error('Error detecting unusual spending:', error);
    return { unusual: false };
  }
} 