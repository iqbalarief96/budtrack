'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CreditCard, Plus, RefreshCw, Trash2, WalletCards } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchCards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const createTransaction = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!transactionForm.cardId) {
      setError('Pick a credit card first')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...transactionForm,
        amount: Number(transactionForm.amount || 0),
        date: transactionForm.date || undefined,
      }
      const res = await fetch(`/api/credit-cards/${transactionForm.cardId}/transactions`, {
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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Limit</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.totalLimit)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Available</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(summary.availableCredit)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Utilization</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pct(summary.utilization)}</div>
            <Progress value={Math.min(summary.utilization, 100)} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
                    <Button variant="ghost" size="sm" onClick={() => deleteCard(card.id)} disabled={saving}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
                      <div className="text-sm font-medium">Latest activity</div>
                      {card.transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div>
                            <div className="font-medium">{tx.merchant || tx.description || tx.type}</div>
                            <div className="text-xs text-muted-foreground">{tx.type} • {formatDate(tx.date)}</div>
                          </div>
                          <div className={tx.type === 'payment' ? 'font-semibold text-green-600' : 'font-semibold'}>{tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add Credit Card</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createCard} className="space-y-3">
                <div className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="BCA Visa / Mandiri Gold" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Issuer</Label><Input value={form.issuer} onChange={e => setForm({ ...form, issuer: e.target.value })} placeholder="BCA" /></div>
                  <div className="grid gap-2"><Label>Last 4</Label><Input value={form.lastFour} onChange={e => setForm({ ...form, lastFour: e.target.value })} maxLength={4} placeholder="1234" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Limit</Label><Input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} min="0" /></div>
                  <div className="grid gap-2"><Label>Current Balance</Label><Input type="number" value={form.currentBalance} onChange={e => setForm({ ...form, currentBalance: e.target.value })} min="0" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Statement Day</Label><Input type="number" value={form.statementDay} onChange={e => setForm({ ...form, statementDay: e.target.value })} min="1" max="31" /></div>
                  <div className="grid gap-2"><Label>Due Day</Label><Input type="number" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} min="1" max="31" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>APR %</Label><Input type="number" value={form.apr} onChange={e => setForm({ ...form, apr: e.target.value })} min="0" step="0.01" /></div>
                  <div className="grid gap-2"><Label>Min Pay Rate</Label><Input type="number" value={form.minimumPaymentRate} onChange={e => setForm({ ...form, minimumPaymentRate: e.target.value })} min="0" max="1" step="0.01" /></div>
                </div>
                <div className="grid gap-2">
                  <Label>Linked Wallet</Label>
                  <Select value={form.walletId || 'none'} onValueChange={value => setForm({ ...form, walletId: value === 'none' ? '' : value })}>
                    <SelectTrigger><SelectValue placeholder="Optional wallet" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No wallet</SelectItem>
                      {wallets.map(wallet => <SelectItem key={wallet.id} value={wallet.id}>{wallet.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
                <Button type="submit" disabled={saving} className="w-full"><WalletCards className="mr-2 h-4 w-4" /> Save Card</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Record Charge / Payment</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createTransaction} className="space-y-3">
                <div className="grid gap-2">
                  <Label>Card</Label>
                  <Select value={transactionForm.cardId || activeCards[0]?.id || ''} onValueChange={value => setTransactionForm({ ...transactionForm, cardId: value })}>
                    <SelectTrigger><SelectValue placeholder="Pick card" /></SelectTrigger>
                    <SelectContent>{cards.map(card => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Type</Label><Select value={transactionForm.type} onValueChange={value => setTransactionForm({ ...transactionForm, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="charge">Charge</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="fee">Fee</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent></Select></div>
                  <div className="grid gap-2"><Label>Amount</Label><Input type="number" value={transactionForm.amount} onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })} min="0" required /></div>
                </div>
                <div className="grid gap-2"><Label>Merchant</Label><Input value={transactionForm.merchant} onChange={e => setTransactionForm({ ...transactionForm, merchant: e.target.value })} placeholder="Tokopedia / payment" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Category</Label><Input value={transactionForm.category} onChange={e => setTransactionForm({ ...transactionForm, category: e.target.value })} placeholder="groceries" /></div>
                  <div className="grid gap-2"><Label>Date</Label><Input type="date" value={transactionForm.date} onChange={e => setTransactionForm({ ...transactionForm, date: e.target.value })} /></div>
                </div>
                <div className="grid gap-2"><Label>Description</Label><Textarea value={transactionForm.description} onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })} rows={2} /></div>
                <Button type="submit" disabled={saving || cards.length === 0} className="w-full">Record Transaction</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
