'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { FiChevronDown, FiChevronUp, FiArrowRight } from 'react-icons/fi'
import type { SmartAnalysis, SmartAnalysisFacts, SmartAnalysisHighlight } from '@/lib/smart-analysis'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const STATUS_STYLE = {
  sehat: { label: 'Sehat', dot: '🟢', box: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  waspada: { label: 'Waspada', dot: '🟡', box: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  bahaya: { label: 'Bahaya', dot: '🔴', box: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800' },
} as const

const SEVERITY_STYLE = {
  high: { icon: '🔴', border: 'border-l-red-500', bg: 'bg-red-50/60' },
  medium: { icon: '🟡', border: 'border-l-amber-500', bg: 'bg-amber-50/60' },
  positive: { icon: '🟢', border: 'border-l-emerald-500', bg: 'bg-emerald-50/60' },
} as const

// Action → in-app link. Only routes that exist; no deep-link params invented.
function actionHref(type: string): string | null {
  switch (type) {
    case 'budget': return '/budgets'
    case 'transactions': return '/transactions'
    case 'categories': return '/categories/smart'
    case 'goals': return '/goals'
    default: return null
  }
}

function defaultActionLabel(type: string): string {
  switch (type) {
    case 'budget': return 'Buat budget'
    case 'transactions': return 'Cek transaksi'
    case 'categories': return 'Rapihin kategori'
    case 'goals': return 'Atur goal'
    default: return ''
  }
}

function KpiChip({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-800'
  return (
    <div className="rounded-lg bg-white/80 border border-gray-200 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function HighlightCard({ h, facts }: { h: SmartAnalysisHighlight; facts: SmartAnalysisFacts | null }) {
  const s = SEVERITY_STYLE[h.severity]
  // Amount/share come from server facts, never from the AI text.
  const cat = h.category && facts ? facts.categories.find((c) => c.name === h.category) : undefined
  const href = h.action ? actionHref(h.action.type) : null
  const label = h.action
    ? (h.action.label || defaultActionLabel(h.action.type)) +
      (h.action.type === 'budget' && h.action.amount ? ` ${rupiah(h.action.amount)}` : '')
    : ''
  return (
    <div className={`rounded-lg border border-gray-200 border-l-4 ${s.border} ${s.bg} p-3`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-gray-900 text-sm">
          <span className="mr-1.5">{s.icon}</span>
          {h.title}
        </p>
        {cat && (
          <span className="shrink-0 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
            {rupiah(cat.amount)} · {cat.percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-gray-700">{h.insight}</p>
      {href && label && (
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-white border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
        >
          {label}
          <FiArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

const DEEP_MD_COMPONENTS = {
  p: ({ node, ...props }: any) => <p className="my-1.5 leading-relaxed" {...props} />,
  h1: ({ node, ...props }: any) => <h3 className="text-sm font-semibold text-blue-800 mt-4 mb-1" {...props} />,
  h2: ({ node, ...props }: any) => <h3 className="text-sm font-semibold text-blue-800 mt-4 mb-1" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-sm font-semibold text-blue-800 mt-4 mb-1" {...props} />,
  h4: ({ node, ...props }: any) => <h4 className="text-sm font-medium text-blue-700 mt-3 mb-1" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 my-1.5 space-y-1" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 my-1.5 space-y-1" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
}

/** Collapsible long-form analysis (markdown), closed by default. */
export function DeepAnalysis({ markdown, defaultOpen = false }: { markdown: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-800"
      >
        {open ? 'Sembunyikan analisis lengkap' : 'Lihat analisis lengkap'}
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-700">
          <ReactMarkdown components={DEEP_MD_COMPONENTS}>{markdown}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

/** Verdict + KPI chips (server numbers) + highlight cards + data issues. */
export function SmartAnalysisCards({ analysis, facts }: { analysis: SmartAnalysis; facts: SmartAnalysisFacts | null }) {
  const status = STATUS_STYLE[analysis.verdict.status]
  const top = facts?.categories.find((c) => !c.isSavings)
  const rate = facts?.savingsRate ?? null
  const exp = facts?.expenseChange ?? null

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${status.box}`}>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.badge}`}>
          {status.dot} Kondisi: {status.label}
        </span>
        <p className="mt-2 text-base font-medium text-gray-900 leading-snug">{analysis.verdict.headline}</p>
        {facts && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiChip label="Saving rate" value={rate === null ? '—' : `${rate.toFixed(1)}%`} tone={rate === null ? 'neutral' : rate >= 10 ? 'good' : 'bad'} />
            <KpiChip label="Net cashflow" value={rupiah(facts.netSavings)} tone={facts.netSavings >= 0 ? 'good' : 'bad'} />
            <KpiChip label="Terbesar" value={top ? `${top.name} ${top.percentage.toFixed(0)}%` : '—'} />
            <KpiChip label={`Pengeluaran vs ${facts.previousLabel.toLowerCase()}`} value={exp === null ? '—' : `${exp > 0 ? '+' : ''}${exp.toFixed(0)}%`} tone={exp === null ? 'neutral' : exp <= 0 ? 'good' : 'bad'} />
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Yang paling penting</h4>
        <div className="space-y-2">
          {analysis.highlights.map((h, i) => (
            <HighlightCard key={i} h={h} facts={facts} />
          ))}
        </div>
      </div>

      {analysis.dataIssues.length > 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
          <p className="text-sm font-semibold text-gray-800">🧹 Data perlu dirapihin</p>
          <ul className="mt-1 space-y-1.5">
            {analysis.dataIssues.map((d, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium">{d.title}</span> — {d.detail}
                {d.categories.length > 0 && (
                  <span className="ml-1 text-xs text-gray-500">({d.categories.join(', ')})</span>
                )}
              </li>
            ))}
          </ul>
          <Link
            href="/categories/smart"
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-white border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100"
          >
            Rapihin kategori
            <FiArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
