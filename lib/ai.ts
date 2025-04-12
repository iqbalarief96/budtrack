interface AIRequestParams {
  prompt: string
  provider: string
  apiKey: string
  model: string
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