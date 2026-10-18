'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, AlertTriangle, Archive, ArrowUpRight, Calendar, CalendarDays, CheckCircle2, CreditCard, DollarSign, FileUp, Pencil, Plus, RefreshCw, Sparkles, TrendingUp, Trash2, WalletCards, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/app/lib/utils'
import { useWallet } from '../providers/WalletProvider'
import { TRANSACTION_TYPE_OPTIONS, TRANSACTION_TYPE_LABELS } from '@/lib/credit-cards'

type CardSummary = {
  utilization: number
  availableCredit: number
  nextStatementDate: string
  nextDueDate: string
  daysUntilDue: number
  minimumPayment: number
  isHighUtilization: boolean
  isDueSoon: boolean
}

type CreditCardRow = {
  id: string
  name: string
  issuer?: string | null
  lastFour?: string | null
  creditLimit: number
  currentBalance: number
  statementDay: number
  dueDay: number
  apr?: number | null
  minimumPaymentRate: number
  reminderDaysBefore: number
  status: string
  notes?: string | null
  wallet?: { id: string; name: string; color?: string | null; currencyCode?: string | null } | null
  summary: CardSummary
  transactions?: CreditCardTransaction[]
}

type CreditCardTransaction = {
  id: string
  amount: number
  type: string
  description?: string | null
  merchant?: string | null
  category?: string | null
  date: string
  installmentTenor?: number | null
  installmentTerm?: number | null
  installmentTotal?: number | null
  installmentPaid?: number | null
  originalAmount?: number | null
  currency?: string | null
  exchangeRate?: number | null
  reversalOfId?: string | null
}

type FormState = {
  name: string
  issuer: string
  lastFour: string
  creditLimit: string
  currentBalance: string
  statementDay: string
  dueDay: string
  apr: string
  minimumPaymentRate: string
  reminderDaysBefore: string
  walletId: string
  status: string
  notes: string
}

type TransactionForm = {
  cardId: string
  amount: string
  type: string
  merchant: string
  description: string
  category: string
  date: string
  installmentTenor: string
  installmentTerm: string
  installmentTotal: string
  originalAmount: string
  currency: string
  exchangeRate: string
  reversalOfId: string
}

const defaultForm: FormState = {
  name: '',
  issuer: '',
  lastFour: '',
  creditLimit: '',
  currentBalance: '',
  statementDay: '20',
  dueDay: '10',
  apr: '',
  minimumPaymentRate: '0.03',
  reminderDaysBefore: '7',
  walletId: '',
  status: 'active',
  notes: '',
}

const defaultTransactionForm: TransactionForm = {
  cardId: '',
  amount: '',
  type: 'charge',
  merchant: '',
  description: '',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  installmentTenor: '',
  installmentTerm: '',
  installmentTotal: '',
  originalAmount: '',
  currency: 'IDR',
  exchangeRate: '',
  reversalOfId: '',
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function pct(value: number) {
  if (!Number.isFinite(value)) return '0.0%'
  return `${value.toFixed(1)}%`
}

export default function CreditCardsPage() {
  const { wallets } = useWallet()
  const [cards, setCards] = useState<CreditCardRow[]>([])
  const [summary, setSummary] = useState({ totalLimit: 0, totalBalance: 0, availableCredit: 0, utilization: 0, highUtilizationCount: 0, dueSoonCount: 0 })
  const [form, setForm] = useState<FormState>(defaultForm)
  const [transactionForm, setTransactionForm] = useState<TransactionForm>(defaultTransactionForm)
  const [editingCard, setEditingCard] = useState<CreditCardRow | null>(null)
  const [batchText, setBatchText] = useState('')
  const [batchResult, setBatchResult] = useState<{ ok: number; errors: string[] } | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPassword, setPdfPassword] = useState('')
  const [pdfResult, setPdfResult] = useState<{ total: number; errors: string[]; warnings: string[]; parsed?: any } | null>(null)
  const [selectedCardForTx, setSelectedCardForTx] = useState<CreditCardRow | null>(null)
  const [allTransactions, setAllTransactions] = useState<CreditCardTransaction[]>([])
  const [loadingAllTx, setLoadingAllTx] = useState(false)
  const [advancingInstallments, setAdvancingInstallments] = useState(false)
  const [txSearch, setTxSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<'card' | 'transaction' | 'billing' | 'pay' | null>(null)
  const [payingCard, setPayingCard] = useState<CreditCardRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payWalletId, setPayWalletId] = useState('')
  const [payNote, setPayNote] = useState('')
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null)
  const closeAction = () => { setActiveAction(null); setPayingCard(null); setPaySuccessMsg(null); }

  const activeCards = useMemo(() => cards.filter(card => card.status === 'active'), [cards])

  const fetchCards = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/credit-cards')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load credit cards')
      setCards(data.creditCards || [])
      setSummary(data.summary || summary)
      setTransactionForm(current => ({ ...current, cardId: current.cardId || data.creditCards?.[0]?.id || '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit cards')
    } finally {
      setLoading(false)
    }
  }

  const advanceInstallments = async () => {
    if (!confirm('Advance semua cicilan ke bulan berikutnya? Yang sudah lunas (term >= tenor) akan ditandai selesai.')) return
    setAdvancingInstallments(true)
    setError(null)
    try {
      const res = await fetch('/api/credit-cards/advance-installments', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal advance cicilan')
      alert(data.message || 'Cicilan berhasil di-advance')
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal advance')
    } finally {
      setAdvancingInstallments(false)
    }
  }

  const payCreditCard = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!payingCard || !payWalletId || Number(payAmount) <= 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/credit-cards/${payingCard.id}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payAmount), walletId: payWalletId, note: payNote }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membayar tagihan')
      setPaySuccessMsg(data.message)
      await fetchCards()
      setPayAmount(''); setPayNote('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal membayar tagihan') }
    finally { setSaving(false) }
  }

  const openAllTransactions = async (card: CreditCardRow) => {
    setSelectedCardForTx(card)
    setTxSearch('')
    setLoadingAllTx(true)
    try {
      const res = await fetch(`/api/credit-cards/${card.id}/transactions?take=200`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat transaksi')
      setAllTransactions(data.transactions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi')
      setSelectedCardForTx(null)
    } finally {
      setLoadingAllTx(false)
    }
  }

  useEffect(() => {
    fetchCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleTransactions = allTransactions.filter(tx => {
    const q = txSearch.trim().toLowerCase()
    return !q || `${tx.merchant || ''} ${tx.description || ''} ${tx.type}`.toLowerCase().includes(q)
  })

  const creditInsights = useMemo(() => {
    const installments = cards.flatMap(card => card.transactions || []).filter(tx => tx.type === 'installment' && tx.installmentTenor)
    const monthly = [1, 2, 3].map(month => installments.reduce((sum, tx) => {
      const term = tx.installmentTerm || 1
      const tenor = tx.installmentTenor || 0
      return sum + (term + month - 1 <= tenor ? tx.amount : 0)
    }, 0))
    const remaining = installments.reduce((sum, tx) => {
      const term = tx.installmentTerm || 1
      const tenor = tx.installmentTenor || 0
      return sum + Math.max(tenor - term + 1, 0) * tx.amount
    }, 0)

    const allTx = cards.flatMap(c => c.transactions || [])
    const merchantMap: Record<string, number> = {}
    const categoryMap: Record<string, number> = {}
    let totalSpend = 0

    allTx.forEach(tx => {
      if (['charge', 'installment', 'fee'].includes(tx.type)) {
        const m = tx.merchant || 'Lainnya'
        const c = tx.category || 'Umum'
        merchantMap[m] = (merchantMap[m] || 0) + tx.amount
        categoryMap[c] = (categoryMap[c] || 0) + tx.amount
        totalSpend += tx.amount
      }
    })

    const topMerchants = Object.entries(merchantMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const estimatedPoints = Math.floor(totalSpend / 10000)

    const now = new Date()
    const currentMonthTx = allTx.filter(tx => {
      const date = new Date(tx.date)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    const currentInstallments = currentMonthTx.filter(tx => tx.type === 'installment')
    const currentNonInstallments = currentMonthTx.filter(tx => ['charge', 'fee'].includes(tx.type))
    const currentNonInstallmentTotal = currentNonInstallments.reduce((sum, tx) => sum + tx.amount, 0)
    const currentInstallmentTotal = currentInstallments.reduce((sum, tx) => sum + tx.amount, 0)
    const currentLargest = [...currentNonInstallments].sort((a, b) => b.amount - a.amount).slice(0, 5)

    // Cicilan aktif (untuk list detail)
    const activeInstallments = installments.filter(tx => (tx.installmentTerm || 0) < (tx.installmentTenor || 0))
      .sort((a, b) => {
        const remA = (a.installmentTenor || 0) - (a.installmentTerm || 0)
        const remB = (b.installmentTenor || 0) - (b.installmentTerm || 0)
        return remA - remB // yang paling dekat lunas di atas
      })

    // Cicilan yang sudah completed (type = 'installment_completed')
    const completedInstallments = cards.flatMap(card => card.transactions || []).filter(tx => tx.type === 'installment_completed')

    return { monthly, remaining, count: installments.length, topMerchants, topCategories, estimatedPoints, totalSpend, currentMonthTx, currentInstallments, currentNonInstallments, currentNonInstallmentTotal, currentInstallmentTotal, currentLargest, activeInstallments, completedInstallments }
  }, [cards])

  const createCard = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        walletId: form.walletId || null,
        creditLimit: Number(form.creditLimit || 0),
        currentBalance: Number(form.currentBalance || 0),
        statementDay: Number(form.statementDay || 20),
        dueDay: Number(form.dueDay || 10),
        apr: form.apr ? Number(form.apr) : null,
        minimumPaymentRate: Number(form.minimumPaymentRate || 0.03),
        reminderDaysBefore: Number(form.reminderDaysBefore || 7),
      }
      const res = await fetch('/api/credit-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create credit card')
      setForm(defaultForm)
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create credit card')
    } finally {
      setSaving(false)
    }
  }

  const deleteCard = async (cardId: string) => {
    if (!confirm('Delete this credit card and its transaction history?')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/credit-cards/${cardId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete credit card')
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credit card')
    } finally {
      setSaving(false)
    }
  }

  const archiveCard = async (cardId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'archived' ? 'active' : 'archived'
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/credit-cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update card')
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card')
    } finally {
      setSaving(false)
    }
  }

  const startEditCard = (card: CreditCardRow) => {
    setEditingCard(card)
    setActiveAction('card')
    setForm({
      name: card.name,
      issuer: card.issuer || '',
      lastFour: card.lastFour || '',
      creditLimit: String(card.creditLimit || ''),
      currentBalance: String(card.currentBalance || ''),
      statementDay: String(card.statementDay || ''),
      dueDay: String(card.dueDay || ''),
      apr: card.apr != null ? String(card.apr) : '',
      minimumPaymentRate: String(card.minimumPaymentRate || 0.03),
      reminderDaysBefore: String(card.reminderDaysBefore || 7),
      walletId: card.wallet?.id || '',
      status: card.status,
      notes: card.notes || '',
    })
  }

  const cancelEdit = () => {
    setEditingCard(null)
    setForm(defaultForm)
  }

  const updateCard = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingCard) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        walletId: form.walletId || null,
        creditLimit: Number(form.creditLimit || 0),
        currentBalance: Number(form.currentBalance || 0),
        statementDay: Number(form.statementDay || 20),
        dueDay: Number(form.dueDay || 10),
        apr: form.apr ? Number(form.apr) : null,
        minimumPaymentRate: Number(form.minimumPaymentRate || 0.03),
        reminderDaysBefore: Number(form.reminderDaysBefore || 7),
      }
      const res = await fetch(`/api/credit-cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update credit card')
      setForm(defaultForm)
      setEditingCard(null)
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credit card')
    } finally {
      setSaving(false)
    }
  }

  const importBillingPdf = async (event: React.FormEvent) => {
    event.preventDefault()
    const cardId = transactionForm.cardId || activeCards[0]?.id
    if (!cardId) { setError('Buat kartu dulu sebelum import PDF.'); return }
    if (!pdfFile) { setError('Pilih file PDF e-billing dulu'); return }
    setSaving(true)
    setError(null)
    setPdfResult(null)
    try {
      const formData = new FormData()
      formData.append('file', pdfFile)
      if (pdfPassword) formData.append('password', pdfPassword)
      const res = await fetch(`/api/credit-cards/${cardId}/billing`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to import billing PDF')
      setPdfResult({ total: data.total || 0, errors: data.errors || [], warnings: data.warnings || [], parsed: data.parsed })
      setPdfFile(null)
      setPdfPassword('')
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import billing PDF')
    } finally {
      setSaving(false)
    }
  }

  const importBatch = async (event: React.FormEvent) => {
    event.preventDefault()
    const cardId = transactionForm.cardId || activeCards[0]?.id
    if (!cardId) { setError('Buat kartu dulu sebelum import.'); return }
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setBatchResult({ ok: 0, errors: ['No lines to import'] }); return }

    const rows = lines.map(line => {
      const parts = line.split(/[,\t;]/).map(p => p.trim())
      // Format: date, merchant, amount, type?, currency?, originalAmount?
      return {
        date: parts[0] || undefined,
        merchant: parts[1] || undefined,
        amount: Number(parts[2] || 0),
        type: parts[3] || 'charge',
        currency: parts[4] || 'IDR',
        originalAmount: parts[5] ? Number(parts[5]) : undefined,
        category: parts[6] || undefined,
        description: parts[7] || undefined,
      }
    }).filter(r => r.amount > 0)

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/credit-cards/${cardId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      })
      const data = await res.json()
      if (!res.ok && !data.total) throw new Error(data.error || 'Failed to import transactions')
      setBatchResult({ ok: data.total || 0, errors: data.errors || [] })
      setBatchText('')
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import transactions')
    } finally {
      setSaving(false)
    }
  }

  const createTransaction = async (event: React.FormEvent) => {
    event.preventDefault()
    const cardId = transactionForm.cardId || activeCards[0]?.id
    if (!cardId) {
      setError('Buat kartu dulu sebelum record transaksi.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...transactionForm,
        amount: Number(transactionForm.amount || 0),
        date: transactionForm.date || undefined,
        installmentTenor: transactionForm.installmentTenor ? Number(transactionForm.installmentTenor) : undefined,
        installmentTerm: transactionForm.installmentTerm ? Number(transactionForm.installmentTerm) : undefined,
        installmentTotal: transactionForm.installmentTotal ? Number(transactionForm.installmentTotal) : undefined,
        originalAmount: transactionForm.originalAmount ? Number(transactionForm.originalAmount) : undefined,
        exchangeRate: transactionForm.exchangeRate ? Number(transactionForm.exchangeRate) : undefined,
        currency: transactionForm.currency || 'IDR',
        reversalOfId: transactionForm.reversalOfId || undefined,
      }
      const res = await fetch(`/api/credit-cards/${cardId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record transaction')
      setTransactionForm(current => ({ ...defaultTransactionForm, cardId: current.cardId, date: new Date().toISOString().slice(0, 10) }))
      await fetchCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Cards</h1>
          <p className="text-muted-foreground">Track statement dates, due dates, utilization, payments, and card alerts.</p>
        </div>
        <Button onClick={fetchCards} disabled={loading} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Limit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-extrabold tracking-tight">{formatCurrency(summary.totalLimit)}</div><p className="text-xs text-muted-foreground mt-1">Gabungan seluruh kartu</p></CardContent>
        </Card>
        <Card className="border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tagihan Berjalan (Outstanding)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{formatCurrency(summary.totalBalance)}</div><p className="text-xs text-amber-600 font-medium mt-1">Wajib diperhitungkan saat due date</p></CardContent>
        </Card>
        <Card className="border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisa Limit Tersedia</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-extrabold tracking-tight text-emerald-600">{formatCurrency(summary.availableCredit)}</div><p className="text-xs text-emerald-600 font-medium mt-1">Bisa dipakai transaksi</p></CardContent>
        </Card>
        <Card className="border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rata-Rata Utilisasi</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold tracking-tight">{pct(summary.utilization)}</div>
              <Badge variant={summary.utilization > 70 ? 'destructive' : summary.utilization > 30 ? 'secondary' : 'outline'} className="text-[10px]">
                {summary.utilization > 70 ? 'Tinggi' : summary.utilization > 30 ? 'Sedang' : 'Aman'}
              </Badge>
            </div>
            <Progress value={Math.min(summary.utilization, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-lg">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-cyan-300" /> CC Command Center & Analytics</CardTitle>
              <p className="text-sm text-slate-300">Ringkasan kewajiban, proyeksi cicilan, dan estimasi rewards.</p>
            </div>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={advanceInstallments} disabled={advancingInstallments}>
              <CalendarDays className="mr-2 h-4 w-4" />
              {advancingInstallments ? 'Memproses...' : 'Advance Cicilan →'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5">
          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr_1fr]">
            <div className="rounded-xl bg-white/10 p-4"><div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300"><DollarSign className="h-4 w-4" /> Sisa kewajiban cicilan</div><div className="text-2xl font-bold">{formatCurrency(creditInsights.remaining)}</div><p className="mt-1 text-xs text-slate-400">{creditInsights.count} transaksi cicilan aktif</p></div>
            {[0, 1, 2].map((month, index) => <div key={month} className="rounded-xl border border-white/10 bg-white/[0.06] p-4"><div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300"><TrendingUp className="h-4 w-4 text-cyan-300" /> +{index + 1} bulan</div><div className="text-xl font-bold">{formatCurrency(creditInsights.monthly[month])}</div><p className="mt-1 text-xs text-slate-400">{creditInsights.monthly[month] === 0 ? 'Semua lunas 🎉' : 'estimasi cicilan berjalan'}</p></div>)}
          </div>

          {/* Daftar Cicilan Aktif + Progress */}
          <div className="border-t border-white/10 pt-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-300">📋 Detail Cicilan Aktif</div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {creditInsights.activeInstallments.length === 0 ? (
                <p className="text-xs text-slate-400">Tidak ada cicilan aktif.</p>
              ) : (
                creditInsights.activeInstallments.map(tx => {
                  const term = tx.installmentTerm || 0
                  const tenor = tx.installmentTenor || 1
                  const pctDone = Math.round((term / tenor) * 100)
                  const remaining = Math.max(tenor - term, 0)
                  const willComplete = term + 1 >= tenor
                  return (
                    <div key={tx.id} className="rounded-lg bg-white/[0.06] border border-white/10 p-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-slate-200 truncate">{tx.merchant || tx.description || '-'}</span>
                          {willComplete && <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">LUNAS NEXT</span>}
                        </div>
                        <span className="font-bold text-slate-100 shrink-0 ml-2">{formatCurrency(tx.amount)}/bln</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pctDone >= 90 ? 'bg-emerald-400' : pctDone >= 50 ? 'bg-cyan-400' : 'bg-blue-400'}`} style={{ width: `${pctDone}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{String(term).padStart(3, '0')}/{String(tenor).padStart(3, '0')} · sisa {remaining} bln</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Cicilan Lunas */}
          {creditInsights.completedInstallments.length > 0 && (
            <div className="border-t border-white/10 pt-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-300">✅ Cicilan Lunas</div>
              <div className="flex flex-wrap gap-2">
                {creditInsights.completedInstallments.map(tx => (
                  <span key={tx.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> {tx.merchant || tx.description || '-'} · {formatCurrency(tx.amount)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3 border-t border-white/10 pt-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-300">📊 Transaksi Bulan Ini (Non-Cicilan vs Cicilan)</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Non-Cicilan (Charge & Fee):</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(creditInsights.currentNonInstallmentTotal)} ({creditInsights.currentNonInstallments.length} tx)</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-300">Cicilan Rutin Bulan Ini:</span>
                  <span className="font-bold text-amber-400">{formatCurrency(creditInsights.currentInstallmentTotal)} ({creditInsights.currentInstallments.length} tx)</span>
                </div>
                <div className="pt-1 text-[11px] text-slate-400">
                  Total pengeluaran murni bulan ini: <span className="font-bold text-white">{formatCurrency(creditInsights.currentNonInstallmentTotal + creditInsights.currentInstallmentTotal)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-300">⚡ Transaksi Non-Cicilan Terbesar Bulan Ini</div>
              {creditInsights.currentLargest.length === 0 ? <p className="text-xs text-slate-400">Belum ada transaksi non-cicilan bulan ini</p> : creditInsights.currentLargest.map(tx => (
                <div key={tx.id} className="mb-2 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <div className="font-medium text-slate-200">{tx.merchant || tx.description || tx.type}</div>
                    <div className="text-[10px] text-slate-400">{formatDate(tx.date)}</div>
                  </div>
                  <span className="font-semibold text-slate-100">{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-300">🎁 Estimasi Rewards & Poin</div>
              <div className="text-2xl font-bold text-amber-300">{creditInsights.estimatedPoints.toLocaleString('id-ID')} Poin</div>
              <p className="mt-1 text-xs text-slate-400">Estimasi 1 poin tiap kelipatan Rp10.000 transaksi.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mr-auto"><div className="font-semibold">Kelola kartu & transaksi</div><p className="text-xs text-muted-foreground">Aksi dipisah ke popup supaya dashboard tetap ringkas.</p></div>
        <Button onClick={() => { setEditingCard(null); setActiveAction('card') }}><Plus className="mr-2 h-4 w-4" /> Add Credit Card</Button>
        <Button variant="outline" onClick={() => setActiveAction('transaction')}><CreditCard className="mr-2 h-4 w-4" /> Record Transaction</Button>
        <Button variant="outline" onClick={() => setActiveAction('billing')}><FileUp className="mr-2 h-4 w-4" /> Import e-Billing</Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-6">Loading credit cards...</CardContent></Card>
          ) : cards.length === 0 ? (
            <Card><CardContent className="p-6 text-muted-foreground">No credit cards yet. Add your first card to start tracking utilization and payment dates.</CardContent></Card>
          ) : (
            cards.map(card => (
              <Card key={card.id} className={card.summary.isHighUtilization ? 'border-orange-300' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-blue-100 p-2 text-blue-700"><CreditCard className="h-5 w-5" /></div>
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          {card.name}
                          <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>{card.status}</Badge>
                          {card.lastFour && <Badge variant="outline">•••• {card.lastFour}</Badge>}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{card.issuer || 'No issuer'}{card.wallet ? ` • ${card.wallet.name}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="default" size="sm" onClick={() => { setPayingCard(card); setPayAmount(String(card.currentBalance)); setPayWalletId(card.wallet?.id || wallets[0]?.id || ''); setActiveAction('pay') }} disabled={saving || card.currentBalance <= 0} title="Bayar tagihan">
                        Bayar Tagihan
                      </Button>
                      <a href={`/api/credit-cards/${card.id}/calendar.ics`} download className="inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted" title="Download pengingat kalender">Kalender</a>
                      <Button variant="ghost" size="sm" onClick={() => startEditCard(card)} disabled={saving} title="Edit kartu">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => archiveCard(card.id, card.status)} disabled={saving} title={card.status === 'archived' ? 'Aktifkan lagi' : 'Arsipkan kartu'}>
                        <Archive className={`h-4 w-4 ${card.status === 'archived' ? 'text-amber-500' : 'text-slate-400'}`} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCard(card.id)} disabled={saving}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Utilization {pct(card.summary.utilization)}</span>
                      <span>{formatCurrency(card.currentBalance)} / {formatCurrency(card.creditLimit)}</span>
                    </div>
                    <Progress value={Math.min(card.summary.utilization, 100)} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Available</div>
                      <div className="font-semibold">{formatCurrency(card.summary.availableCredit)}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Statement</div>
                      <div className="font-semibold">{formatDate(card.summary.nextStatementDate)}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Due</div>
                      <div className="font-semibold">{formatDate(card.summary.nextDueDate)}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground">Minimum Pay</div>
                      <div className="font-semibold">{formatCurrency(card.summary.minimumPayment)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {card.summary.isHighUtilization && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> High utilization</Badge>}
                    {card.summary.isDueSoon && <Badge variant="secondary"><CalendarDays className="mr-1 h-3 w-3" /> Due in {card.summary.daysUntilDue} day(s)</Badge>}
                  </div>

                  {card.transactions && card.transactions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Latest activity</span>
                        <Button variant="ghost" size="sm" onClick={() => openAllTransactions(card)} className="h-6 text-xs text-muted-foreground hover:text-foreground">
                          Lihat Semua Transaksi →
                        </Button>
                      </div>
                      {card.transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              {tx.merchant || tx.description || tx.type}
                              {tx.installmentTenor != null && (
                                <Badge variant="outline" className="text-[10px]">Cicilan {tx.installmentTerm || '?'}/{tx.installmentTenor}</Badge>
                              )}
                              {tx.currency && tx.currency !== 'IDR' && (
                                <Badge variant="secondary" className="text-[10px]">{tx.currency}{tx.exchangeRate ? ` ×${tx.exchangeRate}` : ''}</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{TRANSACTION_TYPE_LABELS[tx.type] || tx.type} • {formatDate(tx.date)}</div>
                          </div>
                          <div className={tx.type === 'payment' || tx.type === 'refund' || tx.type === 'reversal' ? 'font-semibold text-green-600' : 'font-semibold'}>
                            {tx.type === 'payment' || tx.type === 'refund' || tx.type === 'reversal' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {activeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={closeAction}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">
                {activeAction === 'card' ? (editingCard ? `Edit Card: ${editingCard.name}` : 'Add Credit Card') : activeAction === 'transaction' ? 'Record Transaction' : activeAction === 'pay' ? 'Bayar Tagihan Kartu' : 'Import E-Billing / Batch'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeAction}>Tutup</Button>
            </div>

            {activeAction === 'card' && (
              <form onSubmit={editingCard ? updateCard : createCard} className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="card-name">Nama Kartu <span className="text-red-500">*</span></Label>
                  <Input id="card-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="BCA Visa / Mandiri Gold" required />
                  <p className="text-xs text-muted-foreground">Contoh: BCA Visa Platinum, Mandiri Gold</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label htmlFor="card-issuer">Penerbit (Issuer)</Label><Input id="card-issuer" value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} placeholder="BCA" /><p className="text-xs text-muted-foreground">Nama bank/penerbit kartu</p></div>
                  <div className="grid gap-1.5"><Label htmlFor="card-last4">4 Digit Terakhir</Label><Input id="card-last4" value={form.lastFour} onChange={e => setForm({ ...form, lastFour: e.target.value })} maxLength={4} placeholder="1234" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label htmlFor="card-limit">Limit Kartu (Rp) <span className="text-red-500">*</span></Label><Input id="card-limit" type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} min="0" placeholder="10000000" /><p className="text-xs text-muted-foreground">Batas kredit dari bank</p></div>
                  <div className="grid gap-1.5"><Label htmlFor="card-balance">Saldo Saat Ini (Rp)</Label><Input id="card-balance" type="number" value={form.currentBalance} onChange={e => setForm({ ...form, currentBalance: e.target.value })} min="0" placeholder="0" /><p className="text-xs text-muted-foreground">Bisa diisi 0 dulu, transaksi update otomatis</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label htmlFor="card-statement">Tanggal Statement (1-31)</Label><Input id="card-statement" type="number" value={form.statementDay} onChange={e => setForm({ ...form, statementDay: e.target.value })} min="1" max="31" /><p className="text-xs text-muted-foreground">Tanggal cetak tagihan bulanan</p></div>
                  <div className="grid gap-1.5"><Label htmlFor="card-due">Jatuh Tempo (1-31)</Label><Input id="card-due" type="number" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} min="1" max="31" /><p className="text-xs text-muted-foreground">Batas bayar tagihan</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label htmlFor="card-apr">APR (%)</Label><Input id="card-apr" type="number" value={form.apr} onChange={e => setForm({ ...form, apr: e.target.value })} min="0" step="0.01" /></div>
                  <div className="grid gap-1.5"><Label htmlFor="card-minpay">Min. Pembayaran (rate)</Label><Input id="card-minpay" type="number" value={form.minimumPaymentRate} onChange={e => setForm({ ...form, minimumPaymentRate: e.target.value })} min="0" max="1" step="0.01" /><p className="text-xs text-muted-foreground">Contoh: 0.03 = 3%</p></div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="card-wallet">Dompet Tertaut</Label>
                  <Select value={form.walletId || 'none'} onValueChange={value => setForm({ ...form, walletId: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue placeholder="Optional wallet" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No wallet</SelectItem>
                      {wallets.map(wallet => <SelectItem key={wallet.id} value={wallet.id}>{wallet.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label htmlFor="card-notes">Catatan</Label><Textarea id="card-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving} className="flex-1"><WalletCards className="mr-2 h-4 w-4" /> {editingCard ? 'Simpan Perubahan' : 'Save Card'}</Button>
                  {editingCard && <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>Batal</Button>}
                </div>
              </form>
            )}

            {activeAction === 'pay' && payingCard && (
              <form onSubmit={payCreditCard} className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-900">{payingCard.name}</div>
                  <div className="text-muted-foreground">Tagihan berjalan: <span className="font-bold text-slate-900">{formatCurrency(payingCard.currentBalance)}</span> · Minimum pay: {formatCurrency(payingCard.summary.minimumPayment)}</div>
                </div>

                {paySuccessMsg && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    {paySuccessMsg}
                  </div>
                )}

                <div className="grid gap-1.5">
                  <Label htmlFor="pay-wallet">Potong Dari Dompet <span className="text-red-500">*</span></Label>
                  <Select value={payWalletId} onValueChange={setPayWalletId}>
                    <SelectTrigger id="pay-wallet"><SelectValue placeholder="Pilih dompet" /></SelectTrigger>
                    <SelectContent>
                      {wallets.map(w => (
                        <SelectItem key={w.id} value={w.id}>{w.name} (Saldo: {formatCurrency(w.balance)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="pay-amount">Jumlah Pembayaran (Rp) <span className="text-red-500">*</span></Label>
                  <Input id="pay-amount" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min="1" required />
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPayAmount(String(payingCard.currentBalance))}>Bayar Lunas ({formatCurrency(payingCard.currentBalance)})</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPayAmount(String(Math.round(payingCard.summary.minimumPayment)))}>Minimum Pay ({formatCurrency(payingCard.summary.minimumPayment)})</Button>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="pay-note">Catatan Pembayaran</Label>
                  <Input id="pay-note" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Opsional: via M-Banking BCA" />
                </div>

                <Button type="submit" disabled={saving || !payWalletId || Number(payAmount) <= 0} className="w-full">
                  Proses Pembayaran & Sync Saldo Dompet
                </Button>
              </form>
            )}

            {activeAction === 'transaction' && (
              <form onSubmit={createTransaction} className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="tx-card">Kartu <span className="text-red-500">*</span></Label>
                  <Select value={transactionForm.cardId || activeCards[0]?.id || ''} onValueChange={value => setTransactionForm({ ...transactionForm, cardId: value })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kartu" /></SelectTrigger>
                    <SelectContent>{cards.map(card => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {!transactionForm.cardId && cards.length === 0 && <p className="text-xs text-amber-600">Buat kartu dulu sebelum record transaksi.</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="tx-type">Tipe <span className="text-red-500">*</span></Label>
                    <Select value={transactionForm.type} onValueChange={value => setTransactionForm({ ...transactionForm, type: value })}>
                      <SelectTrigger id="tx-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{transactionForm.type === 'installment' ? 'Cicilan: isi tenor & term di bawah' : transactionForm.type === 'refund' || transactionForm.type === 'reversal' ? 'Refund/Reversal: mengurangi saldo kartu' : 'Charge = transaksi, Payment = bayar tagihan'}</p>
                  </div>
                  <div className="grid gap-1.5"><Label htmlFor="tx-amount">Jumlah (Rp) <span className="text-red-500">*</span></Label><Input id="tx-amount" type="number" value={transactionForm.amount} onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })} min="0" required placeholder="0" /></div>
                </div>

                {transactionForm.type === 'installment' && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1.5"><Label htmlFor="tx-tenor">Total Tenor (bulan)</Label><Input id="tx-tenor" type="number" value={transactionForm.installmentTenor} onChange={e => setTransactionForm({ ...transactionForm, installmentTenor: e.target.value })} min="1" placeholder="12" /><p className="text-xs text-muted-foreground">Contoh: 12 = 1 tahun</p></div>
                      <div className="grid gap-1.5"><Label htmlFor="tx-term">Term Ke-</Label><Input id="tx-term" type="number" value={transactionForm.installmentTerm} onChange={e => setTransactionForm({ ...transactionForm, installmentTerm: e.target.value })} min="1" placeholder="1" /><p className="text-xs text-muted-foreground">Cicilan ke berapa sekarang</p></div>
                      <div className="grid gap-1.5"><Label htmlFor="tx-insttotal">Total Cicilan (Rp)</Label><Input id="tx-insttotal" type="number" value={transactionForm.installmentTotal} onChange={e => setTransactionForm({ ...transactionForm, installmentTotal: e.target.value })} min="0" placeholder="0" /><p className="text-xs text-muted-foreground">Total harga awal (opsional)</p></div>
                    </div>
                    {transactionForm.installmentTenor && transactionForm.installmentTerm && Number(transactionForm.installmentTerm) > Number(transactionForm.installmentTenor) && (
                      <p className="text-xs text-red-600">Term ke-{transactionForm.installmentTerm} melebihi tenor {transactionForm.installmentTenor}. Cek lagi.</p>
                    )}
                  </div>
                )}

                <div className="grid gap-1.5"><Label htmlFor="tx-merchant">Merchant</Label><Input id="tx-merchant" value={transactionForm.merchant} onChange={e => setTransactionForm({ ...transactionForm, merchant: e.target.value })} placeholder="Tokopedia / Alfamart" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label htmlFor="tx-category">Kategori</Label><Input id="tx-category" value={transactionForm.category} onChange={e => setTransactionForm({ ...transactionForm, category: e.target.value })} placeholder="groceries" /><p className="text-xs text-muted-foreground">Contoh: groceries, transport, makan</p></div>
                  <div className="grid gap-1.5"><Label htmlFor="tx-date">Tanggal</Label><Input id="tx-date" type="date" value={transactionForm.date} onChange={e => setTransactionForm({ ...transactionForm, date: e.target.value })} /></div>
                </div>

                <div className="rounded-lg border p-3 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground">Multi-Currency & Reversal</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1.5"><Label htmlFor="tx-currency">Currency</Label><Input id="tx-currency" value={transactionForm.currency} onChange={e => setTransactionForm({ ...transactionForm, currency: e.target.value })} placeholder="IDR" maxLength={8} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="tx-orig">Original Amount</Label><Input id="tx-orig" type="number" value={transactionForm.originalAmount} onChange={e => setTransactionForm({ ...transactionForm, originalAmount: e.target.value })} min="0" placeholder="0" /><p className="text-xs text-muted-foreground">Jumlah di mata uang asal</p></div>
                    <div className="grid gap-1.5"><Label htmlFor="tx-rate">Exchange Rate</Label><Input id="tx-rate" type="number" value={transactionForm.exchangeRate} onChange={e => setTransactionForm({ ...transactionForm, exchangeRate: e.target.value })} min="0" step="0.0001" placeholder="15000" /></div>
                  </div>
                  {(transactionForm.type === 'reversal' || transactionForm.type === 'refund') && (
                    <div className="grid gap-1.5"><Label htmlFor="tx-reversalof">Reversal/Refund Dari (ID transaksi)</Label><Input id="tx-reversalof" value={transactionForm.reversalOfId} onChange={e => setTransactionForm({ ...transactionForm, reversalOfId: e.target.value })} placeholder="Opsional: ID transaksi asli" /></div>
                  )}
                </div>

                <div className="grid gap-1.5"><Label htmlFor="tx-desc">Deskripsi</Label><Textarea id="tx-desc" value={transactionForm.description} onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })} rows={2} /></div>
                <Button type="submit" disabled={saving || cards.length === 0} className="w-full">Record Transaction</Button>
              </form>
            )}

            {activeAction === 'billing' && (
              <div className="space-y-6">
                <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                  <div className="text-sm font-semibold text-blue-900">Import dari PDF e-billing</div>
                  <p className="mb-3 text-xs text-muted-foreground">Upload lembar tagihan PDF — transaksi, cicilan, bunga, refund, dan currency otomatis terbaca. Support PDF ber-password.</p>
                  <form onSubmit={importBillingPdf} className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="pdf-card">Kartu</Label>
                      <Select value={transactionForm.cardId || activeCards[0]?.id || ''} onValueChange={value => setTransactionForm({ ...transactionForm, cardId: value })}>
                        <SelectTrigger><SelectValue placeholder="Pilih kartu" /></SelectTrigger>
                        <SelectContent>{cards.map(card => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="pdf-file">File PDF e-billing</Label>
                      <Input id="pdf-file" type="file" accept=".pdf,application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                      {pdfFile && <p className="text-xs text-green-700">✓ {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)</p>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="pdf-password">Password PDF (kalau ada)</Label>
                      <Input id="pdf-password" type="password" value={pdfPassword} onChange={e => setPdfPassword(e.target.value)} placeholder="Kosongkan kalau tidak ber-password" />
                    </div>
                    <Button type="submit" disabled={saving || cards.length === 0 || !pdfFile} className="w-full"><FileUp className="mr-2 h-4 w-4" /> Import PDF</Button>
                    {pdfResult && (
                      <div className="rounded-lg border p-3 text-sm">
                        <div className={pdfResult.errors.length > 0 ? 'text-amber-700' : 'text-green-700'}>
                          ✅ {pdfResult.total} transaksi berhasil diimport dari PDF
                          {pdfResult.parsed?.cardNumber ? ` (kartu ${pdfResult.parsed.cardNumber})` : ''}
                        </div>
                        {pdfResult.parsed?.totalBalance != null && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Total tagihan: {formatCurrency(pdfResult.parsed.totalBalance)} · Min. bayar: {formatCurrency(pdfResult.parsed.minimumPayment || 0)} · Jatuh tempo: {pdfResult.parsed.dueDate}
                          </div>
                        )}
                        {pdfResult.warnings.length > 0 && (
                          <div className="mt-1 text-xs text-amber-600">{pdfResult.warnings.join('; ')}</div>
                        )}
                        {pdfResult.errors.length > 0 && (
                          <ul className="mt-2 list-inside list-disc text-xs text-red-600">
                            {pdfResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </form>
                </div>

                <div className="border-t pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atau paste data batch</div>
                  <form onSubmit={importBatch} className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="batch-card">Kartu</Label>
                      <Select value={transactionForm.cardId || activeCards[0]?.id || ''} onValueChange={value => setTransactionForm({ ...transactionForm, cardId: value })}>
                        <SelectTrigger><SelectValue placeholder="Pilih kartu" /></SelectTrigger>
                        <SelectContent>{cards.map(card => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="batch-text">Data Transaksi (1 baris per transaksi)</Label>
                      <Textarea id="batch-text" value={batchText} onChange={e => setBatchText(e.target.value)} rows={5} placeholder={'2026-08-01, Tokopedia, 150000, charge\n2026-08-02, Netflix, 49000, installment, IDR, 588000, subscription\n2026-08-03, Amazon USD, 45.5, charge, USD, 45.5, shopping'} />
                      <p className="text-xs text-muted-foreground">Format: <code>tanggal, merchant, jumlah, tipe?, currency?, originalAmount?, kategori?, deskripsi?</code></p>
                    </div>
                    <Button type="submit" disabled={saving || cards.length === 0} className="w-full"><FileUp className="mr-2 h-4 w-4" /> Import Data Batch</Button>
                    {batchResult && (
                      <div className="rounded-lg border p-3 text-sm">
                        <div className={batchResult.errors.length > 0 ? 'text-amber-700' : 'text-green-700'}>
                          {batchResult.ok} transaksi berhasil diimport{batchResult.errors.length > 0 ? `, ${batchResult.errors.length} gagal` : ''}
                        </div>
                        {batchResult.errors.length > 0 && (
                          <ul className="mt-2 list-inside list-disc text-xs text-red-600">
                            {batchResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCardForTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => setSelectedCardForTx(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-background shadow-xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">Semua Transaksi</h2>
                <p className="text-sm text-muted-foreground">{selectedCardForTx?.name} · {allTransactions.length} transaksi</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCardForTx(null)}>Tutup</Button>
            </div>
            <div className="border-b p-4">
              <Input value={txSearch} onChange={event => setTxSearch(event.target.value)} placeholder="Cari merchant atau tipe transaksi..." />
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {loadingAllTx ? <p className="text-sm text-muted-foreground">Memuat transaksi...</p> : visibleTransactions.length === 0 ? <p className="text-sm text-muted-foreground">Transaksi tidak ditemukan.</p> : visibleTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div><div className="font-medium">{tx.merchant || tx.description || tx.type}</div><div className="text-xs text-muted-foreground">{TRANSACTION_TYPE_LABELS[tx.type] || tx.type} · {formatDate(tx.date)}{tx.currency && tx.currency !== 'IDR' ? ` · ${tx.currency}` : ''}</div></div>
                  <div className={['payment', 'refund', 'reversal'].includes(tx.type) ? 'font-semibold text-green-600' : 'font-semibold'}>{['payment', 'refund', 'reversal'].includes(tx.type) ? '-' : '+'}{formatCurrency(tx.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
