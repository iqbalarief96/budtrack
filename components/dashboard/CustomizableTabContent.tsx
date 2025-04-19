// Available widgets that can be added to the dashboard
const availableWidgets: DashboardWidget[] = [
  { id: 'balance-widget', type: 'balance', size: 'small', title: 'Total Saldo', position: 0 },
  { id: 'income-widget', type: 'income', size: 'small', title: 'Pemasukan', position: 1 },
  { id: 'expense-widget', type: 'expense', size: 'small', title: 'Pengeluaran', position: 2 },
  { id: 'expense-chart-widget', type: 'expense-chart', size: 'medium', title: 'Distribusi Pengeluaran', position: 3 },
  { id: 'income-expense-chart-widget', type: 'income-expense-chart', size: 'medium', title: 'Tren Keuangan', position: 4 },
  { id: 'transaction-list-widget', type: 'transaction-list', size: 'medium', title: 'Transaksi Terbaru', position: 5 },
  { id: 'emergency-fund-widget', type: 'emergency-fund', size: 'medium', title: 'Dana Darurat', position: 6 },
  { id: 'budget-overview-widget', type: 'budget-overview', size: 'large', title: 'Ringkasan Budget', position: 7 },
  { id: 'top-spending-widget', type: 'top-spending', size: 'medium', title: 'Top Spending', position: 8 },
  { id: 'financial-tips-widget', type: 'financial-tips', size: 'small', title: 'Tips Keuangan', position: 9 },
  { id: 'savings-goals-widget', type: 'savings-goals', size: 'medium', title: 'Target Tabungan', position: 10 },
  { id: 'investment-performance-widget', type: 'investment-performance', size: 'medium', title: 'Performa Investasi', position: 11 },
  { id: 'summary-stats-widget', type: 'summary-stats', size: 'full', title: 'Ringkasan Keuangan', position: 12 },
  { id: 'quick-actions-widget', type: 'quick-actions', size: 'large', title: 'Aksi Cepat', position: 13 },
]; 