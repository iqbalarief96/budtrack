'use client'

import React, { useState, useEffect } from 'react'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement,
  Filler 
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import WalletSelector from '../components/WalletSelector'
import { FaChartLine, FaChartPie, FaChartBar } from 'react-icons/fa'
import { Pie } from 'react-chartjs-2'
import ReactMarkdown from 'react-markdown'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

interface ChartData {
  totalIncome: number
  totalExpense: number
  expensesByCategory: Record<string, number>
  monthlyData: Record<string, { income: number; expense: number }>
}

const InsightsPage = () => {
  const { selectedWallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [smartAnalysis, setSmartAnalysis] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string | null;
    analysis: string | null;
  }>({ summary: null, analysis: null })
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (selectedWallet) {
      fetchInsights()
    }
  }, [selectedWallet, dateRange])

  const fetchInsights = async () => {
    if (!selectedWallet) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/insights/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch insights')
      }

      const data = await response.json()
      setChartData(data.data)
      setAiAnalysis(data.summaryPrompt)
      setSmartAnalysis(data.smartAnalysisPrompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const generateAnalysis = async () => {
    if (!chartData) return

    setIsGenerating(true)
    setGenerationError(null)
    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryPrompt: aiAnalysis,
          analysisPrompt: smartAnalysis,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate analysis')
      }

      setAnalysisResult({
        summary: data.summary,
        analysis: data.analysis
      })
    } catch (err) {
      console.error('Failed to generate analysis:', err)
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate analysis')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (!selectedWallet) {
    return (
      <div className="p-6">
        <WalletSelector />
        <div className="mt-4 text-center text-gray-500">
          Please select a wallet to view insights
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <WalletSelector />
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
          <div className="mt-2">Analyzing your financial data...</div>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {chartData && !loading && !error && (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Summary Cards */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Summary</h3>
            <div className="space-y-2">
              <p>Total Income: {formatCurrency(chartData.totalIncome)}</p>
              <p>Total Expenses: {formatCurrency(chartData.totalExpense)}</p>
              <p>Net Savings: {formatCurrency(chartData.totalIncome - chartData.totalExpense)}</p>
            </div>
          </div>

          {/* Monthly Trend */}
          {chartData.monthlyData && Object.keys(chartData.monthlyData).length > 0 && (
            <div className="col-span-2 rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Monthly Trend</h3>
              <Line
                data={{
                  labels: Object.keys(chartData.monthlyData),
                  datasets: [
                    {
                      label: 'Income',
                      data: Object.values(chartData.monthlyData).map(d => d.income),
                      borderColor: 'rgb(75, 192, 192)',
                      tension: 0.1,
                    },
                    {
                      label: 'Expenses',
                      data: Object.values(chartData.monthlyData).map(d => d.expense),
                      borderColor: 'rgb(255, 99, 132)',
                      tension: 0.1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Expenses by Category */}
          {chartData.expensesByCategory && Object.keys(chartData.expensesByCategory).length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Expenses by Category</h3>
              <Pie
                data={{
                  labels: Object.keys(chartData.expensesByCategory),
                  datasets: [
                    {
                      data: Object.values(chartData.expensesByCategory),
                      backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                      ],
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                    },
                  },
                }}
              />
            </div>
          )}

          {/* AI Analysis */}
          <div className="col-span-2 rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FiTrendingUp className="text-blue-500" />
                Smart Insights
              </h3>
              <button
                onClick={generateAnalysis}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>

            {generationError && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-5 h-5" />
                  <p>{generationError}</p>
                </div>
                {generationError.includes('AI settings not configured') && (
                  <a 
                    href="/settings"
                    className="mt-2 inline-flex items-center text-sm text-red-700 hover:text-red-800"
                  >
                    Configure AI Settings →
                  </a>
                )}
              </div>
            )}

            {(analysisResult.summary || analysisResult.analysis) ? (
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="prose max-w-none">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Ringkasan Keuangan</h4>
                  <div className="space-y-4 text-gray-700 bg-gray-50 rounded-lg p-4">
                    {analysisResult.summary ? (
                      <ReactMarkdown 
                        components={{
                          p: ({node, ...props}) => <p className="my-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-lg font-bold my-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-md font-semibold my-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                          li: ({node, ...props}) => <li className="my-1" {...props} />
                        }}
                      >
                        {analysisResult.summary}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-gray-500 text-center">No summary available</p>
                    )}
                  </div>
                </div>

                {/* Smart Analysis Section */}
                <div className="prose max-w-none mt-6">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Analisis Mendalam</h4>
                  <div className="space-y-4 text-gray-700 bg-blue-50 rounded-lg p-4">
                    {analysisResult.analysis ? (
                      <ReactMarkdown 
                        components={{
                          p: ({node, ...props}) => <p className="my-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-lg font-bold my-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-md font-semibold my-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-md font-semibold text-blue-700 my-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2" {...props} />,
                          li: ({node, ...props}) => <li className="my-1" {...props} />
                        }}
                      >
                        {analysisResult.analysis}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-gray-500 text-center">No analysis available</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FiAlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No analysis available</p>
                <p className="text-sm text-gray-400">Click generate to analyze your financial data</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default InsightsPage 