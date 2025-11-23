'use client'

import React, { useState, useEffect } from 'react'
import {
  FiSave, FiCheck, FiRefreshCw, FiUser, FiMoon, FiBell, FiCpu, FiShield,
  FiMail, FiLock, FiTrash2, FiDownload, FiUpload, FiGlobe, FiDollarSign
} from 'react-icons/fi'
import { useSession } from 'next-auth/react'

interface AISettings {
  provider: 'deepseek' | 'openrouter'
  apiKey: string
  selectedModel: string
  openaiApiKey?: string
  geminiApiKey?: string
}

type TabType = 'profile' | 'appearance' | 'notifications' | 'ai' | 'security'

const models = {
  deepseek: ['deepseek-chat', 'deepseek-coder'],
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
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // AI Settings State
  const [aiSettings, setAiSettings] = useState<AISettings>({
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

  // Appearance Settings State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
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
    setAvailableModels(models[aiSettings.provider])
  }, [aiSettings.provider])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()

      if (data.provider && data.apiKey) {
        const defaultModel = models[data.provider as 'deepseek' | 'openrouter'][0]
        setAiSettings({
          provider: data.provider,
          apiKey: data.apiKey,
          selectedModel: data.selectedModel || defaultModel,
          openaiApiKey: data.openaiApiKey || '',
          geminiApiKey: data.geminiApiKey || '',
        })
        setVerified(true)
        if (data.openaiApiKey) setVerifiedOpenAI(true)
        if (data.geminiApiKey) setVerifiedGemini(true)
      }

      // Load other settings
      setTheme(data.theme || 'light')
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

  const saveSettings = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiSettings.provider,
          apiKey: aiSettings.apiKey,
          selectedModel: aiSettings.selectedModel,
          openaiApiKey: aiSettings.openaiApiKey,
          geminiApiKey: aiSettings.geminiApiKey,
          currency,
          language,
          theme,
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
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((themeOpt) => (
                        <button
                          key={themeOpt}
                          onClick={() => setTheme(themeOpt)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            theme === themeOpt
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <FiMoon className={`mx-auto mb-2 ${theme === themeOpt ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                          <p className="text-sm font-medium capitalize">{themeOpt}</p>
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
                    <div className="grid grid-cols-2 gap-3">
                      {(['deepseek', 'openrouter'] as const).map((provider) => (
                        <button
                          key={provider}
                          onClick={() => setAiSettings((prev) => ({ ...prev, provider, selectedModel: models[provider][0] }))}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            aiSettings.provider === provider
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-medium capitalize">{provider}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {aiSettings.provider === 'deepseek' ? 'DeepSeek' : 'OpenRouter'} API Key
                    </label>
                    <input
                      type="password"
                      value={aiSettings.apiKey}
                      onChange={(e) => setAiSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                    <select
                      value={aiSettings.selectedModel}
                      onChange={(e) => setAiSettings((prev) => ({ ...prev, selectedModel: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
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
