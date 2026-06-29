'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Wallet = { id: string; name: string }
type Rule = {
  id: string
  name: string
  pattern: string
  isRegex: boolean
  isActive: boolean
  priority: number
  destinationWalletId: string
  destinationWallet?: Wallet
}

export default function SavingsRulesPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [form, setForm] = useState({ name: '', pattern: '', destinationWalletId: '', priority: 100, isRegex: false })

  const looksLikeRegex = (pattern: string) => /\\b|\||\(|\)|\[|\]|\^|\$|\+|\*|\?/.test(pattern)

  const updatePattern = (pattern: string) => {
    setForm({ ...form, pattern, isRegex: form.isRegex || looksLikeRegex(pattern) })
  }

  const load = async () => {
    const [rulesRes, migrationRes] = await Promise.all([
      fetch('/api/savings/rules'),
      fetch('/api/savings/migrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: true }) })
    ])
    if (rulesRes.ok) setRules((await rulesRes.json()).rules ?? [])
    if (migrationRes.ok) setWallets((await migrationRes.json()).data?.summary?.savingsWallets ?? [])
  }

  useEffect(() => { load() }, [])

  const createRule = async () => {
    const res = await fetch('/api/savings/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) return toast.error(data.error || 'Gagal bikin rule')
    toast.success('Savings rule dibuat')
    setForm({ name: '', pattern: '', destinationWalletId: '', priority: 100, isRegex: false })
    load()
  }

  const toggleRule = async (rule: Rule) => {
    await fetch(`/api/savings/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    load()
  }

  const deleteRule = async (rule: Rule) => {
    await fetch(`/api/savings/rules/${rule.id}`, { method: 'DELETE' })
    toast.success('Savings rule dihapus')
    load()
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-gray-900">⚙️ Auto-rules Tabungan</h3>
      <div className="mb-4 grid gap-2 md:grid-cols-6">
        <input className="rounded border px-3 py-2 text-sm" placeholder="Nama rule" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="md:col-span-2">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Pattern, contoh IWK atau \\b(bandung|bdg)\\b" value={form.pattern} onChange={(e) => updatePattern(e.target.value)} />
          {looksLikeRegex(form.pattern) && !form.isRegex ? <p className="mt-1 text-xs text-amber-600">Pattern ini terlihat seperti regex. Nyalakan Regex.</p> : null}
        </div>
        <select className="rounded border px-3 py-2 text-sm" value={form.destinationWalletId} onChange={(e) => setForm({ ...form, destinationWalletId: e.target.value })}>
          <option value="">Pilih wallet</option>
          {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
        </select>
        <div className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
          <input id="savings-rule-regex" type="checkbox" checked={form.isRegex} onChange={(e) => setForm({ ...form, isRegex: e.target.checked })} />
          <label htmlFor="savings-rule-regex" className="select-none">Regex</label>
        </div>
        <input className="rounded border px-3 py-2 text-sm" type="number" aria-label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
        <button onClick={createRule} disabled={!form.name || !form.pattern || !form.destinationWalletId} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">Tambah Rule</button>
      </div>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{rule.name} → {rule.destinationWallet?.name || rule.destinationWalletId}</div>
              <div className="text-gray-500">Pattern: {rule.pattern} • Regex {rule.isRegex ? 'ON' : 'OFF'} • Priority {rule.priority} • {rule.isActive ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleRule(rule)} className="rounded bg-gray-100 px-2 py-1">{rule.isActive ? 'Disable' : 'Enable'}</button>
              <button onClick={() => deleteRule(rule)} className="rounded bg-red-100 px-2 py-1 text-red-700">Delete</button>
            </div>
          </div>
        ))}
        {!rules.length ? <p className="text-sm text-gray-500">Belum ada rule.</p> : null}
      </div>
    </div>
  )
}
