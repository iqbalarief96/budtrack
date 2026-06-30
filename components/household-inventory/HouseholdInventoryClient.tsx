'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarcodeScanner } from './BarcodeScanner'
import { ScanResultSheet } from './ScanResultSheet'
import { isGenericProductName } from './display'
import type { HouseholdCategory, HouseholdItem, HouseholdLocation, ScanDraft, ShoppingAutoItem } from './types'
import { HOUSEHOLD_UNITS } from '@/lib/household-inventory/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const emptyForm = {
  name: '',
  barcode: '',
  quantity: '0',
  unit: 'pcs',
  minimumQuantity: '1',
  expiredAt: '',
  notes: '',
  categoryId: '',
  locationId: ''
}

type Tab = 'summary' | 'items' | 'opname' | 'scan' | 'shopping'

export function HouseholdInventoryClient() {
  const [tab, setTab] = useState<Tab>('summary')
  const [items, setItems] = useState<HouseholdItem[]>([])
  const [categories, setCategories] = useState<HouseholdCategory[]>([])
  const [locations, setLocations] = useState<HouseholdLocation[]>([])
  const [shopping, setShopping] = useState<ShoppingAutoItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [opname, setOpname] = useState<Record<string, string>>({})
  const [scanDraft, setScanDraft] = useState<ScanDraft | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { void loadAll() }, [])

  const summary = useMemo(() => ({
    total: items.length,
    aman: items.filter(item => item.status === 'AMAN').length,
    menipis: items.filter(item => item.status === 'MENIPIS').length,
    habis: items.filter(item => item.status === 'HABIS').length,
    expired: items.filter(item => item.status === 'EXPIRED' || item.status === 'MAU_EXPIRED').length
  }), [items])

  async function loadAll() {
    setLoading(true)
    try {
      const [itemsRes, categoriesRes, locationsRes, shoppingRes] = await Promise.all([
        fetch('/api/household-inventory/items'),
        fetch('/api/household-inventory/categories'),
        fetch('/api/household-inventory/locations'),
        fetch('/api/household-inventory/shopping-list')
      ])
      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.items || [])
        setOpname(Object.fromEntries((data.items || []).map((item: HouseholdItem) => [item.id, String(item.quantity)])))
      }
      if (categoriesRes.ok) setCategories((await categoriesRes.json()).categories || [])
      if (locationsRes.ok) setLocations((await locationsRes.json()).locations || [])
      if (shoppingRes.ok) setShopping((await shoppingRes.json()).autoItems || [])
    } finally {
      setLoading(false)
    }
  }

  async function createDefaults() {
    await Promise.all([
      fetch('/api/household-inventory/categories/defaults', { method: 'POST' }),
      fetch('/api/household-inventory/locations/defaults', { method: 'POST' })
    ])
    setMessage('Kategori dan lokasi default dibuat.')
    await loadAll()
  }

  async function saveItem() {
    if (!form.name.trim()) return setMessage('Nama barang wajib diisi.')
    const res = await fetch('/api/household-inventory/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        barcode: form.barcode || null,
        quantity: Number(form.quantity || 0),
        unit: form.unit,
        minimumQuantity: Number(form.minimumQuantity || 0),
        expiredAt: form.expiredAt ? new Date(form.expiredAt).toISOString() : null,
        notes: form.notes || null,
        categoryId: form.categoryId || null,
        locationId: form.locationId || null
      })
    })
    if (!res.ok) return setMessage((await res.json()).error || 'Gagal simpan barang.')
    setForm(emptyForm)
    setMessage('Barang disimpan.')
    await loadAll()
  }

  async function adjustItem(item: HouseholdItem, mode: 'ADD' | 'SUBTRACT') {
    const raw = prompt(`${mode === 'ADD' ? 'Tambah' : 'Kurangi'} stok ${item.name}`, '1')
    if (!raw) return
    const quantity = Number(raw)
    if (!Number.isFinite(quantity) || quantity <= 0) return
    await fetch(`/api/household-inventory/items/${item.id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, quantity, reason: mode === 'ADD' ? 'RESTOCK' : 'USED' })
    })
    await loadAll()
  }

  async function saveOpname() {
    const updates = items.map(item => ({ itemId: item.id, quantity: Number(opname[item.id] ?? item.quantity) }))
    const res = await fetch('/api/household-inventory/opname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    })
    if (!res.ok) return setMessage('Gagal simpan opname.')
    const data = await res.json()
    setMessage(`Opname tersimpan. ${data.changedCount} item berubah.`)
    await loadAll()
  }

  async function lookupBarcode(barcode: string) {
    const res = await fetch('/api/household-inventory/barcode/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode })
    })
    if (!res.ok) return setMessage('Barcode gagal dicek.')
    const data = await res.json()
    if (data.status === 'ITEM_FOUND') {
      setMessage(`Barcode ketemu: ${data.item.name}`)
      setTab('items')
      return
    }

    const template = data.template
    const name = template?.name || ''
    setScanDraft({
      barcode,
      name,
      brand: template?.brand || null,
      unit: template?.defaultUnit || 'pcs',
      source: template?.source,
      confidence: name && !isGenericProductName(name) ? 'high' : 'low'
    })
    setMessage(template ? 'Produk ditemukan. Konfirmasi qty dan lokasi.' : 'Barcode belum dikenal. Isi nama barang dulu.')
  }

  async function saveScanDraft(payload: { name: string; barcode: string; quantity: number; unit: string; locationId?: string | null; categoryId?: string | null }) {
    const res = await fetch('/api/household-inventory/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        barcode: payload.barcode,
        quantity: payload.quantity,
        unit: payload.unit,
        minimumQuantity: 1,
        categoryId: payload.categoryId || null,
        locationId: payload.locationId || null
      })
    })
    if (!res.ok) return setMessage((await res.json()).error || 'Gagal simpan hasil scan.')
    setScanDraft(null)
    setMessage('Barang hasil scan disimpan.')
    setTab('items')
    await loadAll()
  }

  async function restockShopping(item: ShoppingAutoItem) {
    const qty = prompt(`Jumlah dibeli untuk ${item.name}`, String(item.suggestedQuantity))
    if (!qty) return
    const boughtQuantity = Number(qty)
    if (!Number.isFinite(boughtQuantity) || boughtQuantity <= 0) return
    await fetch('/api/household-inventory/shopping-list/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ itemId: item.itemId, boughtQuantity }] })
    })
    await loadAll()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Rumah</h1>
          <p className="text-sm text-gray-600">Stock opname barang rumah, barcode HP, expired, dan daftar belanja.</p>
        </div>
        <Button onClick={createDefaults} variant="outline">Buat kategori/lokasi default</Button>
      </div>

      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ['summary', 'Ringkasan'], ['items', 'Barang'], ['opname', 'Opname'], ['scan', 'Scan'], ['shopping', 'Belanja']
        ].map(([key, label]) => (
          <Button key={key} variant={tab === key ? 'default' : 'outline'} onClick={() => setTab(key as Tab)}>{label}</Button>
        ))}
      </div>

      {tab === 'summary' && (
        <section className="grid gap-4 sm:grid-cols-5">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Aman" value={summary.aman} />
          <SummaryCard label="Menipis" value={summary.menipis} />
          <SummaryCard label="Habis" value={summary.habis} />
          <SummaryCard label="Expired" value={summary.expired} />
        </section>
      )}

      {tab === 'items' && (
        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Tambah Barang</h2>
            <Field label="Nama"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Barcode"><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qty"><Input type="number" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></Field>
              <Field label="Unit"><UnitSelect value={form.unit} onChange={unit => setForm({ ...form, unit })} /></Field>
            </div>
            <Field label="Minimum"><Input type="number" step="0.01" value={form.minimumQuantity} onChange={e => setForm({ ...form, minimumQuantity: e.target.value })} /></Field>
            <Field label="Kategori"><NativeSelect value={form.categoryId} onChange={categoryId => setForm({ ...form, categoryId })} options={categories} /></Field>
            <Field label="Lokasi"><NativeSelect value={form.locationId} onChange={locationId => setForm({ ...form, locationId })} options={locations} /></Field>
            <Field label="Expired"><Input type="date" value={form.expiredAt} onChange={e => setForm({ ...form, expiredAt: e.target.value })} /></Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
            <Button className="w-full" onClick={saveItem}>Simpan Barang</Button>
          </div>
          <ItemList items={items} onAdd={item => adjustItem(item, 'ADD')} onSubtract={item => adjustItem(item, 'SUBTRACT')} loading={loading} />
        </section>
      )}

      {tab === 'opname' && (
        <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Mode Opname Cepat</h2>
          {items.map(item => (
            <div key={item.id} className="grid grid-cols-[1fr_120px] items-center gap-3 border-b py-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">Lama: {item.quantity} {item.unit}</p>
              </div>
              <Input type="number" step="0.01" value={opname[item.id] ?? ''} onChange={e => setOpname({ ...opname, [item.id]: e.target.value })} />
            </div>
          ))}
          <Button onClick={saveOpname}>Simpan Opname</Button>
        </section>
      )}

      {tab === 'scan' && <BarcodeScanner onDetected={lookupBarcode} />}

      {scanDraft && (
        <ScanResultSheet
          draft={scanDraft}
          locations={locations}
          categories={categories}
          onCancel={() => setScanDraft(null)}
          onSave={saveScanDraft}
        />
      )}

      {tab === 'shopping' && (
        <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Perlu Dibeli</h2>
          {shopping.length === 0 && <p className="text-sm text-gray-600">Belum ada item menipis/habis.</p>}
          {shopping.map(item => (
            <div key={item.itemId} className="flex items-center justify-between gap-3 border-b py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">Stok {item.quantity} / min {item.minimumQuantity} {item.unit}</p>
              </div>
              <Button size="sm" onClick={() => restockShopping(item)}>Restock</Button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-sm text-gray-600">{label}</p><p className="text-2xl font-bold">{value}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>
}

function UnitSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Input list="household-units" value={value} onChange={e => onChange(e.target.value)} />
}

function NativeSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }> }) {
  return (
    <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">-</option>
      {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  )
}

function ItemList({ items, onAdd, onSubtract, loading }: { items: HouseholdItem[]; onAdd: (item: HouseholdItem) => void; onSubtract: (item: HouseholdItem) => void; loading: boolean }) {
  return (
    <div className="space-y-3">
      <datalist id="household-units">{HOUSEHOLD_UNITS.map(unit => <option key={unit} value={unit} />)}</datalist>
      {loading && <p className="text-sm text-gray-600">Loading...</p>}
      {items.map(item => (
        <div key={item.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.quantity} {item.unit} • min {item.minimumQuantity}</p>
              <p className="text-xs text-gray-500">{item.category?.name || 'Tanpa kategori'} • {item.location?.name || 'Tanpa lokasi'}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => onAdd(item)}>+ Stok</Button>
            <Button size="sm" variant="outline" onClick={() => onSubtract(item)}>- Stok</Button>
          </div>
        </div>
      ))}
      {!loading && items.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-gray-600">Belum ada barang. Tambah barang pertama atau scan barcode.</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'AMAN' ? 'bg-green-100 text-green-700' : status === 'MENIPIS' || status === 'MAU_EXPIRED' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{status}</span>
}
