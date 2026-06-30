'use client'

import React, { useState, useEffect } from 'react'
import {
  FiSave, FiCheck, FiRefreshCw, FiUser, FiMoon, FiBell, FiCpu, FiShield,
  FiMail, FiLock, FiTrash2, FiDownload, FiUpload, FiGlobe, FiDollarSign, FiSun, FiMonitor
} from 'react-icons/fi'
import { useSession } from 'next-auth/react'
import { useTheme } from '../providers/ThemeProvider'
import MigrateSavingsButton from '@/components/MigrateSavingsButton'
import SavingsRulesPanel from '@/components/savings/SavingsRulesPanel'

interface AISettings {
  provider: 'deepseek' | 'openrouter' | 'custom'
  apiKey: string
  deepseekApiKey?: string
  openrouterApiKey?: string
  customApiKey?: string
  selectedModel: string
  customEndpoint?: string
  openaiApiKey?: string
  geminiApiKey?: string
  googleVisionCredentials?: string
}

type TabType = 'profile' | 'appearance' | 'notifications' | 'ai' | 'security'

const models = {
  deepseek: [
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'deepseek-chat',
    'deepseek-reasoner',
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
  custom: [],
}

const providerLabels = {
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  custom: 'Custom Endpoint',
}

const SettingsPage = () => {
  const { data: session } = useSession()
  const { theme, setTheme, colorTheme, setColorTheme, effectiveTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // AI Settings State
  const [aiSettings, setAiSettings] = useState<AISettings>({
    provider: 'deepseek',
    apiKey: '',
    deepseekApiKey: '',
    openrouterApiKey: '',
    customApiKey: '',
    selectedModel: models.deepseek[0],
    customEndpoint: '',
    openaiApiKey: '',
    geminiApiKey: '',
    googleVisionCredentials: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifyingOpenAI, setVerifyingOpenAI] = useState(false)
  const [verifiedOpenAI, setVerifiedOpenAI] = useState(false)
  const [verifyingGemini, setVerifyingGemini] = useState(false)
  const [verifiedGemini, setVerifiedGemini] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>(models.deepseek)
  const [modelSearch, setModelSearch] = useState('')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [uploadingVision, setUploadingVision] = useState(false)
  const [visionFileName, setVisionFileName] = useState<string | null>(null)

  // Appearance Settings State (using theme from context)
  const [language, setLanguage] = useState('id')
  const [currency, setCurrency] = useState('IDR')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')

  // Notifications State
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [budgetAlerts, setBudgetAlerts] = useState(true)
  const [goalReminders, setGoalReminders] = useState(true)
  const [transactionNotif, setTransactionNotif] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchSettings()
    }
  }, [session])

  useEffect(() => {
    const defaults = models[aiSettings.provider]
    setAvailableModels((prev) => aiSettings.provider === 'custom' ? prev : defaults)
    setModelSearch('')
  }, [aiSettings.provider])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()

      if (data.provider) {
        const provider = (data.provider || 'deepseek') as AISettings['provider']
        const defaultModel = models[provider]?.[0] || ''
        const deepseekApiKey = data.deepseekApiKey || ''
        const openrouterApiKey = data.openrouterApiKey || ''
        const customApiKey = data.customApiKey || ''
        const activeApiKey = provider === 'deepseek'
          ? deepseekApiKey
          : provider === 'openrouter'
            ? openrouterApiKey
            : provider === 'custom'
              ? customApiKey
              : ''
        setAiSettings({
          provider,
          apiKey: activeApiKey,
          deepseekApiKey,
          openrouterApiKey,
          customApiKey,
          selectedModel: data.selectedModel || defaultModel,
          customEndpoint: provider === 'custom' ? data.customEndpoint || '' : '',
          openaiApiKey: data.openaiApiKey || '',
          geminiApiKey: data.geminiApiKey || '',
          googleVisionCredentials: data.googleVisionCredentials || '',
        })
        setVerified(true)
        if (data.openaiApiKey) setVerifiedOpenAI(true)
        if (data.geminiApiKey) setVerifiedGemini(true)
      }

      // Load other settings
      if (data.theme) setTheme(data.theme)
      if (data.colorTheme) setColorTheme(data.colorTheme)
      setLanguage(data.language || 'id')
      setCurrency(data.currency || 'IDR')
    } catch (err) {
      console.error('Error fetching settings:', err)
    }
  }

  const verifyApiKey = async (type: 'chatbot' | 'openai' | 'gemini' = 'chatbot') => {
    if (type === 'chatbot') setVerifying(true)
    if (type === 'openai') setVerifyingOpenAI(true)
    if (type === 'gemini') setVerifyingGemini(true)

    try {
      const response = await fetch('/api/settings/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.provider,
          apiKey:
            type === 'chatbot'
              ? aiSettings.apiKey
              : type === 'openai'
                ? aiSettings.openaiApiKey
                : aiSettings.geminiApiKey,
          selectedModel: aiSettings.selectedModel,
          customEndpoint: aiSettings.customEndpoint,
          type,
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

  const fetchProviderModels = async () => {
    setFetchingModels(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.provider,
          apiKey: aiSettings.apiKey,
          customEndpoint: aiSettings.customEndpoint,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch models')
      const fetched = data.models || []
      setAvailableModels(fetched)
      setModelSearch('')
      setModelDropdownOpen(true)
      if (!fetched.includes(aiSettings.selectedModel)) {
        setAiSettings((prev) => ({ ...prev, selectedModel: fetched[0] || prev.selectedModel }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models')
    } finally {
      setFetchingModels(false)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const keyField = `${aiSettings.provider}ApiKey` as keyof AISettings
      const activeApiKey = (aiSettings[keyField] as string) || aiSettings.apiKey
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.provider,
          apiKey: activeApiKey,
          deepseekApiKey: aiSettings.provider === 'deepseek' ? activeApiKey : aiSettings.deepseekApiKey,
          openrouterApiKey: aiSettings.provider === 'openrouter' ? activeApiKey : aiSettings.openrouterApiKey,
          customApiKey: aiSettings.provider === 'custom' ? activeApiKey : aiSettings.customApiKey,
          selectedModel: aiSettings.selectedModel,
          customEndpoint: aiSettings.provider === 'custom' ? aiSettings.customEndpoint : '',
          openaiApiKey: aiSettings.openaiApiKey,
          geminiApiKey: aiSettings.geminiApiKey,
          googleVisionCredentials: aiSettings.googleVisionCredentials,
          currency,
          language,
          theme,
          colorTheme,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: <FiUser size={18} /> },
    { id: 'appearance' as TabType, label: 'Appearance', icon: <FiMoon size={18} /> },
    { id: 'notifications' as TabType, label: 'Notifications', icon: <FiBell size={18} /> },
    { id: 'ai' as TabType, label: 'AI & Integrations', icon: <FiCpu size={18} /> },
    { id: 'security' as TabType, label: 'Security', icon: <FiShield size={18} /> },
  ]

  const filteredModels = availableModels.filter((model) =>
    model.toLowerCase().includes(modelSearch.toLowerCase())
  )
  const visibleModels = filteredModels.slice(0, 80)

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-500">Please sign in to access settings</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-1 p-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg">
                      {session?.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                        <FiUpload size={16} />
                        <span>Change Avatar</span>
                      </button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max. 2MB)</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      defaultValue={session?.user?.name || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="email"
                        defaultValue={session?.user?.email || ''}
                        disabled
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded-lg font-medium">
                        Verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Appearance Settings</h2>
                <div className="space-y-6">
                  {/* Theme Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Theme Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'light', icon: FiSun, label: 'Light' },
                        { value: 'dark', icon: FiMoon, label: 'Dark' },
                        { value: 'system', icon: FiMonitor, label: 'System' }
                      ] as const).map((themeOpt) => {
                        const Icon = themeOpt.icon
                        return (
                          <button
                            key={themeOpt.value}
                            onClick={() => setTheme(themeOpt.value)}
                            className={`p-4 border-2 rounded-lg transition-all ${
                              theme === themeOpt.value
                                ? 'border-blue-600 bg-blue-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`mx-auto mb-2 ${theme === themeOpt.value ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                            <p className={`text-sm font-medium ${theme === themeOpt.value ? 'text-blue-600' : 'text-gray-600'}`}>
                              {themeOpt.label}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Current: <span className="font-medium capitalize">{effectiveTheme}</span> mode
                    </p>
                  </div>

                  {/* Color Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Color Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'blue', color: 'from-blue-500 to-blue-600', label: 'Blue' },
                        { value: 'purple', color: 'from-purple-500 to-purple-600', label: 'Purple' },
                        { value: 'green', color: 'from-green-500 to-green-600', label: 'Green' },
                        { value: 'orange', color: 'from-orange-500 to-orange-600', label: 'Orange' },
                        { value: 'pink', color: 'from-pink-500 to-pink-600', label: 'Pink' },
                        { value: 'red', color: 'from-red-500 to-red-600', label: 'Red' }
                      ] as const).map((colorOpt) => (
                        <button
                          key={colorOpt.value}
                          onClick={() => setColorTheme(colorOpt.value)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            colorTheme === colorOpt.value
                              ? 'border-gray-800 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${colorOpt.color} mb-2`} />
                          <p className={`text-sm font-medium ${colorTheme === colorOpt.value ? 'text-gray-900' : 'text-gray-600'}`}>
                            {colorOpt.label}
                          </p>
                          {colorTheme === colorOpt.value && (
                            <FiCheck className="mx-auto mt-1 text-green-600" size={16} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                    </select>
                  </div>

                  {/* Date Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Email Notifications', desc: 'Receive email updates about your account', state: emailNotifications, setState: setEmailNotifications },
                    { id: 'budget', label: 'Budget Alerts', desc: 'Get notified when you exceed budget limits', state: budgetAlerts, setState: setBudgetAlerts },
                    { id: 'goals', label: 'Goal Reminders', desc: 'Reminders about your savings goals progress', state: goalReminders, setState: setGoalReminders },
                    { id: 'transaction', label: 'Transaction Notifications', desc: 'Alert for every new transaction', state: transactionNotif, setState: setTransactionNotif },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{notif.label}</p>
                        <p className="text-sm text-gray-500 mt-1">{notif.desc}</p>
                      </div>
                      <button
                        onClick={() => notif.setState(!notif.state)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notif.state ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notif.state ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI & Integrations Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">AI Configuration</h2>
                <p className="text-gray-600 mb-6">Configure AI providers for chatbot and receipt scanning features</p>

                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-3">AI Provider</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(['deepseek', 'openrouter', 'custom'] as const).map((provider) => (
                        <button
                          key={provider}
                          onClick={() => setAiSettings((prev) => {
                            const providerApiKey = (prev[`${provider}ApiKey` as keyof AISettings] as string) || ''
                            return { ...prev, provider, apiKey: providerApiKey, selectedModel: models[provider][0] || prev.selectedModel }
                          })}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            aiSettings.provider === provider
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-medium">{providerLabels[provider]}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {aiSettings.provider === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Custom endpoint base URL</label>
                      <input
                        type="url"
                        value={aiSettings.customEndpoint || ''}
                        onChange={(e) => setAiSettings((prev) => ({ ...prev, customEndpoint: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/v1"
                      />
                      <p className="mt-1 text-xs text-gray-500">OpenAI-compatible base URL. Models fetched from <code>/models</code>.</p>
                    </div>
                  )}

                  {/* Main API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {providerLabels[aiSettings.provider]} API Key
                    </label>
                    <input
                      type="password"
                      value={aiSettings.apiKey}
                      onChange={(e) => {
                        const value = e.target.value
                        const keyField = `${aiSettings.provider}ApiKey` as keyof AISettings
                        setAiSettings((prev) => ({ ...prev, apiKey: value, [keyField]: value }))
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter ${aiSettings.provider} API key`}
                    />
                    <div className="mt-2">
                      <button
                        onClick={() => verifyApiKey('chatbot')}
                        disabled={verifying || !aiSettings.apiKey}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifying ? <FiRefreshCw className="animate-spin mr-2" size={16} /> : null}
                        Verify API Key
                      </button>
                      {verified && (
                        <span className="ml-3 text-green-600 flex items-center">
                          <FiCheck className="mr-1" /> Valid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Model</label>
                      <button
                        type="button"
                        onClick={fetchProviderModels}
                        disabled={fetchingModels || !aiSettings.apiKey || (aiSettings.provider === 'custom' && !aiSettings.customEndpoint)}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fetchingModels ? <FiRefreshCw className="animate-spin mr-2" size={14} /> : null}
                        Fetch /models
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={aiSettings.selectedModel}
                        onFocus={() => setModelDropdownOpen(true)}
                        onChange={(e) => setAiSettings((prev) => ({ ...prev, selectedModel: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Type model id manually"
                      />

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="search"
                          value={modelSearch}
                          onFocus={() => setModelDropdownOpen(true)}
                          onChange={(e) => {
                            setModelSearch(e.target.value)
                            setModelDropdownOpen(true)
                          }}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Search models..."
                        />
                        <button
                          type="button"
                          onClick={() => setModelDropdownOpen((open) => !open)}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        >
                          {modelDropdownOpen ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {modelDropdownOpen && (
                        <div className="mt-2 w-full max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-xs text-gray-500">
                            <span>{filteredModels.length} models found</span>
                            {filteredModels.length > visibleModels.length && <span>showing first {visibleModels.length}</span>}
                          </div>
                          {visibleModels.length > 0 ? (
                            visibleModels.map((model) => (
                              <button
                                key={model}
                                type="button"
                                onClick={() => {
                                  setAiSettings((prev) => ({ ...prev, selectedModel: model }))
                                  setModelDropdownOpen(false)
                                }}
                                className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                                  aiSettings.selectedModel === model ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {model}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-6 text-center text-sm text-gray-500">
                              No models found. Type model id manually above.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Selected: <code>{aiSettings.selectedModel || 'none'}</code>. Manual typing still allowed.
                    </p>
                  </div>

                  {/* Optional Keys */}
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Optional API Keys (for direct access)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
                        <input
                          type="password"
                          value={aiSettings.openaiApiKey || ''}
                          onChange={(e) => setAiSettings((prev) => ({ ...prev, openaiApiKey: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="sk-..."
                        />
                        <button
                          onClick={() => verifyApiKey('openai')}
                          disabled={verifyingOpenAI || !aiSettings.openaiApiKey}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {verifyingOpenAI ? 'Verifying...' : verifiedOpenAI ? '✓ Verified' : 'Verify'}
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                        <input
                          type="password"
                          value={aiSettings.geminiApiKey || ''}
                          onChange={(e) => setAiSettings((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="AIza..."
                        />
                        <button
                          onClick={() => verifyApiKey('gemini')}
                          disabled={verifyingGemini || !aiSettings.geminiApiKey}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {verifyingGemini ? 'Verifying...' : verifiedGemini ? '✓ Verified' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Google Cloud Vision */}
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-2">Google Cloud Vision (Receipt OCR)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload file JSON credentials Google Cloud Vision untuk fitur scan struk yang lebih cepat
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Credentials JSON
                      </label>
                      
                      {/* File Upload Button */}
                      <div className="flex items-center space-x-3">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return

                              if (!file.name.endsWith('.json')) {
                                setError('File harus berformat .json')
                                return
                              }

                              setUploadingVision(true)
                              setError(null)

                              try {
                                const formData = new FormData()
                                formData.append('file', file)

                                const response = await fetch('/api/settings/upload-vision-credentials', {
                                  method: 'POST',
                                  body: formData
                                })

                                if (!response.ok) {
                                  const error = await response.json()
                                  throw new Error(error.error || 'Failed to upload file')
                                }

                                const data = await response.json()
                                setAiSettings((prev) => ({ ...prev, googleVisionCredentials: data.path }))
                                setVisionFileName(file.name)
                                setSuccess(true)
                                setTimeout(() => setSuccess(false), 3000)
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to upload file')
                              } finally {
                                setUploadingVision(false)
                              }
                            }}
                          />
                          <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                            {uploadingVision ? (
                              <>
                                <FiRefreshCw className="animate-spin mr-2" size={16} />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FiUpload className="mr-2" size={16} />
                                Upload JSON File
                              </>
                            )}
                          </div>
                        </label>

                        {(visionFileName || aiSettings.googleVisionCredentials) && (
                          <div className="flex items-center text-sm text-green-600">
                            <FiCheck className="mr-1" size={16} />
                            {visionFileName || 'File uploaded'}
                          </div>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        File akan disimpan di: <code className="bg-gray-100 px-2 py-1 rounded">credentials/google-vision-credentials.json</code>
                      </p>
                      
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          💡 <strong>Tip:</strong> Google Vision memberikan OCR yang sangat cepat (1-2 detik) untuk scan struk. 
                          Free tier: 1,000 scan/bulan. <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Setup di sini</a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Security & Privacy</h2>
                <div className="space-y-4">
                  {/* Change Password */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Change Password</p>
                        <p className="text-sm text-gray-500 mt-1">Update your password regularly for security</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                        <FiLock size={16} />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>

                  {/* Export Data */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Export Data</p>
                        <p className="text-sm text-gray-500 mt-1">Download all your financial data</p>
                      </div>
                      <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center space-x-2">
                        <FiDownload size={16} />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {/* Migrate Savings to Wallets */}
                  <div>
                    <MigrateSavingsButton />
                  </div>

                  <SavingsRulesPanel />

                  {/* Delete Account */}
                  <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-900">Delete Account</p>
                        <p className="text-sm text-red-600 mt-1">Permanently delete your account and all data</p>
                      </div>
                      <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center space-x-2">
                        <FiTrash2 size={16} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button - Fixed Bottom */}
      <div className="mt-6 flex items-center justify-end space-x-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {success && (
          <span className="text-green-600 flex items-center text-sm">
            <FiCheck className="mr-2" /> Settings saved successfully!
          </span>
        )}
        {error && <span className="text-red-600 text-sm">{error}</span>}
        <button
          onClick={saveSettings}
          disabled={loading}
          className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? (
            <FiRefreshCw className="animate-spin mr-2" size={18} />
          ) : (
            <FiSave className="mr-2" size={18} />
          )}
          Save Changes
        </button>
      </div>
    </div>
  )
}

export default SettingsPage
