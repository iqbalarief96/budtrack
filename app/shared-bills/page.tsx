'use client'

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Plus, RefreshCw, Trash2, Users, CheckCircle2, WalletCards, CalendarDays } from 'lucide-react'
import { useWallet } from '../providers/WalletProvider'
import { formatCurrency } from '@/app/lib/utils'

type Participant = {
  id?: string
  name: string
  email?: string | null
  shareAmount: number
  sharePercent?: number | null
  paidAmount: number
  status: string
  ownerRole: string
  settlementNote?: string | null
}

type SharedBill = {
  id: string
  title: string
  description?: string | null
  category: string
  totalAmount: number
  currencyCode: string
  dueDate?: string | null
  paidAt?: string | null
  status: string
  ownership: string
  splitMethod: string
  recurrence: string
  notes?: string | null
  wallet?: { id: string; name: string; color?: string | null; currencyCode?: string | null } | null
  walletGroup?: { id: string; name: string; color?: string | null; icon?: string | null } | null
  participants: Participant[]
}

type FormParticipant = {
  name: string
  email: string
  shareAmount: string
  sharePercent: string
  paidAmount: string
  ownerRole: string
}

type FormState = {
  title: string
  description: string
  category: string
  totalAmount: string
  currencyCode: string
  dueDate: string
  walletId: string
  walletGroupId: string
  splitMethod: string
  recurrence: string
  ownership: string
  notes: string
  participants: FormParticipant[]
}

const defaultParticipant = (name = ''): FormParticipant => ({
  name,
  email: '',
  shareAmount: '',
  sharePercent: '',
  paidAmount: '0',
  ownerRole: 'SHARED',
})

const defaultForm: FormState = {
  title: '',
  description: '',
  category: 'household',
  totalAmount: '',
  currencyCode: 'IDR',
  dueDate: '',
  walletId: '',
  walletGroupId: '',
  splitMethod: 'equal',
  recurrence: 'none',
  ownership: 'SHARED',
  notes: '',
  participants: [defaultParticipant('Me'), defaultParticipant('Partner')],
}

const statusLabel: Record<string, string> = {
  open: 'Open',
  partially_paid: 'Partial',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

function toDateInput(value?: string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function parseApiList(payload: any) {
  return Array.isArray(payload.sharedBills) ? payload.sharedBills : []
}

export default function SharedBillsPage() {
  const { data: session, status } = useSession()
  const { wallets, walletGroups, selectedWallet, selectedGroup, isGroupSelected, refreshGroups } = useWallet()
  const [sharedBills, setSharedBills] = useState<SharedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)

  useEffect(() => {
    if (status === 'unauthenticated') redirect('/auth/signin')
  }, [status])

  const summary = useMemo(() => {
    return sharedBills.reduce(
      (acc, bill) => {
        const paid = bill.participants.reduce((sum, participant) => sum + Number(participant.paidAmount || 0), 0)
        acc.total += bill.totalAmount
        acc.paid += paid
        acc.outstanding += Math.max(0, bill.totalAmount - paid)
        if (bill.status === 'paid') acc.paidCount += 1
        if (bill.status === 'open' || bill.status === 'partially_paid') acc.openCount += 1
        return acc
      },
      { total: 0, paid: 0, outstanding: 0, openCount: 0, paidCount: 0 }
    )
  }, [sharedBills])

  const fetchSharedBills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (isGroupSelected && selectedGroup?.id) params.set('walletGroupId', selectedGroup.id)
      if (!isGroupSelected && selectedWallet?.id) params.set('walletId', selectedWallet.id)

      const response = await fetch(`/api/shared-bills?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load shared bills')
      const payload = await response.json()
      setSharedBills(parseApiList(payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared bills')
    } finally {
      setLoading(false)
    }
  }, [filter, isGroupSelected, selectedGroup?.id, selectedWallet?.id])

  useEffect(() => {
    if (session?.user?.id) {
      fetchSharedBills()
      refreshGroups().catch(() => undefined)
    }
  }, [session?.user?.id, fetchSharedBills, refreshGroups])

  function resetForm() {
    setEditingId(null)
    setForm({
      ...defaultForm,
      walletId: !isGroupSelected && selectedWallet?.id ? selectedWallet.id : '',
      walletGroupId: isGroupSelected && selectedGroup?.id ? selectedGroup.id : '',
    })
    setShowForm(false)
  }

  function openEdit(bill: SharedBill) {
    setEditingId(bill.id)
    setForm({
      title: bill.title,
      description: bill.description || '',
      category: bill.category || 'household',
      totalAmount: String(bill.totalAmount),
      currencyCode: bill.currencyCode || 'IDR',
      dueDate: toDateInput(bill.dueDate),
      walletId: bill.wallet?.id || '',
      walletGroupId: bill.walletGroup?.id || '',
      splitMethod: bill.splitMethod || 'equal',
      recurrence: bill.recurrence || 'none',
      ownership: bill.ownership || 'SHARED',
      notes: bill.notes || '',
      participants: bill.participants.map((participant) => ({
        name: participant.name,
        email: participant.email || '',
        shareAmount: String(participant.shareAmount || ''),
        sharePercent: participant.sharePercent === null || participant.sharePercent === undefined ? '' : String(participant.sharePercent),
        paidAmount: String(participant.paidAmount || 0),
        ownerRole: participant.ownerRole || 'SHARED',
      })),
    })
    setShowForm(true)
  }

  function updateParticipant(index: number, key: keyof FormParticipant, value: string) {
    setForm((current) => ({
      ...current,
      participants: current.participants.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [key]: value } : participant
      ),
    }))
  }

  function buildPayload() {
    return {
      ...form,
      walletId: form.walletId || null,
      walletGroupId: form.walletGroupId || null,
      totalAmount: Number(form.totalAmount || 0),
      participants: form.participants.map((participant) => ({
        name: participant.name,
        email: participant.email || null,
        shareAmount: Number(participant.shareAmount || 0),
        sharePercent: participant.sharePercent === '' ? null : Number(participant.sharePercent),
        paidAmount: Number(participant.paidAmount || 0),
        ownerRole: participant.ownerRole,
      })),
    }
  }

  async function saveSharedBill(event: FormEvent) {
    event.preventDefault()
    try {
      setSaving(true)
      setError(null)
      const response = await fetch(editingId ? `/api/shared-bills/${editingId}` : '/api/shared-bills', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to save shared bill')
      resetForm()
      await fetchSharedBills()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shared bill')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSharedBill(id: string) {
    if (!confirm('Delete this shared bill?')) return
    const response = await fetch(`/api/shared-bills/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload.error || 'Failed to delete shared bill')
      return
    }
    await fetchSharedBills()
  }

  async function settleParticipant(bill: SharedBill, participant: Participant, paidAmount: number) {
    const response = await fetch(`/api/shared-bills/${bill.id}/participants/${participant.id}/settle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paidAmount }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload.error || 'Failed to settle participant')
      return
    }
    await fetchSharedBills()
  }

  if (status === 'loading') {
    return <div className="p-6 text-gray-500">Loading shared bills...</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shared Bills</h1>
          <p className="text-gray-600">Split household bills, track participant payments, and settle balances with real data.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSharedBills} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            <Plus size={16} /> Add Shared Bill
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><Users size={16} /> Total Shared</div>
          <div className="mt-2 text-2xl font-bold">{formatCurrency(summary.total)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><CheckCircle2 size={16} /> Paid</div>
          <div className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(summary.paid)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><WalletCards size={16} /> Outstanding</div>
          <div className="mt-2 text-2xl font-bold text-orange-600">{formatCurrency(summary.outstanding)}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500"><CalendarDays size={16} /> Open Bills</div>
          <div className="mt-2 text-2xl font-bold">{summary.openCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="partially_paid">Partial</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-sm text-gray-500">
          Scoped to {isGroupSelected && selectedGroup ? selectedGroup.name : selectedWallet?.name || 'all wallets'}.
        </span>
      </div>

      {showForm && (
        <form onSubmit={saveSharedBill} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Rent, electricity, internet..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Total Amount</label>
              <input required type="number" min="0" step="0.01" value={form.totalAmount} onChange={(event) => setForm({ ...form, totalAmount: event.target.value })} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Split Method</label>
              <select value={form.splitMethod} onChange={(event) => setForm({ ...form, splitMethod: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                <option value="equal">Equal</option>
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ownership</label>
              <select value={form.ownership} onChange={(event) => setForm({ ...form, ownership: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                <option value="SHARED">Shared</option>
                <option value="HIS">His</option>
                <option value="HERS">Hers</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Wallet</label>
              <select value={form.walletId} onChange={(event) => setForm({ ...form, walletId: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                <option value="">No wallet</option>
                {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Wallet Group</label>
              <select value={form.walletGroupId} onChange={(event) => setForm({ ...form, walletGroupId: event.target.value })} className="w-full rounded-lg border px-3 py-2">
                <option value="">No group</option>
                {walletGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-lg border px-3 py-2" rows={2} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Participants</h3>
              <button type="button" onClick={() => setForm({ ...form, participants: [...form.participants, defaultParticipant()] })} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">Add participant</button>
            </div>
            {form.participants.map((participant, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-6">
                <input value={participant.name} onChange={(event) => updateParticipant(index, 'name', event.target.value)} className="rounded-lg border px-3 py-2" placeholder="Name" />
                <input value={participant.email} onChange={(event) => updateParticipant(index, 'email', event.target.value)} className="rounded-lg border px-3 py-2" placeholder="Email optional" />
                <select value={participant.ownerRole} onChange={(event) => updateParticipant(index, 'ownerRole', event.target.value)} className="rounded-lg border px-3 py-2">
                  <option value="SHARED">Shared</option>
                  <option value="HIS">His</option>
                  <option value="HERS">Hers</option>
                </select>
                <input type="number" step="0.01" value={participant.shareAmount} onChange={(event) => updateParticipant(index, 'shareAmount', event.target.value)} className="rounded-lg border px-3 py-2" placeholder="Fixed share" disabled={form.splitMethod !== 'fixed'} />
                <input type="number" step="0.01" value={participant.sharePercent} onChange={(event) => updateParticipant(index, 'sharePercent', event.target.value)} className="rounded-lg border px-3 py-2" placeholder="% share" disabled={form.splitMethod !== 'percentage'} />
                <div className="flex gap-2">
                  <input type="number" step="0.01" value={participant.paidAmount} onChange={(event) => updateParticipant(index, 'paidAmount', event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder="Paid" />
                  <button type="button" onClick={() => setForm({ ...form, participants: form.participants.filter((_, i) => i !== index) })} className="rounded-lg border px-3 text-red-600 hover:bg-red-50">×</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editingId ? 'Update Shared Bill' : 'Create Shared Bill'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-500">Loading shared bills...</div>
        ) : sharedBills.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-500">No shared bills yet. Add the first household bill.</div>
        ) : (
          sharedBills.map((bill) => {
            const paidAmount = bill.participants.reduce((sum, participant) => sum + Number(participant.paidAmount || 0), 0)
            const outstanding = Math.max(0, bill.totalAmount - paidAmount)
            return (
              <div key={bill.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">{bill.title}</h2>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${bill.status === 'paid' ? 'bg-green-100 text-green-700' : bill.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                        {statusLabel[bill.status] || bill.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {bill.walletGroup?.name || bill.wallet?.name || 'No wallet scope'} • {(bill.ownership || 'SHARED').toLowerCase()} ownership • {bill.splitMethod} split {bill.dueDate ? `• due ${new Date(bill.dueDate).toLocaleDateString()}` : ''}
                    </p>
                    {bill.description && <p className="mt-2 text-sm text-gray-600">{bill.description}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatCurrency(bill.totalAmount)}</div>
                    <div className="text-sm text-gray-500">Outstanding: <span className="font-medium text-orange-600">{formatCurrency(outstanding)}</span></div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2">Participant</th>
                        <th className="py-2">Owner</th>
                        <th className="py-2">Share</th>
                        <th className="py-2">Paid</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.participants.map((participant) => (
                        <tr key={participant.id || participant.name} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">{participant.name}</div>
                            {participant.email && <div className="text-xs text-gray-500">{participant.email}</div>}
                          </td>
                          <td className="py-3">{(participant.ownerRole || 'SHARED').toLowerCase()}</td>
                          <td className="py-3">{formatCurrency(participant.shareAmount)}</td>
                          <td className="py-3">{formatCurrency(participant.paidAmount)}</td>
                          <td className="py-3 capitalize">{participant.status}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => settleParticipant(bill, participant, participant.shareAmount)} className="mr-2 rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50">Mark paid</button>
                            <button onClick={() => settleParticipant(bill, participant, 0)} className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-50">Reset</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => openEdit(bill)} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Edit</button>
                  <button onClick={() => deleteSharedBill(bill.id)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
