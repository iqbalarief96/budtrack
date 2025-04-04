import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateAIResponse } from '@/lib/ai'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const reportType = searchParams.get('type')
    
    if (!walletId || !startDate || !endDate || !reportType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Check if user has access to this wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: session.user.id
      }
    })
    
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    
    // Parse dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Get all transactions in date range
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId: walletId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        category: true
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    // Calculate basic stats
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const netCashFlow = totalIncome - totalExpenses
    
    // Get data specific to the report type
    let reportData: any = {}
    
    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(transactions)
        break
      case 'transactions':
        reportData = { transactions }
        break
      case 'categories':
        reportData = await generateCategoriesReport(transactions)
        break
      case 'trends':
        reportData = await generateTrendsReport(transactions, start, end)
        break
      case 'all':
        // Generate a combined report with data from all report types
        const summaryData = await generateSummaryReport(transactions)
        const categoriesData = await generateCategoriesReport(transactions)
        const trendsData = await generateTrendsReport(transactions, start, end)
        
        reportData = {
          transactions,
          ...summaryData,
          ...categoriesData,
          ...trendsData
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netCashFlow,
      ...reportData
    })
    
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// Helper functions for report generation
async function generateSummaryReport(transactions: any[]) {
  // Top expense categories
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE')
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  
  const categorySpending = expenseTransactions.reduce((acc: any, t) => {
    const categoryId = t.categoryId || 'uncategorized'
    const categoryName = t.category?.name || 'Uncategorized'
    const categoryColor = t.category?.color || '#cccccc'
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        name: categoryName,
        color: categoryColor,
        amount: 0
      }
    }
    
    acc[categoryId].amount += t.amount
    return acc
  }, {})
  
  const topExpenseCategories = Object.values(categorySpending)
    .map((cat: any) => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
    }))
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 5)
  
  return {
    topExpenseCategories
  }
}

async function generateCategoriesReport(transactions: any[]) {
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE')
  const incomeTransactions = transactions.filter(t => t.type === 'INCOME')
  
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
  
  // Group expenses by category
  const expenseCategorySpending = expenseTransactions.reduce((acc: any, t) => {
    const categoryId = t.categoryId || 'uncategorized'
    const categoryName = t.category?.name || 'Uncategorized'
    const categoryColor = t.category?.color || '#cccccc'
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        name: categoryName,
        color: categoryColor,
        amount: 0
      }
    }
    
    acc[categoryId].amount += t.amount
    return acc
  }, {})
  
  // Group income by category
  const incomeCategoryEarnings = incomeTransactions.reduce((acc: any, t) => {
    const categoryId = t.categoryId || 'uncategorized'
    const categoryName = t.category?.name || 'Uncategorized'
    const categoryColor = t.category?.color || '#cccccc'
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        name: categoryName,
        color: categoryColor,
        amount: 0
      }
    }
    
    acc[categoryId].amount += t.amount
    return acc
  }, {})
  
  const expenseCategories = Object.values(expenseCategorySpending)
    .map((cat: any) => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
    }))
    .sort((a: any, b: any) => b.amount - a.amount)
  
  const incomeCategories = Object.values(incomeCategoryEarnings)
    .map((cat: any) => ({
      ...cat,
      percentage: totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0
    }))
    .sort((a: any, b: any) => b.amount - a.amount)
  
  return {
    expenseCategories,
    incomeCategories
  }
}

async function generateTrendsReport(transactions: any[], startDate: Date, endDate: Date) {
  // Group transactions by month
  const months: any = {}
  
  // Initialize months array with all months in range
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    
    months[monthKey] = {
      month: monthName,
      income: 0,
      expenses: 0,
      net: 0
    }
    
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  // Fill with actual data
  transactions.forEach(t => {
    const transactionDate = new Date(t.date)
    const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`
    
    if (months[monthKey]) {
      if (t.type === 'INCOME') {
        months[monthKey].income += t.amount
      } else {
        months[monthKey].expenses += t.amount
      }
      
      months[monthKey].net = months[monthKey].income - months[monthKey].expenses
    }
  })
  
  const monthlyData = Object.values(months)
  
  // Calculate expense categories data for pie chart
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE')
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  
  // Group expenses by category
  const expenseCategorySpending = expenseTransactions.reduce((acc: any, t) => {
    const categoryId = t.categoryId || 'uncategorized'
    const categoryName = t.category?.name || 'Uncategorized'
    const categoryColor = t.category?.color || '#cccccc'
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        name: categoryName,
        color: categoryColor,
        amount: 0
      }
    }
    
    acc[categoryId].amount += t.amount
    return acc
  }, {})
  
  const expenseCategories = Object.values(expenseCategorySpending)
    .map((cat: any) => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0
    }))
    .sort((a: any, b: any) => b.amount - a.amount)
  
  return {
    monthlyData,
    expenseCategories
  }
}

async function generateReportAnalysis(userId: string, data: any, startDate: string, endDate: string, wallet: any): Promise<string | null> {
  try {
    // Get user's AI settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    if (!settings?.provider || !settings?.apiKey || !settings?.selectedModel) {
      console.warn('AI settings not configured for user');
      return null;
    }
    
    // Format dates for the prompt
    const formattedStartDate = new Date(startDate).toLocaleDateString();
    const formattedEndDate = new Date(endDate).toLocaleDateString();
    
    // Create a comprehensive prompt for the AI
    const prompt = `
    Berikan analisis keuangan untuk dompet "${wallet.name}" dari periode ${formattedStartDate} sampai ${formattedEndDate}.
    
    Data Keuangan:
    - Total Pendapatan: Rp ${data.totalIncome?.toLocaleString() || '0'}
    - Total Pengeluaran: Rp ${data.totalExpenses?.toLocaleString() || '0'}
    - Arus Kas Bersih: Rp ${data.netCashFlow?.toLocaleString() || '0'}
    
    ${data.topExpenseCategories ? `
    Kategori Pengeluaran Teratas:
    ${data.topExpenseCategories.map((cat: any) => 
      `- ${cat.name}: Rp ${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%)`
    ).join('\n')}
    ` : ''}
    
    ${data.monthlyData ? `
    Data Bulanan:
    ${data.monthlyData.map((month: any) => 
      `- ${month.month}: Pendapatan Rp ${month.income.toLocaleString()}, Pengeluaran Rp ${month.expenses.toLocaleString()}, Net Rp ${month.net.toLocaleString()}`
    ).join('\n')}
    ` : ''}
    
    Berdasarkan data di atas, berikan analisis keuangan yang komprehensif dalam bahasa Jaksel Gaul, jangan ada kata kata "Jaksel"/kata kata norak yg diselipkan di kalimat. Analisis harus mencakup:
    1. Rangkuman keseluruhan situasi keuangan
    2. Identifikasi pola pengeluaran utama dan rekomendasi penghematan
    3. Tren pendapatan dan pengeluaran dari waktu ke waktu
    4. Rekomendasi perbaikan untuk meningkatkan kesehatan keuangan
    5. Prediksi untuk periode berikutnya jika pola saat ini berlanjut
    
    SANGAT PENTING: Format respons Anda dengan pedoman ini untuk memastikan tampilan PDF yang baik:
    1. Gunakan judul utama yang SINGKAT dengan format "# Judul" (satu tanda pagar)
    2. Untuk setiap bagian, gunakan format "### 1. Judul Bagian" dengan judul SINGKAT (tiga tanda pagar)
    3. Untuk penomoran WAJIB menggunakan angka diikuti titik (1., 2., dst) dan BUKAN bullet point atau bintang (*)
    4. Teks penting dan angka kunci gunakan format bold dengan "**teks tebal**" secara SELEKTIF dan SINGKAT
    5. WAJIB membuat teks RINGKAS dan PENDEK, maksimal 60 karakter per baris
    6. Hindari penggunaan simbol bintang (*), gunakan tanda strip (-) untuk membuat daftar
    7. Saat membuat bullet point, buat kalimat SANGAT SINGKAT dan PADAT, maksimal 1 kalimat pendek
    8. Hindari penggunaan kata "Rekomendasi:" berulang kali dalam satu poin
    9. Buat paragraf SANGAT PENDEK, maksimal 2-3 kalimat pendek
    10. Hindari judul bagian yang terlalu panjang, maksimal 30 karakter
    
    Buatlah analisis yang SANGAT RINGKAS namun mendalam, dengan fokus pada angka-angka kunci dan rekomendasi praktis. Jangan terlalu bertele-tele, langsung pada intinya dengan kalimat pendek dan jelas dan ingat pakai bahasa jaksel gaul.
    `;
    
    // Call the AI service to generate analysis
    const analysis = await generateAIResponse({
      prompt,
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.selectedModel
    });
    
    return analysis;
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return null;
  }
} 