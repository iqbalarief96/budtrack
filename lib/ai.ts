interface AIRequestParams {
  prompt: string
  provider: string
  apiKey: string
  model: string
}

async function generateDeepseekResponse(params: AIRequestParams) {
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
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate DeepSeek response')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function generateOpenRouterResponse(params: AIRequestParams) {
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
          content: params.prompt
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate OpenRouter response')
  }

  const data = await response.json()
  return data.choices[0].message.content
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