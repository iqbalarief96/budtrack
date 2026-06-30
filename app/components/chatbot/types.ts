import type { AiValidatedAction } from '@/lib/ai/actions/types';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date | string;
  status?: 'sending' | 'streaming' | 'done' | 'error';
  actions?: AiValidatedAction[];
}

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AnswerMetric {
  label: string;
  value: string;
  detail?: string;
  severity?: InsightSeverity;
}

export interface AnswerAction {
  id: string;
  label: string;
  prompt?: string;
  href?: string;
  kind: 'prompt' | 'navigate' | 'copy' | 'disabled' | 'execute_tool';
  severity?: InsightSeverity;
}

export interface ParsedAnswer {
  summary?: string;
  metrics: AnswerMetric[];
  warnings: AnswerMetric[];
  actions: AnswerAction[];
  markdown: string;
}

export interface ChatbotSummaryResponse {
  walletId: string;
  walletName: string;
  monthLabel: string;
  dataFreshness: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  topCategory?: { name: string; amount: number; percent?: number };
  safeToSpend?: number;
  debtRisk: 'none' | 'warning' | 'critical';
  budgetStatus: 'under' | 'near' | 'over' | 'unknown';
}

export interface ChatInsight {
  id: string;
  label: string;
  value: string;
  detail?: string;
  severity: InsightSeverity;
  prompt: string;
}
