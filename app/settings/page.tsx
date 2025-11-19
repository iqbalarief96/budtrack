'use client'

import React, { useState, useEffect } from 'react'
import { FiSave, FiCheck, FiRefreshCw } from 'react-icons/fi'
import { useSession } from 'next-auth/react'

interface AISettings {
  provider: 'deepseek' | 'openrouter'
  apiKey: string
  selectedModel: string
  openaiApiKey?: string
  geminiApiKey?: string
}

interface SettingsResponse {
  provider?: string;
  apiKey?: string;
  selectedModel?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
}

const models = {
  deepseek: [
    'deepseek-chat',
    'deepseek-coder',
  ],
  openrouter: [
    'google/gemini-2.0-flash-thinking-exp:free',
    'google/gemini-2.0-flash-thinking-exp-1219:free',
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-2.5-pro-exp-03-25:free',
    'nvidia/llama-3.1-nemotron-70b-instruct:free',
    'deepseek/deepseek-r1-distill-llama-70b:free',
    'deepseek/deepseek-chat-v3-0324:free',
    'deepseek/deepseek-v3-base:free',
    'deepseek/deepseek-chat:free',
    'deepseek/deepseek-r1:free',
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro',
    'meta-llama/llama-2-70b-chat',
    'mistral-ai/mistral-large',
  ],
}

const SettingsPage = () => {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [settings, setSettings] = useState<AISettings>({
    provider: 'deepseek',
    apiKey: '',
    selectedModel: models.deepseek[0],
    openaiApiKey: '',
    geminiApiKey: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyingOpenAI, setVerifyingOpenAI] = useState(false)
  const [verifiedOpenAI, setVerifiedOpenAI] = useState(false)
  const [verifyingGemini, setVerifyingGemini] = useState(false)
  const [verifiedGemini, setVerifiedGemini] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>(models.deepseek)

  useEffect(() => {
    if (session?.user) {
      fetchSettings()
    }
  }, [session])

  useEffect(() => {
    // Update available models when provider changes
    setAvailableModels(models[settings.provider])
  }, [settings.provider])

  const isValidProvider = (provider: string): provider is 'deepseek' | 'openrouter' => {
    return provider === 'deepseek' || provider === 'openrouter'
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      const data = (await response.json()) as SettingsResponse
      // Only update if we have provider and apiKey
      if (data.provider && data.apiKey && isValidProvider(data.provider)) {
        const defaultModel = models[data.provider][0]
        setSettings({
          provider: data.provider,
          apiKey: data.apiKey,
          selectedModel: data.selectedModel || defaultModel,
          openaiApiKey: data.openaiApiKey || '',
          geminiApiKey: data.geminiApiKey || '',
        })
        setVerified(true) // Assume API key is verified if it exists
        if (data.openaiApiKey) setVerifiedOpenAI(true)
        if (data.geminiApiKey) setVerifiedGemini(true)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    }
  }

  const handleProviderChange = (provider: 'deepseek' | 'openrouter') => {
    setSettings(prev => ({
      ...prev,
      provider,
      selectedModel: models[provider][0],
    }))
    setVerified(false)
    setAvailableModels([])
  }

  const handleApiKeyChange = (apiKey: string) => {
    setSettings(prev => ({ ...prev, apiKey }))
    setVerified(false)
  }

  const verifyApiKey = async (type: 'chatbot' | 'openai' | 'gemini' = 'chatbot') => {
    if (type === 'chatbot') setVerifying(true)
    if (type === 'openai') setVerifyingOpenAI(true)
    if (type === 'gemini') setVerifyingGemini(true)

    setError(null)

    try {
      const response = await fetch('/api/settings/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: type === 'chatbot' ? settings.apiKey : (type === 'openai' ? settings.openaiApiKey : settings.geminiApiKey),
          selectedModel: settings.selectedModel,
          type
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to verify API key')
      }

      if (type === 'chatbot') setVerified(true)
      if (type === 'openai') setVerifiedOpenAI(true)
      if (type === 'gemini') setVerifiedGemini(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify API key')
      if (type === 'chatbot') setVerified(false)
      if (type === 'openai') setVerifiedOpenAI(false)
      if (type === 'gemini') setVerifiedGemini(false)
    } finally {
      if (type === 'chatbot') setVerifying(false)
      if (type === 'openai') setVerifyingOpenAI(false)
      if (type === 'gemini') setVerifyingGemini(false)
    }
  }

  const saveSettings = async () => {
    if (!verified) {
      setError('Please verify your API key first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          selectedModel: settings.selectedModel,
          openaiApiKey: settings.openaiApiKey,
          geminiApiKey: settings.geminiApiKey,
          // Include default values for other fields
          currency: 'IDR',
          language: 'id',
          theme: 'light'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please sign in to access settings
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pengaturan</h1>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Pengaturan AI</h2>
        <p className="text-gray-600 mb-6">
          Konfigurasi AI provider dan API key untuk fitur AI di aplikasi BudTrack.
        </p>

        <div className="space-y-4">
          {/* AI Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Provider
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="aiProvider"
                  value="deepseek"
                  checked={settings.provider === 'deepseek'}
                  onChange={() => handleProviderChange('deepseek')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2">DeepSeek</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="aiProvider"
                  value="openrouter"
                  checked={settings.provider === 'openrouter'}
                  onChange={() => handleProviderChange('openrouter')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2">OpenRouter</span>
              </label>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Default API Key (untuk Chatbot & Scan Struk)
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="password"
                name="apiKey"
                id="apiKey"
                value={settings.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Masukkan ${settings.provider === 'deepseek' ? 'DeepSeek' : 'OpenRouter'} API Key`}
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {settings.provider === 'deepseek'
                ? 'Dapatkan API key di dashboard DeepSeek'
                : 'Dapatkan API key di dashboard OpenRouter'}
            </p>
          </div>

          {/* Info for all providers - Scan Receipt support */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Pilihan Provider untuk Scan Struk
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="mb-2">
                    Anda dapat menggunakan provider berikut untuk fitur Scan Struk:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Default Provider (di atas):</strong> Untuk Chatbot & akses via OpenRouter/DeepSeek</li>
                    <li><strong>Gemini Direct:</strong> Isi "Gemini API Key" di bawah untuk akses langsung ke Google Gemini (gratis)</li>
                    <li><strong>OpenAI Direct:</strong> Isi "OpenAI API Key" di bawah untuk akses langsung ke GPT-4o/GPT-4o-mini</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    <strong>Cara Kerja:</strong> Pilih model Gemini saat scan → otomatis pakai Gemini API key jika ada. Pilih model GPT → otomatis pakai OpenAI API key jika ada.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-medium mb-3">API Keys Khusus (Opsional)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Diperlukan untuk fitur Scan Struk jika ingin menggunakan API langsung (tanpa OpenRouter).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={settings.openaiApiKey || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-500 mt-1">Untuk model GPT-4o / GPT-4o-mini. Dapatkan di <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
                <input
                  type="password"
                  value={settings.geminiApiKey || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                  className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="AIza..."
                />
                <p className="text-xs text-gray-500 mt-1">Untuk model Gemini (gratis). Dapatkan di <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com</a></p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => verifyApiKey('openai')}
                disabled={verifyingOpenAI || !settings.openaiApiKey}
                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${verifyingOpenAI || !settings.openaiApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {verifyingOpenAI ? <FiRefreshCw className="animate-spin mr-1 h-3 w-3" /> : null}
                Verify OpenAI
              </button>
              {verifiedOpenAI && <span className="text-green-600 text-xs flex items-center"><FiCheck className="mr-1" /> Valid</span>}

              <button
                type="button"
                onClick={() => verifyApiKey('gemini')}
                disabled={verifyingGemini || !settings.geminiApiKey}
                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${verifyingGemini || !settings.geminiApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {verifyingGemini ? <FiRefreshCw className="animate-spin mr-1 h-3 w-3" /> : null}
                Verify Gemini
              </button>
              {verifiedGemini && <span className="text-green-600 text-xs flex items-center"><FiCheck className="mr-1" /> Valid</span>}
            </div>

          </div>

          {/* Verification Button */}
          <div>
            <button
              type="button"
              onClick={() => verifyApiKey('chatbot')}
              disabled={verifying || !settings.apiKey}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${verifying
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
            >
              {verifying ? (
                <>
                  <FiRefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Verifikasi API Key
                </>
              )}
            </button>

            {/* Verification Status */}
            {verified && (
              <span className="ml-3 text-green-600 flex items-center">
                <FiCheck className="mr-1" /> API Key valid
              </span>
            )}
            {error && (
              <span className="ml-3 text-red-600">
                {error}
              </span>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              Model AI
            </label>
            <select
              id="model"
              name="model"
              value={settings.selectedModel}
              onChange={(e) => setSettings(prev => ({ ...prev, selectedModel: e.target.value }))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Model yang tersedia dari {settings.provider === 'deepseek' ? 'DeepSeek' : 'OpenRouter'}
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={loading || !verified}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${loading || !verified
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <FiSave className="mr-2" />
              Simpan Pengaturan
            </>
          )}
        </button>

        {success && (
          <span className="ml-3 text-green-600 flex items-center">
            <FiCheck className="mr-1" /> Pengaturan disimpan
          </span>
        )}
      </div>
    </div>
  )
}

export default SettingsPage