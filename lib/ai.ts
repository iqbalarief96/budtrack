type ChatRole = 'system' | 'user' | 'assistant'

type ChatMessage = {
  role: ChatRole
  content: string | Array<Record<string, unknown>>
}

interface AIRequestParams {
  prompt: string
  provider: string
  apiKey: string
  model: string
  customEndpoint?: string | null
  timeoutMs?: number
  maxTokens?: number
  temperature?: number
}

interface ChatbotParams extends AIRequestParams {
  context?: string
  history?: Array<{ role: 'user' | 'assistant', content: string }>
}

type ProviderConfig = {
  name: string
  baseUrls: string[]
  headers?: Record<string, string>
  timeoutMs: number
}

class AIProviderError extends Error {
  constructor(message: string, public status?: number, public url?: string) {
    super(message)
    this.name = 'AIProviderError'
  }
}

function compactModel(provider: string, model: string): string {
  if (provider === 'deepseek') return model.replace(/^deepseek\//, '')
  return model
}

function normalizeBaseUrl(endpoint?: string | null): string {
  const base = endpoint?.trim().replace(/\/+$/, '')
  if (!base) throw new Error('Custom endpoint is required')
  return base
}

function providerConfig(params: AIRequestParams): ProviderConfig {
  const provider = params.provider.toLowerCase()
  const timeoutMs = params.timeoutMs ?? (params.prompt.includes('all time period') ? 60000 : 30000)

  if (provider === 'deepseek') {
    return {
      name: 'DeepSeek',
      baseUrls: ['https://api.deepseek.com/v1'],
      timeoutMs,
    }
  }

  if (provider === 'openrouter') {
    return {
      name: 'OpenRouter',
      baseUrls: ['https://openrouter.ai/api/v1'],
      timeoutMs,
      headers: {
        'HTTP-Referer': 'https://budtrack.iqbalarif.me',
        'X-Title': 'BudTrack',
      },
    }
  }

  if (provider === 'zai') {
    return {
      name: 'Z.ai',
      baseUrls: ['https://api.z.ai/api/coding/paas/v4'],
      timeoutMs,
    }
  }

  if (provider === 'custom') {
    const base = normalizeBaseUrl(params.customEndpoint)
    return {
      name: 'Custom provider',
      baseUrls: [base, ...(base.endsWith('/v1') ? [] : [`${base}/v1`])],
      timeoutMs,
    }
  }

  throw new Error(`Unsupported AI provider: ${params.provider}`)
}

function chatCompletionUrls(baseUrls: string[]): string[] {
  return baseUrls.map((base) => `${base}/chat/completions`)
}

function safeJson(text: string): any | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractMessage(payload: any): string {
  const choice = payload?.choices?.[0]
  const content = choice?.message?.content ?? choice?.text
  if (Array.isArray(content)) {
    return content.map((part) => part?.text ?? '').join('').trim()
  }
  return typeof content === 'string' ? content.trim() : ''
}

function extractSseMessage(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]')
    .map((line) => {
      const payload = safeJson(line)
      const choice = payload?.choices?.[0]
      const content = choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? ''
      if (Array.isArray(content)) return content.map((part) => part?.text ?? '').join('')
      return typeof content === 'string' ? content : ''
    })
    .join('')
    .trim()
}

function stripReasoning(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*(?:The user is asking|We need answer|I should|I need to)[\s\S]*?(?=\n\n|OK|#{1,3}\s|\*\*)/i, '')
    .trim()
}

function parseChatResponse(text: string): string {
  const json = safeJson(text)
  const direct = json ? stripReasoning(extractMessage(json)) : ''
  if (direct) return direct

  const streamed = stripReasoning(extractSseMessage(text))
  if (streamed) return streamed

  throw new Error('Invalid AI response format')
}

function errorMessageFromBody(text: string): string {
  const json = safeJson(text)
  return json?.error?.message || json?.message || text.slice(0, 500) || 'Empty response body'
}

async function postChatCompletion(params: AIRequestParams, messages: ChatMessage[]): Promise<string> {
  const cfg = providerConfig(params)
  const urls = chatCompletionUrls(cfg.baseUrls)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs)
  const failures: string[] = []

  try {
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': `Bearer ${params.apiKey}`,
            ...cfg.headers,
          },
          body: JSON.stringify({
            model: compactModel(params.provider.toLowerCase(), params.model),
            messages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 2000,
            stream: false,
          }),
          signal: controller.signal,
        })

        const text = await response.text()
        if (!response.ok) {
          failures.push(`${url} -> ${response.status}: ${errorMessageFromBody(text)}`)
          continue
        }

        return parseChatResponse(text)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`${cfg.name} request timed out after ${Math.round(cfg.timeoutMs / 1000)}s`)
        }
        failures.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } finally {
    clearTimeout(timeoutId)
  }

  throw new AIProviderError(`${cfg.name} failed: ${failures.join('; ')}`)
}

export async function generateAIResponse(params: AIRequestParams): Promise<string> {
  try {
    return await postChatCompletion(params, [{ role: 'user', content: params.prompt }])
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw error
  }
}

export const __aiTest = {
  safeJson,
  extractSseMessage,
  parseChatResponse,
  chatCompletionUrls,
}

/**
 * Generate a financial chatbot response to a user question
 * 
 * @param params Parameters including prompt, provider, apiKey, model, and optional chat context/history
 * @returns AI-generated response to the financial query
 */
export async function generateChatbotResponse(params: ChatbotParams): Promise<string> {
  try {
    const { prompt, provider, apiKey, model, customEndpoint, context, history } = params;

    // Build complete prompt with context and history
    let fullPrompt = "You are a helpful financial assistant for BudTrack, a personal finance app. ";
    fullPrompt += "Provide friendly, informative and concise responses about financial topics. ";
    fullPrompt += "Focus on practical advice related to budgeting, saving, investing, and general personal finance. ";
    fullPrompt += "Don't recommend specific financial products or services by name unless explicitly asked. ";
    fullPrompt += "Keep answers brief, friendly, and easy to understand.\n\n";
    fullPrompt += "Use Markdown formatting in your responses: **bold** for emphasis, *italics* for secondary emphasis, ";
    fullPrompt += "bullet points for lists, `code` for numbers/percentages, and headings (## or ###) for sections.\n";
    fullPrompt += "Never expose reasoning, chain-of-thought, <thinking>, <think>, analysis, or meta commentary. Return final user-facing answer only.\n\n";

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
      model,
      customEndpoint
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
    const { recentTransactions, historicalData, provider, apiKey, model, customEndpoint } = params;

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
      model,
      customEndpoint
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

export async function generateVisionResponse(params: AIRequestParams & { imageBase64: string }): Promise<string> {
  try {
    const { prompt, imageBase64, provider, apiKey, model } = params;

    if (!apiKey) {
      throw new Error('No API key provided. Please configure your API key in Settings.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for images

    // Google Gemini Direct API
    if (provider === 'google') {
      console.log('[DEBUG] Using direct Google Gemini API');

      // Map model names to Gemini API format
      // Remove provider prefix (google/, openai/, etc)
      let geminiModel = model.replace('google/', '').replace('openai/', '');

      // Map to valid Gemini API model names
      // Try with -latest suffix first, fallback if needed
      let apiVersion = 'v1';

      if (geminiModel.includes('flash-1.5') || geminiModel.includes('1.5-flash') || geminiModel === 'gemini-flash') {
        geminiModel = 'gemini-1.5-flash-latest';
        apiVersion = 'v1';
      } else if (geminiModel.includes('1.5-pro')) {
        geminiModel = 'gemini-1.5-pro-latest';
        apiVersion = 'v1';
      } else if (geminiModel.includes('2.0')) {
        // Gemini 2.0 experimental models
        geminiModel = 'gemini-2.0-flash-exp';
        apiVersion = 'v1beta';
      } else if (geminiModel.includes('vision')) {
        geminiModel = 'gemini-pro-vision';
        apiVersion = 'v1';
      } else {
        // Default to 1.5-flash-latest
        geminiModel = 'gemini-1.5-flash-latest';
        apiVersion = 'v1';
      }

      console.log('[DEBUG] Original model:', model);
      console.log('[DEBUG] Mapped Gemini model:', geminiModel);
      console.log('[DEBUG] Using API version:', apiVersion);

      // Strip data URL prefix - Gemini expects raw base64 without prefix
      const base64Only = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
      console.log('[DEBUG] Original imageBase64 length:', imageBase64.length);
      console.log('[DEBUG] Stripped base64 length:', base64Only.length);

      const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${geminiModel}:generateContent?key=${apiKey}`;
      console.log('[DEBUG] Gemini API URL:', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Only
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[DEBUG] Gemini API error response:', errorData);
        const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
        throw new Error(`Gemini API error: ${errorMessage}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error('[DEBUG] Invalid Gemini response format:', data);
        throw new Error('Invalid response format from Gemini API');
      }

      return text;
    }

    // OpenAI Direct API
    if (provider === 'openai') {
      console.log('[DEBUG] Using direct OpenAI API');

      // Remove provider prefix (openai/, google/, etc)
      let openaiModel = model.replace('openai/', '').replace('google/', '');
      console.log('[DEBUG] Original model:', model);
      console.log('[DEBUG] Mapped OpenAI model:', openaiModel);

      // Strip existing data URL prefix to avoid double prefix
      const base64Only = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
      console.log('[DEBUG] Original imageBase64 length:', imageBase64.length);
      console.log('[DEBUG] Stripped base64 length:', base64Only.length);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel || 'gpt-4o-mini',
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Only}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;

      if (!message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return message;
    }

    // OpenRouter / DeepSeek (default)
    console.log('[DEBUG] Using OpenRouter API');
    console.log('[DEBUG] OpenRouter model:', model);
    console.log('[DEBUG] Image size:', imageBase64.length, 'characters');

    // Strip existing data URL prefix to avoid double prefix
    const base64Only = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    console.log('[DEBUG] Original imageBase64 length:', imageBase64.length);
    console.log('[DEBUG] Stripped base64 length:', base64Only.length);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://budtrack.vercel.app',
        'X-Title': 'Budtrack'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Only}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('[DEBUG] OpenRouter error response:', JSON.stringify(errorData, null, 2));

      // Check for rate limiting error
      if (errorData?.error?.code === 429 || errorData?.error?.metadata?.raw?.includes('rate-limited')) {
        const rawMessage = errorData?.error?.metadata?.raw || '';
        throw new Error(`Model sedang rate-limited. Coba ganti model atau tunggu sebentar lalu coba lagi. Detail: ${rawMessage}`);
      }

      const errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      throw new Error(`OpenRouter API error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('[DEBUG] OpenRouter response:', JSON.stringify(data, null, 2));
    const choice = data.choices?.[0];
    const message = choice?.message?.content;

    if (!message) {
      throw new Error('Invalid response format from Vision API');
    }

    return message;
  } catch (error) {
    console.error('Error generating vision response:', error);
    throw error;
  }
}
