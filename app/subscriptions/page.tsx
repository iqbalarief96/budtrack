'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, RefreshCw, Bell, CalendarClock, CreditCard, PauseCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/app/lib/utils'
import { useWallet } from '../providers/WalletProvider'

type SubscriptionTracker = {
  id: string
  name: string
  provider?: string | null
  description?: string | null
  category: string
  amount: number
  currencyCode: string
  billingCycle: string
  status: string
  startDate?: string | null
  trialEndsAt?: string | null
  nextBillingAt?: string | null
  cancelBeforeAt?: string | null
  reminderDaysBefore: number
  autoRenew: boolean
  reminderEnabled: boolean
  website?: string | null
  notes?: string | null
  wallet?: {
    id: string
    name: string
    color?: string | null
    currencyCode?: string | null
  } | null
}

type FormState = {
  name: string
  provider: string
  category: string
  amount: string
  currencyCode: string
  billingCycle: string
  status: string
  walletId: string
  startDate: string
  trialEndsAt: string
  nextBillingAt: string
  cancelBeforeAt: string
  reminderDaysBefore: string
  autoRenew: boolean
  reminderEnabled: boolean
  website: string
  notes: string
}

const defaultForm: FormState = {
  name: '',
  provider: '',
  category: 'entertainment',
  amount: '',
  currencyCode: 'IDR',
  billingCycle: 'monthly',
  status: 'active',
  walletId: 'none',
  startDate: '',
  trialEndsAt: '',
  nextBillingAt: '',
  cancelBeforeAt: '',
  reminderDaysBefore: '3',
  autoRenew: true,
  reminderEnabled: true,
  website: '',
  notes: '',
}

const cycleLabels: Record<string, string> = {
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  quarterly: 'Kuartalan',
  yearly: 'Tahunan',
  one_time: 'Sekali bayar',
  trial_only: 'Trial saja',
}

const statusLabels: Record<string, string> = {
  trial: 'Trial',
  active: 'Aktif',
  paused: 'Pause',
  cancelled: 'Cancel',
  expired: 'Expired',
}

function dateOrEmpty(value?: string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function formatShortDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(value?: string | null) {
  if (!value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function SubscriptionsPage() {
  const { wallets } = useWallet()
  const [subscriptions, setSubscriptions] = useState<SubscriptionTracker[]>([])
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((item) => ['active', 'trial'].includes(item.status)),
    [subscriptions]
  )

  const monthlySpend = useMemo(() => {
    return activeSubscriptions.reduce((total, item) => {
      if (item.billingCycle === 'weekly') return total + item.amount * 4.33
      if (item.billingCycle === 'yearly') return total + item.amount / 12
      if (item.billingCycle === 'quarterly') return total + item.amount / 3
      if (item.billingCycle === 'one_time' || item.billingCycle === 'trial_only') return total
      return total + item.amount
    }, 0)
  }, [activeSubscriptions])

  async function fetchSubscriptions() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/subscription-trackers')
      if (!response.ok) throw new Error('Gagal ambil data subscription')
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal ambil data subscription')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function startEdit(item: SubscriptionTracker) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      provider: item.provider || '',
      category: item.category || 'other',
      amount: String(item.amount || ''),
      currencyCode: item.currencyCode || 'IDR',
      billingCycle: item.billingCycle || 'monthly',
      status: item.status || 'active',
      walletId: item.wallet?.id || 'none',
      startDate: dateOrEmpty(item.startDate),
      trialEndsAt: dateOrEmpty(item.trialEndsAt),
      nextBillingAt: dateOrEmpty(item.nextBillingAt),
      cancelBeforeAt: dateOrEmpty(item.cancelBeforeAt),
      reminderDaysBefore: String(item.reminderDaysBefore ?? 3),
      autoRenew: item.autoRenew,
      reminderEnabled: item.reminderEnabled,
      website: item.website || '',
      notes: item.notes || '',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(defaultForm)
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      walletId: form.walletId === 'none' ? null : form.walletId,
      amount: Number(form.amount || 0),
      reminderDaysBefore: Number(form.reminderDaysBefore || 3),
    }

    try {
      const response = await fetch(editingId ? `/api/subscription-trackers/${editingId}` : '/api/subscription-trackers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal simpan subscription')
      }

      await fetchSubscriptions()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal simpan subscription')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSubscription(id: string) {
    if (!confirm('Hapus subscription ini?')) return
    setError(null)
    try {
      const response = await fetch(`/api/subscription-trackers/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Gagal hapus subscription')
      setSubscriptions((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal hapus subscription')
    }
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400">Pantau trial, tanggal cancel, dan tagihan subscription biar gak kebobolan.</p>
        </div>
        <Button onClick={fetchSubscriptions} variant="outline" disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Aktif + Trial</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-green-500" /><span className="text-3xl font-bold">{activeSubscriptions.length}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Estimasi Bulanan</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3"><CreditCard className="h-8 w-8 text-blue-500" /><span className="text-2xl font-bold">{formatCurrency(monthlySpend)}</span></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Reminder On</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3"><Bell className="h-8 w-8 text-amber-500" /><span className="text-3xl font-bold">{subscriptions.filter((item) => item.reminderEnabled).length}</span></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> {editingId ? 'Edit Subscription' : 'Tambah Subscription'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid gap-2"><Label>Nama</Label><Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Netflix, ChatGPT, Canva..." required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Provider</Label><Input value={form.provider} onChange={(e) => updateForm('provider', e.target.value)} placeholder="OpenAI" /></div>
                <div className="grid gap-2"><Label>Kategori</Label><Input value={form.category} onChange={(e) => updateForm('category', e.target.value)} placeholder="ai/tools" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Nominal</Label><Input type="number" value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} min="0" step="0.01" /></div>
                <div className="grid gap-2"><Label>Cycle</Label><Select value={form.billingCycle} onValueChange={(value) => updateForm('billingCycle', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(cycleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => updateForm('status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Wallet</Label><Select value={form.walletId} onValueChange={(value) => updateForm('walletId', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa wallet</SelectItem>{wallets.map((wallet) => <SelectItem key={wallet.id} value={wallet.id}>{wallet.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Trial Ends</Label><Input type="date" value={form.trialEndsAt} onChange={(e) => updateForm('trialEndsAt', e.target.value)} /></div>
                <div className="grid gap-2"><Label>Next Billing</Label><Input type="date" value={form.nextBillingAt} onChange={(e) => updateForm('nextBillingAt', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Cancel Before</Label><Input type="date" value={form.cancelBeforeAt} onChange={(e) => updateForm('cancelBeforeAt', e.target.value)} /></div>
                <div className="grid gap-2"><Label>Reminder H-</Label><Input type="number" value={form.reminderDaysBefore} onChange={(e) => updateForm('reminderDaysBefore', e.target.value)} min="0" /></div>
              </div>
              <div className="grid gap-2"><Label>Website</Label><Input value={form.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://..." /></div>
              <div className="grid gap-2"><Label>Catatan</Label><Textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Pakai akun siapa, cara cancel, promo, dll." /></div>
              <div className="flex items-center justify-between rounded-lg border p-3"><Label>Auto-renew</Label><Switch checked={form.autoRenew} onCheckedChange={(value) => updateForm('autoRenew', value)} /></div>
              <div className="flex items-center justify-between rounded-lg border p-3"><Label>Reminder aktif</Label><Switch checked={form.reminderEnabled} onCheckedChange={(value) => updateForm('reminderEnabled', value)} /></div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : editingId ? 'Update' : 'Tambah'}</Button>
                {editingId && <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-6 text-gray-500">Loading subscriptions...</CardContent></Card>
          ) : subscriptions.length === 0 ? (
            <Card><CardContent className="p-6 text-gray-500">Belum ada subscription. Tambahkan trial atau langganan pertama lo.</CardContent></Card>
          ) : subscriptions.map((item) => {
            const trialDays = daysLeft(item.trialEndsAt)
            const billingDays = daysLeft(item.nextBillingAt)
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{statusLabels[item.status] || item.status}</Badge>
                        <Badge variant="outline">{cycleLabels[item.billingCycle] || item.billingCycle}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{item.provider || item.category} {item.wallet ? `• ${item.wallet.name}` : ''}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                        {item.trialEndsAt && <span className="flex items-center gap-1"><PauseCircle className="h-4 w-4" /> Trial: {formatShortDate(item.trialEndsAt)} {trialDays !== null && `(${trialDays} hari)`}</span>}
                        {item.nextBillingAt && <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Billing: {formatShortDate(item.nextBillingAt)} {billingDays !== null && `(${billingDays} hari)`}</span>}
                      </div>
                      {item.notes && <p className="text-sm text-gray-500">{item.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-3 md:items-end">
                      <div className="text-right">
                        <div className="text-xl font-bold">{formatCurrency(item.amount)}</div>
                        <div className="text-xs text-gray-500">{cycleLabels[item.billingCycle] || item.billingCycle}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(item)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteSubscription(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
