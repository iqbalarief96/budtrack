// Widget types for dashboard customization

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';
export type WidgetType =
  | 'balance'
  | 'income'
  | 'expense'
  | 'budget-progress'
  | 'expense-chart'
  | 'income-expense-chart'
  | 'transaction-list'
  | 'savings-goal'
  | 'emergency-fund'
  | 'financial-tips'
  | 'financial-health'
  | 'budget-overview'
  | 'savings-goals'
  | 'investment-performance'
  | 'summary-stats'
  | 'quick-actions'
  | 'top-spending'
  | 'summary'
  | 'safe-to-spend';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  title: string;
  position: number;
  config?: Record<string, any>;
}

export interface DashboardView {
  id: string;
  name: string;
  isDefault: boolean;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
  widgets: DashboardWidget[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Predefined widget configurations
export const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'summary-widget',
    type: 'summary',
    size: 'medium',
    title: 'Ringkasan',
    position: 0
  },
  {
    id: 'balance-widget',
    type: 'balance',
    size: 'small',
    title: 'Total Saldo',
    position: 1
  },
  {
    id: 'income-widget',
    type: 'income',
    size: 'small',
    title: 'Pemasukan',
    position: 2
  },
  {
    id: 'expense-widget',
    type: 'expense',
    size: 'small',
    title: 'Pengeluaran',
    position: 3
  },
  {
    id: 'expense-chart-widget',
    type: 'expense-chart',
    size: 'medium',
    title: 'Distribusi Pengeluaran',
    position: 4
  },
  {
    id: 'income-expense-chart-widget',
    type: 'income-expense-chart',
    size: 'medium',
    title: 'Tren Keuangan',
    position: 5
  },
  {
    id: 'transaction-list-widget',
    type: 'transaction-list',
    size: 'medium',
    title: 'Transaksi Terbaru',
    position: 6,
    config: {
      limit: 5
    }
  },
  {
    id: 'emergency-fund-widget',
    type: 'emergency-fund',
    size: 'medium',
    title: 'Dana Darurat',
    position: 7
  },
  {
    id: 'budget-overview-widget',
    type: 'budget-overview',
    size: 'large',
    title: 'Ringkasan Budget',
    position: 8
  },
  {
    id: 'top-spending-widget',
    type: 'top-spending',
    size: 'medium',
    title: 'Top Spending',
    position: 9
  },
  {
    id: 'safe-to-spend-widget',
    type: 'safe-to-spend',
    size: 'medium',
    title: 'Safe to Spend',
    position: 10
  }
];

export const DEFAULT_DASHBOARD_VIEW: DashboardView = {
  id: 'default-view',
  name: 'Default View',
  isDefault: true,
  timeframe: 'monthly',
  widgets: DEFAULT_WIDGETS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}; 