'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi'

export type AttentionSeverity = 'high' | 'medium' | 'info' | 'positive'

export type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  detail?: string
  href?: string
  actionLabel?: string
  /** Can be hidden by the user (remembered). */
  dismissible?: boolean
}

const ORDER: Record<AttentionSeverity, number> = { high: 0, medium: 1, info: 2, positive: 3 }
const STYLE: Record<AttentionSeverity, { dot: string; ring: string }> = {
  high: { dot: 'bg-red-500', ring: 'border-l-red-500' },
  medium: { dot: 'bg-amber-500', ring: 'border-l-amber-500' },
  info: { dot: 'bg-blue-400', ring: 'border-l-blue-300' },
  positive: { dot: 'bg-emerald-500', ring: 'border-l-emerald-500' },
}
const DISMISS_KEY = 'dashboardDismissedAttention'
const VISIBLE = 4

type Anomaly = { id?: string; category?: { name?: string }; percentAboveAverage?: number; amount?: number; description?: string | null }

/** Spending anomalies for the scope, as one grouped item (was a banner that came back on every reload). */
function useAnomalyItem(walletId?: string): AttentionItem | null {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  useEffect(() => {
    let cancelled = false
    const qs = walletId ? `?walletId=${encodeURIComponent(walletId)}` : ''
    fetch(`/api/alerts/anomalies${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setAnomalies(Array.isArray(d?.anomalies) ? d.anomalies : []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [walletId])
  if (!anomalies.length) return null
  const top = anomalies[0]
  const name = top.category?.name || top.description || 'satu transaksi'
  const pct = Math.round(top.percentAboveAverage || 0)
  return {
    id: `anomaly-${top.id ?? name}-${anomalies.length}`,
    severity: 'medium',
    title: `Pengeluaran gak biasa: ${name}${pct > 0 ? ` (+${pct}% dari rata-rata)` : ''}`,
    detail: anomalies.length > 1 ? `Ada ${anomalies.length - 1} anomali lain dalam 90 hari terakhir.` : undefined,
    href: '/alerts',
    actionLabel: 'Lihat',
    dismissible: true,
  }
}

type Props = {
  items: AttentionItem[]
  health: { score: number | null; label: string | null; reasons: string[] }
  anomalyWalletId?: string
}

export default function AttentionPanel({ items, health, anomalyWalletId }: Props) {
  const anomaly = useAnomalyItem(anomalyWalletId)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try { setDismissed(new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'))) } catch { /* ignore */ }
  }, [])
  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id)
    setDismissed(next)
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next).slice(-50))) } catch { /* ignore */ }
  }

  const all = useMemo(
    () => [...items, ...(anomaly ? [anomaly] : [])]
      .filter((i) => !dismissed.has(i.id))
      .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
    [items, anomaly, dismissed]
  )
  const shown = expanded ? all : all.slice(0, VISIBLE)
  const scoreTone = health.score === null ? 'bg-gray-100 text-gray-600' : health.score >= 70 ? 'bg-emerald-100 text-emerald-800' : health.score >= 45 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Perlu perhatian</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreTone}`} title={health.reasons.join(' • ')}>
          Skor kesehatan {health.score ?? '—'}{health.label ? ` · ${health.label}` : ''}
        </span>
      </div>
      {health.reasons.length > 0 && <p className="mt-0.5 text-xs text-gray-500">{health.reasons.join(' • ')}</p>}

      {all.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Aman, gak ada yang perlu dicek sekarang. 👌</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((it) => (
            <li key={it.id} className={`flex items-start gap-3 rounded-lg border border-gray-100 border-l-4 ${STYLE[it.severity].ring} bg-gray-50/60 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STYLE[it.severity].dot}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{it.title}</p>
                {it.detail && <p className="text-xs text-gray-600 dark:text-gray-400">{it.detail}</p>}
              </div>
              {it.href && (
                <Link href={it.href} className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100">
                  {it.actionLabel || 'Buka'}
                </Link>
              )}
              {it.dismissible && (
                <button type="button" aria-label="Sembunyikan" onClick={() => dismiss(it.id)} className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700">
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {all.length > VISIBLE && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          {expanded ? <>Sembunyikan <FiChevronUp /></> : <>Lihat {all.length - VISIBLE} lainnya <FiChevronDown /></>}
        </button>
      )}
    </section>
  )
}
