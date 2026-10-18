'use client';

import { Bot, RefreshCw, ShieldAlert, Target, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatInsight, ChatbotSummaryResponse } from './types';
import { formatCurrency, formatPercent } from './format';
import { severityClasses, severityDotClasses } from './severity';

interface InsightRailProps {
  summary?: ChatbotSummaryResponse | null;
  isLoading?: boolean;
  onAsk: (prompt: string) => void;
  onRefresh: () => void;
}

export function InsightRail({ summary, isLoading, onAsk, onRefresh }: InsightRailProps) {
  const insights = buildInsights(summary);

  return (
    <aside className="hidden border-l border-slate-200 bg-slate-50/80 xl:block xl:p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Pinned insights</h3>
          <p className="text-xs text-slate-500">Snapshot bulan ini</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {isLoading && !summary ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white dark:bg-slate-800" />)
        ) : insights.length > 0 ? (
          insights.map((insight) => (
            <button
              key={insight.id}
              type="button"
              onClick={() => onAsk(insight.prompt)}
              className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${severityClasses(insight.severity)}`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
                <span className={`h-2 w-2 rounded-full ${severityDotClasses(insight.severity)}`} />
                {insight.label}
              </div>
              <div className="text-xl font-bold">{insight.value}</div>
              {insight.detail && <div className="mt-1 text-xs opacity-80">{insight.detail}</div>}
              <div className="mt-2 text-[10px] font-medium text-blue-400 opacity-0 transition group-hover:opacity-100">
                Klik buat tanya detail ↗
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Bot className="mb-2 h-5 w-5" />
            Pilih wallet buat munculin insight.
          </div>
        )}
      </div>
    </aside>
  );
}

function formatBudgetStatus(status: ChatbotSummaryResponse['budgetStatus']) {
  if (status === 'unknown') return 'Belum ada budget';
  if (status === 'under') return 'Aman';
  if (status === 'near') return 'Hampir jebol';
  return 'Jebol';
}

function budgetStatusDetail(summary: ChatbotSummaryResponse) {
  if (summary.budgetStatus === 'unknown') return `${summary.transactionCount} transaksi, budget belum diset`;
  return `${summary.transactionCount} transaksi bulan ini`;
}

function buildInsights(summary?: ChatbotSummaryResponse | null): ChatInsight[] {
  if (!summary) return [];

  const safeSeverity = typeof summary.safeToSpend === 'number'
    ? summary.safeToSpend < 0 ? 'critical' : summary.safeToSpend < summary.totalExpense * 0.15 ? 'warning' : 'success'
    : 'info';

  return [
    {
      id: 'safe-to-spend',
      label: 'Safe to spend',
      value: formatCurrency(summary.safeToSpend),
      detail: 'Sisa aman estimasi bulan ini',
      severity: safeSeverity,
      prompt: 'Jelaskan safe-to-spend saya dan batas spending harian sampai akhir bulan.',
    },
    {
      id: 'top-category',
      label: 'Top spend',
      value: summary.topCategory?.name ?? '—',
      detail: summary.topCategory ? `${formatCurrency(summary.topCategory.amount)} • ${formatPercent(summary.topCategory.percent)}` : 'Belum ada kategori dominan',
      severity: summary.topCategory && (summary.topCategory.percent ?? 0) > 50 ? 'warning' : 'info',
      prompt: summary.topCategory ? `Audit kategori ${summary.topCategory.name} dan cari cara tekan spending.` : 'Cari kategori spending terbesar saya bulan ini.',
    },
    {
      id: 'debt-risk',
      label: 'Debt risk',
      value: summary.debtRisk === 'none' ? 'Clear' : summary.debtRisk,
      detail: summary.debtRisk === 'none' ? 'Tidak ada sinyal debt dominan' : 'Debt/category utang dominan di spending',
      severity: summary.debtRisk === 'critical' ? 'critical' : summary.debtRisk === 'warning' ? 'warning' : 'success',
      prompt: 'Bikin debt risk plan berdasarkan transaksi bulan ini.',
    },
    {
      id: 'budget-status',
      label: 'Budget status',
      value: formatBudgetStatus(summary.budgetStatus),
      detail: budgetStatusDetail(summary),
      severity: summary.budgetStatus === 'over' ? 'critical' : summary.budgetStatus === 'near' ? 'warning' : summary.budgetStatus === 'under' ? 'success' : 'info',
      prompt: summary.budgetStatus === 'unknown'
        ? 'Bantu saya bikin budget bulan ini berdasarkan pola transaksi.'
        : 'Cek status budget saya dan rekomendasikan adjustment bulan ini.',
    },
  ];
}
