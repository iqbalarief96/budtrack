'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FiChevronLeft, FiChevronRight, FiAlertTriangle, FiCalendar, FiRepeat, FiTarget, FiUsers, FiFileText } from 'react-icons/fi'
import { useWallet } from '@/app/providers/WalletProvider'
import WalletSelector from '@/app/components/WalletSelector'
import { formatCurrency } from '@/lib/utils'

type CalendarItem = {
  kind: 'bill' | 'recurring' | 'goal' | 'shared_bill'
  id: string
  title: string
  amount: number
  date: string
  type: 'expense' | 'income' | 'goal'
  walletId?: string
  walletName?: string
  isOverdue?: boolean
}

type CalendarDay = {
  date: string
  income: number
  expense: number
  items: CalendarItem[]
  transactions: {
    id: string
    description: string | null
    amount: number
    type: string
    categoryId: string | null
  }[]
}

type CalendarData = {
  month: string
  days: CalendarDay[]
  overdue: CalendarItem[]
  summary: { income: number; expense: number; net: number }
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const KIND_META: Record<CalendarItem['kind'], { label: string; icon: React.ReactNode; className: string }> = {
  bill: { label: 'Tagihan', icon: <FiAlertTriangle size={14} />, className: 'bg-red-50 text-red-700 border-red-200' },
  recurring: { label: 'Berulang', icon: <FiRepeat size={14} />, className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  goal: { label: 'Goal', icon: <FiTarget size={14} />, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  shared_bill: { label: 'Shared Bill', icon: <FiUsers size={14} />, className: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`
}

function formatDayShort(dateStr: string): { day: string; weekday: string } {
  const [, , d] = dateStr.split('-')
  const date = new Date(`${dateStr}T00:00:00Z`)
  const weekday = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][date.getUTCDay()]
  return { day: String(Number(d)), weekday }
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { selectedWallet } = useWallet()

  const now = new Date()
  const [month, setMonth] = useState(() => {
    const m = now.getUTCMonth() + 1
    return `${now.getUTCFullYear()}-${String(m).padStart(2, '0')}`
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.replace('/auth/signin')
      return
    }
  }, [status, session, router])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ month })
    if (selectedWallet?.id) params.set('walletId', selectedWallet.id)

    fetch(`/api/calendar?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: CalendarData) => {
        if (cancelled) return
        setData(json)
        // Default selected date: today when it's inside the loaded month
        const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
        setSelectedDate((prev) => (prev && json.days.some((d) => d.date === prev) ? prev : todayKey))
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('[CALENDAR] load failed', e)
          setError('Gagal memuat data kalender.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [month, selectedWallet?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1 + delta, 1))
    const mm = next.getUTCMonth() + 1
    setMonth(`${next.getUTCFullYear()}-${String(mm).padStart(2, '0')}`)
  }

  const selectedDay = useMemo(
    () => (selectedDate ? data?.days.find((d) => d.date === selectedDate) : undefined),
    [data, selectedDate]
  )

  const daysWithItems = useMemo(
    () => (data?.days || []).filter((d) => d.items.length > 0 || d.transactions.length > 0),
    [data]
  )

  if (status === 'loading') return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiCalendar className="text-blue-600" /> Kalender Keuangan
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tagihan, transaksi berulang, goal, dan transaksi harian dalam satu timeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
              aria-label="Bulan sebelumnya"
            >
              <FiChevronLeft size={16} />
            </button>
            <span className="px-3 font-medium text-gray-800 min-w-[130px] text-center">
              {(() => {
                const [y, m] = month.split('-').map(Number)
                return `${MONTH_NAMES[m - 1]} ${y}`
              })()}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
              aria-label="Bulan berikutnya"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
          <WalletSelector displayBalance={data?.summary?.net} />
        </div>
      </div>

      {/* Summary + Overdue banner */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
            <p className="text-xs text-gray-500">Pemasukan</p>
            <p className="text-lg font-semibold text-emerald-600">{formatCurrency(data.summary.income)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
            <p className="text-xs text-gray-500">Pengeluaran</p>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(data.summary.expense)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
            <p className="text-xs text-gray-500">Net</p>
            <p className={`text-lg font-semibold ${data.summary.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(data.summary.net)}
            </p>
          </div>
        </div>
      )}

      {data && data.overdue.length > 0 && (
        <button
          onClick={() => setSelectedDate(null)}
          className="w-full flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm hover:bg-red-100 transition-colors"
        >
          <FiAlertTriangle className="shrink-0" />
          <span className="font-medium">{data.overdue.length} item overdue</span>
          <span className="text-red-500 ml-auto">Klik untuk lihat</span>
        </button>
      )}

      {/* Date strip */}
      {data && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 calendar-date-strip">
            {data.days.map((day) => {
              const isSelected = selectedDate === day.date
              const isToday = day.date === `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
              const { day: dayNum, weekday } = formatDayShort(day.date)
              const hasItems = day.items.length > 0
              const hasTx = day.transactions.length > 0
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex flex-col items-center min-w-[46px] px-2 py-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isToday
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide opacity-80">{weekday}</span>
                  <span className="text-sm font-semibold">{dayNum}</span>
                  <span className="flex items-center gap-0.5 h-1.5 mt-1">
                    {hasItems && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />}
                    {hasTx && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-gray-300'}`} />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail panel */}
      <div className="space-y-4">
        {loading && <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">Memuat kalender...</div>}

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

        {!loading && !error && !data && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">Tidak ada data.</div>
        )}

        {data && (
          <>
            {/* Overdue list when no date selected */}
            {!selectedDate && data.overdue.length > 0 && (
              <div className="bg-white border border-red-200 rounded-xl p-4">
                <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-3">
                  <FiAlertTriangle /> Item Overdue
                </h3>
                <div className="space-y-2">
                  {data.overdue.map((item) => (
                    <div key={`${item.kind}-${item.id}-${item.date}`} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${KIND_META[item.kind].className}`}>
                        {KIND_META[item.kind].icon} {KIND_META[item.kind].label}
                      </span>
                      <span className="text-gray-800 font-medium flex-1">{item.title}</span>
                      {item.walletName && <span className="text-gray-400 text-xs">{item.walletName}</span>}
                      <span className="text-red-600 font-semibold">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && selectedDay && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{formatDateLong(selectedDate)}</h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ‹ Lihat semua
                  </button>
                </div>

                {selectedDay.items.length === 0 && selectedDay.transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <FiFileText className="mx-auto mb-2 opacity-40" size={28} />
                    Tidak ada item atau transaksi di tanggal ini.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.items.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Terjadwal</p>
                        <div className="space-y-2">
                          {selectedDay.items.map((item) => (
                            <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2.5 text-sm">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${KIND_META[item.kind].className}`}>
                                {KIND_META[item.kind].icon} {KIND_META[item.kind].label}
                              </span>
                              <span className="text-gray-800 font-medium flex-1">{item.title}</span>
                              {item.walletName && <span className="text-gray-400 text-xs">{item.walletName}</span>}
                              {item.isOverdue && <span className="text-red-500 text-xs font-medium">overdue</span>}
                              <span className={`font-semibold ${item.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {item.type === 'income' ? '+' : ''}{formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDay.transactions.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Transaksi</p>
                        <div className="space-y-2">
                          {selectedDay.transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2.5 text-sm">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-gray-800 flex-1">{tx.description || 'Tanpa deskripsi'}</span>
                              <span className={`font-semibold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Month overview grouped by date */}
            {!selectedDate && (
              <div className="space-y-4">
                {daysWithItems.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                    <FiCalendar className="mx-auto mb-2 opacity-40" size={28} />
                    Tidak ada jadwal atau transaksi di bulan ini.
                  </div>
                ) : (
                  daysWithItems.map((day) => {
                    const { day: dayNum, weekday } = formatDayShort(day.date)
                    const totalItems = day.items.length
                    const totalTx = day.transactions.length
                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{dayNum} <span className="text-xs font-normal text-gray-400">{weekday}</span></span>
                          <span className="text-xs text-gray-400">
                            {totalItems > 0 && `${totalItems} item`}
                            {totalItems > 0 && totalTx > 0 && ' • '}
                            {totalTx > 0 && `${totalTx} transaksi`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {day.items.map((item) => (
                            <span key={`${item.kind}-${item.id}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${KIND_META[item.kind].className}`}>
                              {KIND_META[item.kind].icon} {item.title}
                            </span>
                          ))}
                        </div>
                        {(day.income > 0 || day.expense > 0) && (
                          <div className="flex gap-3 mt-2 text-xs">
                            {day.income > 0 && <span className="text-emerald-600">+{formatCurrency(day.income)}</span>}
                            {day.expense > 0 && <span className="text-red-500">-{formatCurrency(day.expense)}</span>}
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
