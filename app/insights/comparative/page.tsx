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
import { Bar } from 'react-chartjs-2'
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import { useWallet } from '@/app/providers/WalletProvider'
import WalletSelector from '@/app/components/WalletSelector'

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

interface ComparativeData {
  periods: string[]
  incomeData: number[]
  expenseData: number[]
  savingsData: number[]
  savingsRateData: number[]
}

const periods = [
  { value: '7days', label: '7 Hari Terakhir' },
  { value: '30days', label: '30 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'lastMonth', label: 'Bulan Lalu' },
  { value: '3months', label: '3 Bulan Terakhir' },
  { value: '6months', label: '6 Bulan Terakhir' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'lastYear', label: 'Tahun Lalu' }
]

const ComparativeInsightsPage = () => {
  const { selectedWallet } = useWallet()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparativeData, setComparativeData] = useState<ComparativeData | null>(null)
  
  useEffect(() => {
    if (selectedWallet) {
      fetchComparativeData()
    }
  }, [selectedWallet, selectedPeriod])

  const fetchComparativeData = async () => {
    if (!selectedWallet) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/insights/comparative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          period: selectedPeriod,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch comparative insights')
      }

      const data = await response.json()
      setComparativeData(data)
    } catch (err) {
      console.error('Error fetching comparative insights:', err)
      setError(err instanceof Error ? err.message : 'Gagal mengambil data. Coba lagi nanti.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const renderBarChart = () => {
    if (!comparativeData) return null

    const chartData = {
      labels: comparativeData.periods,
      datasets: [
        {
          label: 'Pemasukan',
          data: comparativeData.incomeData,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
        {
          label: 'Pengeluaran',
          data: comparativeData.expenseData,
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
        },
        {
          label: 'Tabungan',
          data: comparativeData.savingsData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Perbandingan Pemasukan, Pengeluaran & Tabungan',
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value: any) {
              return formatCurrency(value);
            }
          }
        }
      }
    }

    return (
      <div className="h-80 w-full">
        <Bar data={chartData} options={chartOptions} />
      </div>
    )
  }

  const renderSavingsRateChart = () => {
    if (!comparativeData) return null

    const chartData = {
      labels: comparativeData.periods,
      datasets: [
        {
          label: 'Savings Rate (%)',
          data: comparativeData.savingsRateData,
          backgroundColor: 'rgba(109, 40, 217, 0.6)',
          borderColor: 'rgb(109, 40, 217)',
          borderWidth: 1,
        },
      ],
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: 'Savings Rate per Periode',
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(1) + '%';
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value: any) {
              return value + '%';
            }
          }
        }
      }
    }

    return (
      <div className="h-80 w-full">
        <Bar data={chartData} options={chartOptions} />
      </div>
    )
  }

  if (!selectedWallet) {
    return (
      <div className="p-6">
        <WalletSelector />
        <div className="mt-4 text-center text-gray-500">
          Pilih wallet dulu bro buat liat insights! 👆
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-2">
          <WalletSelector />
          <select
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center text-sm"
            onClick={fetchComparativeData}
            disabled={loading}
          >
            <FiRefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> 
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg flex items-center">
          <FiAlertCircle className="mr-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-80">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {renderBarChart()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {renderSavingsRateChart()}
            </div>
          </div>
          
          {!comparativeData && !loading && (
            <div className="text-center py-10 text-gray-500">
              <p>Belum ada data nih. Coba pilih periode lain atau update dulu wallet lo. ✨</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ComparativeInsightsPage 