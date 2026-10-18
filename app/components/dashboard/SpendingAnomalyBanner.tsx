'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'

interface Anomaly {
  id?: string
  categoryId?: string
  categoryName?: string
  currentAmount?: number
  expectedAmount?: number
  deviationPercentage?: number
  description?: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export default function SpendingAnomalyBanner() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/alerts/anomalies')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.anomalies) && data.anomalies.length > 0) {
          setAnomalies(data.anomalies)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || dismissed || anomalies.length === 0) return null

  const topAnomaly = anomalies[0]
  const isHigh = topAnomaly.severity === 'HIGH' || (topAnomaly.deviationPercentage || 0) > 50

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isHigh
          ? 'border-amber-300 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
          : 'border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2 ${
              isHigh ? 'bg-amber-200/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-blue-200/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight">
              {isHigh ? '⚠️ Anomali Pengeluaran Terdeteksi' : '💡 Pola Pengeluaran Tidak Biasa'}
            </h4>
            <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              {topAnomaly.description ||
                `Pengeluaran di kategori ${topAnomaly.categoryName || 'ini'} melonjak ${Math.round(
                  topAnomaly.deviationPercentage || 0
                )}% lebih tinggi dari rata-rata biasanya.`}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-xs font-semibold underline hover:no-underline"
              >
                Lihat transaksi terkait <ArrowRight className="h-3 w-3" />
              </Link>
              {anomalies.length > 1 && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  +{anomalies.length - 1} anomali lainnya
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          title="Tutup banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
