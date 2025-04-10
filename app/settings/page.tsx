'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import { FiSave, FiCheck, FiRefreshCw } from 'react-icons/fi'
import { useSession } from 'next-auth/react'
import { toast } from '@/components/ui/use-toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AIModel {
  id: string
  name: string
}

interface AISettings {
  provider: 'deepseek' | 'openrouter'
  apiKey: string
  selectedModel: string
}

interface SettingsResponse {
  provider?: string;
  apiKey?: string;
  selectedModel?: string;
}

const models = {
  deepseek: [
    'deepseek-chat',
    'deepseek-coder',
  ],
  openrouter: [
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
  })
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
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
        })
        setVerified(true) // Assume API key is verified if it exists
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

  const verifyApiKey = async () => {
    setVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          selectedModel: settings.selectedModel,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to verify API key')
      }

      setVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify API key')
      setVerified(false)
    } finally {
      setVerifying(false)
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
              API Key
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
          
          {/* Verification Button */}
          <div>
            <button
              type="button"
              onClick={verifyApiKey}
              disabled={verifying || !settings.apiKey}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                verifying 
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
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            loading || !verified
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