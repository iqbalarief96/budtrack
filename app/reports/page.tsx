'use client'

import React, { useState, useEffect } from 'react'
import { FiDownload, FiMail, FiFileText, FiCalendar, FiBarChart2, FiPieChart, FiList, FiFilter } from 'react-icons/fi'
import { useWallet } from '../providers/WalletProvider'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector
} from 'recharts'

type ReportType = 'summary' | 'transactions' | 'categories' | 'trends' | 'all'
type ExportFormat = 'pdf' | 'excel' | 'csv'
type Period = 'month' | 'quarter' | 'year' | 'custom'

const ReportsPage = () => {
  const { selectedWallet, wallets } = useWallet()
  const [reportType, setReportType] = useState<ReportType>('summary')
  const [period, setPeriod] = useState<Period>('month')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf')
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [includeAnalysis, setIncludeAnalysis] = useState(false)

  // Set initial date range based on period
  useEffect(() => {
    const now = new Date()
    let start = new Date()
    
    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), currentQuarter * 3, 1)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        // Don't change dates for custom
        return
    }
    
    setStartDate(start)
    setEndDate(now)
  }, [period])

  const generateReport = async () => {
    if (!startDate || !endDate || !selectedWallet) return
    
    setIsLoading(true)
    
    try {
      // Fetch the data needed for the report
      const response = await fetch(`/api/reports/generate?walletId=${selectedWallet.id}&start=${startDate.toISOString()}&end=${endDate.toISOString()}&type=${reportType}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate report')
      }
      
      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = async (format: ExportFormat) => {
    if (!reportData || !selectedWallet) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          reportType,
          format,
          data: reportData,
          includeAnalysis: format === 'pdf' ? includeAnalysis : false
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to export report')
      }
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = ''
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }
      
      // Fallback filename if header parsing fails
      if (!filename) {
        const extension = format === 'excel' ? 'xlsx' : 
                        (format === 'pdf' ? 'pdf' : 'csv')
        filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${extension}`
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const shareReport = async (email: string) => {
    if (!reportData || !selectedWallet) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: selectedWallet.id,
          email,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          reportType,
          format: exportFormat,
          data: reportData
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to share report')
      }
      
      alert('Report shared successfully')
    } catch (error) {
      console.error('Error sharing report:', error)
      alert('Failed to share report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderReportOptions = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Report Type Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Tipe Laporan</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${reportType === 'summary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setReportType('summary')}
          >
            <FiBarChart2 className="mr-1" /> Ringkasan
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${reportType === 'transactions' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setReportType('transactions')}
          >
            <FiList className="mr-1" /> Transaksi
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${reportType === 'categories' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setReportType('categories')}
          >
            <FiPieChart className="mr-1" /> Kategori
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${reportType === 'trends' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setReportType('trends')}
          >
            <FiBarChart2 className="mr-1" /> Tren
          </button>
          <button
            className={`p-2 rounded-md col-span-2 flex items-center justify-center text-sm ${reportType === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setReportType('all')}
          >
            <FiFileText className="mr-1" /> Laporan Lengkap
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Periode</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${period === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setPeriod('month')}
          >
            Bulan Ini
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${period === 'quarter' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setPeriod('quarter')}
          >
            Kuartal Ini
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${period === 'year' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setPeriod('year')}
          >
            Tahun Ini
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${period === 'custom' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setPeriod('custom')}
          >
            Kustom
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Rentang Tanggal</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mulai</label>
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="w-full p-2 border rounded-md text-sm"
                disabled={period !== 'custom'}
              />
              <FiCalendar className="absolute right-2 top-2.5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Akhir</label>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="w-full p-2 border rounded-md text-sm"
                disabled={period !== 'custom'}
              />
              <FiCalendar className="absolute right-2 top-2.5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Export Format */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Format Export</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${exportFormat === 'pdf' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setExportFormat('pdf')}
          >
            <FiFileText className="mr-1" /> PDF
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${exportFormat === 'excel' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setExportFormat('excel')}
          >
            <FiFileText className="mr-1" /> Excel
          </button>
          <button
            className={`p-2 rounded-md flex items-center justify-center text-sm ${exportFormat === 'csv' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setExportFormat('csv')}
          >
            <FiFileText className="mr-1" /> CSV
          </button>
        </div>
        
        {exportFormat === 'pdf' && (
          <div className="mt-3 border-t pt-3">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeAnalysis}
                onChange={(e) => setIncludeAnalysis(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Tambahkan Analisis AI</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Analisis AI menggunakan pengaturan AI di halaman Pengaturan
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const renderActions = () => (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <button
        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
        onClick={generateReport}
        disabled={isLoading || !selectedWallet}
      >
        <FiFileText className="mr-2" />
        {isLoading ? 'Generating...' : 'Generate Report'}
      </button>
      
      <button
        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center"
        onClick={() => exportReport(exportFormat)}
        disabled={isLoading || !reportData}
      >
        <FiDownload className="mr-2" />
        Export
      </button>
      
      <button
        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center"
        onClick={() => {
          const email = prompt('Enter email address to share report:')
          if (email) shareReport(email)
        }}
        disabled={isLoading || !reportData}
      >
        <FiMail className="mr-2" />
        Share
      </button>
    </div>
  )

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports & Export</h1>
      </div>

      {renderReportOptions()}
      {renderActions()}

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Generating report...</p>
        </div>
      ) : reportData ? (
        <div className="bg-white rounded-lg shadow">
          {reportType === 'summary' && <SummaryReportView data={reportData} />}
          {reportType === 'transactions' && <TransactionsReportView data={reportData} />}
          {reportType === 'categories' && <CategoriesReportView data={reportData} />}
          {reportType === 'trends' && <TrendsReportView data={reportData} />}
          {reportType === 'all' && <AllReportView data={reportData} />}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiFileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No Report Generated</h3>
          <p className="text-gray-500">Select your report options and click 'Generate Report' to view your data.</p>
        </div>
      )}
    </div>
  )
}

// Report Views Components
const SummaryReportView = ({ data }: { data: any }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">Summary Report</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Income</h3>
        <p className="text-2xl font-bold text-green-600">Rp {data.totalIncome?.toLocaleString() || '0'}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Total Expenses</h3>
        <p className="text-2xl font-bold text-red-600">Rp {data.totalExpenses?.toLocaleString() || '0'}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Net Cash Flow</h3>
        <p className={`text-2xl font-bold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Rp {data.netCashFlow?.toLocaleString() || '0'}
        </p>
      </div>
    </div>
    
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="font-medium">Top Expense Categories</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.topExpenseCategories && data.topExpenseCategories.length > 0 ? (
              data.topExpenseCategories.map((category: any, index: number) => (
                <tr key={index}>
                  <td className="py-2 px-4 whitespace-nowrap">{category.name}</td>
                  <td className="py-2 px-4 whitespace-nowrap">Rp {category.amount.toLocaleString()}</td>
                  <td className="py-2 px-4 whitespace-nowrap">{category.percentage.toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500">No expense categories found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

const TransactionsReportView = ({ data }: { data: any }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">Transactions Report</h2>
    
    <div className="mb-4">
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Total transactions: {data.transactions?.length || 0}</p>
        <div className="flex space-x-2">
          <button className="text-sm text-blue-600 hover:text-blue-800">Filter</button>
          <button className="text-sm text-blue-600 hover:text-blue-800">Sort</button>
        </div>
      </div>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.transactions && data.transactions.length > 0 ? (
            data.transactions.map((transaction: any) => (
              <tr key={transaction.id}>
                <td className="py-2 px-4 whitespace-nowrap">{new Date(transaction.date).toLocaleDateString()}</td>
                <td className="py-2 px-4 whitespace-nowrap">{transaction.description}</td>
                <td className="py-2 px-4 whitespace-nowrap">{transaction.category?.name || 'Uncategorized'}</td>
                <td className="py-2 px-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transaction.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.type === 'INCOME' ? 'Income' : 'Expense'}
                  </span>
                </td>
                <td className={`py-2 px-4 whitespace-nowrap font-medium ${
                  transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'INCOME' ? '+' : '-'} Rp {transaction.amount.toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">No transactions found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

const CategoriesReportView = ({ data }: { data: any }) => (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">Categories Report</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Expense Categories</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.expenseCategories && data.expenseCategories.length > 0 ? (
                data.expenseCategories.map((category: any) => (
                  <tr key={category.id}>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                        {category.name}
                      </div>
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">Rp {category.amount.toLocaleString()}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{category.percentage.toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">No expense categories found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Income Categories</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.incomeCategories && data.incomeCategories.length > 0 ? (
                data.incomeCategories.map((category: any) => (
                  <tr key={category.id}>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                        {category.name}
                      </div>
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">Rp {category.amount.toLocaleString()}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{category.percentage.toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">No income categories found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)

const TrendsReportView = ({ data }: { data: any }) => {
  // Define interface for category and month data
  interface CategoryData {
    name: string;
    amount: number;
    percentage: number;
    color?: string;
    id: string;
  }

  interface MonthData {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }

  interface PieChartData {
    name: string;
    value: number;
    color: string;
  }

  interface BarChartData {
    name: string;
    Income: number;
    Expenses: number;
  }

  // Get expense categories data, ensuring they exist
  const expenseCategories = data.expenseCategories || [];

  // Calculate category data for pie chart - take top 5 categories
  const pieData: PieChartData[] = expenseCategories.length > 0 
    ? expenseCategories
        .sort((a: CategoryData, b: CategoryData) => b.amount - a.amount)
        .slice(0, 5)
        .map((cat: CategoryData) => ({
          name: cat.name,
          value: cat.amount,
          color: cat.color || getRandomColor(cat.name)
        }))
    : [];

  // Format monthly data for bar chart
  const barData: BarChartData[] = data.monthlyData 
    ? data.monthlyData.map((month: MonthData) => ({
        name: month.month.split(' ')[0], // Just take the month name
        Income: month.income,
        Expenses: month.expenses
      }))
    : [];

  // COLORS for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  // Custom tooltip for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };
  
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Trends Report</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Monthly Cash Flow</h3>
        <div className="h-80 bg-gray-50 p-4 rounded-lg">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Income" fill="#4ade80" name="Pendapatan" />
                <Bar dataKey="Expenses" fill="#f87171" name="Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Month-by-Month Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.monthlyData && data.monthlyData.length > 0 ? (
                  data.monthlyData.map((month: MonthData) => (
                    <tr key={month.month}>
                      <td className="py-2 px-4 whitespace-nowrap">{month.month}</td>
                      <td className="py-2 px-4 whitespace-nowrap text-green-600">Rp {month.income.toLocaleString()}</td>
                      <td className="py-2 px-4 whitespace-nowrap text-red-600">Rp {month.expenses.toLocaleString()}</td>
                      <td className={`py-2 px-4 whitespace-nowrap font-medium ${
                        month.net >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Rp {month.net.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">No monthly data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Spending Trends by Category</h3>
          <div className="h-80 bg-gray-50 p-4 rounded-lg">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry: PieChartData, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Tidak ada data kategori untuk ditampilkan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// All Report View Component (Combined)
const AllReportView = ({ data }: { data: any }) => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Laporan Keuangan Lengkap</h2>
      
      {/* Summary Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Ringkasan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Total Pendapatan</h4>
            <p className="text-2xl font-bold text-green-600">Rp {data.totalIncome?.toLocaleString() || '0'}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Total Pengeluaran</h4>
            <p className="text-2xl font-bold text-red-600">Rp {data.totalExpenses?.toLocaleString() || '0'}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Arus Kas Bersih</h4>
            <p className={`text-2xl font-bold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rp {data.netCashFlow?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
        
        {data.topExpenseCategories && data.topExpenseCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h4 className="font-medium">Kategori Pengeluaran Teratas</h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% dari Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.topExpenseCategories.map((category: any, index: number) => (
                    <tr key={index}>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                          {category.name}
                        </div>
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">Rp {category.amount.toLocaleString()}</td>
                      <td className="py-2 px-4 whitespace-nowrap">{category.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Trends Section */}
      {data.monthlyData && data.monthlyData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">Tren</h3>
          <div className="h-80 bg-gray-50 p-4 rounded-lg mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.monthlyData.map((month: any) => ({
                  name: month.month.split(' ')[0],
                  Income: month.income,
                  Expenses: month.expenses
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Income" fill="#4ade80" name="Pendapatan" />
                <Bar dataKey="Expenses" fill="#f87171" name="Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-2">Perbandingan Bulanan</h4>
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bulan</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendapatan</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pengeluaran</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.monthlyData.map((month: any) => (
                      <tr key={month.month}>
                        <td className="py-2 px-4 whitespace-nowrap">{month.month}</td>
                        <td className="py-2 px-4 whitespace-nowrap text-green-600">Rp {month.income.toLocaleString()}</td>
                        <td className="py-2 px-4 whitespace-nowrap text-red-600">Rp {month.expenses.toLocaleString()}</td>
                        <td className={`py-2 px-4 whitespace-nowrap font-medium ${
                          month.net >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Rp {month.net.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {data.expenseCategories && data.expenseCategories.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-2">Kategori Pengeluaran</h4>
                <div className="h-60 bg-gray-50 p-4 rounded-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expenseCategories.slice(0, 5).map((cat: any) => ({
                          name: cat.name,
                          value: cat.amount,
                          color: cat.color || getRandomColor(cat.name)
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.expenseCategories.slice(0, 5).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || getRandomColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Transactions Section */}
      {data.transactions && data.transactions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">Transaksi Terbaru</h3>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.transactions.slice(0, 10).map((transaction: any) => (
                  <tr key={transaction.id}>
                    <td className="py-2 px-4 whitespace-nowrap">{new Date(transaction.date).toLocaleDateString()}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{transaction.description}</td>
                    <td className="py-2 px-4 whitespace-nowrap">{transaction.category?.name || 'Uncategorized'}</td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'INCOME' ? 'Pendapatan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className={`py-2 px-4 whitespace-nowrap font-medium ${
                      transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'INCOME' ? '+' : '-'} Rp {transaction.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.transactions.length > 10 && (
              <div className="px-4 py-2 text-sm text-gray-500 text-right">
                Menampilkan 10 dari {data.transactions.length} transaksi
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Categories Section */}
      {(data.expenseCategories || data.incomeCategories) && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold border-b pb-2 mb-4">Detail Kategori</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.expenseCategories && data.expenseCategories.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-2">Kategori Pengeluaran</h4>
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% dari Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.expenseCategories.map((category: any) => (
                        <tr key={category.id}>
                          <td className="py-2 px-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                              {category.name}
                            </div>
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap">Rp {category.amount.toLocaleString()}</td>
                          <td className="py-2 px-4 whitespace-nowrap">{category.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {data.incomeCategories && data.incomeCategories.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-2">Kategori Pendapatan</h4>
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% dari Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.incomeCategories.map((category: any) => (
                        <tr key={category.id}>
                          <td className="py-2 px-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                              {category.name}
                            </div>
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap">Rp {category.amount.toLocaleString()}</td>
                          <td className="py-2 px-4 whitespace-nowrap">{category.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to generate consistent colors based on name
function getRandomColor(name: string): string {
  // Generate a color based on the string hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}

export default ReportsPage 