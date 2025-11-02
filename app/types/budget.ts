export interface Budget {
  id: string;
  amount: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  periodType: string;
  isRecurring: boolean;
  lastResetDate?: Date | null;
  notificationThresholds?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  walletId: string;
  categoryId: string;
}

export interface BudgetHistory {
  id: string;
  budgetId: string;
  amount: number;
  spent: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  userId: string;
  alertType: string;
  threshold: number;
  currentSpent: number;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface NotificationThresholds {
  warning: number;
  critical: number;
} 