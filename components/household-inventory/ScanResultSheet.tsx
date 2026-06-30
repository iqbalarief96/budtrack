'use client'

import { useState } from 'react'
import type { HouseholdCategory, HouseholdLocation, ScanDraft } from './types'
import { shortProductName, displayBarcode } from './display'
import { HOUSEHOLD_UNITS } from '@/lib/household-inventory/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ScanResultSheetProps {
  draft: ScanDraft
  locations: HouseholdLocation[]
  categories: HouseholdCategory[]
  onCancel: () => void
  onSave: (payload: {
    name: string
    barcode: string
    quantity: number
    unit: string
    locationId?: string | null
    categoryId?: string | null
  }) => Promise<void>
}

export function ScanResultSheet({ draft, locations, categories, onCancel, onSave }: ScanResultSheetProps) {
  const [name, setName] = useState(draft.name)
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState(draft.unit || 'pcs')
  const [locationId, setLocationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  const title = shortProductName(name) || name || 'Produk belum dikenal'

  async function save() {
    if (!name.trim()) return
    const parsedQuantity = Number(quantity || 0)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        barcode: draft.barcode,
        quantity: parsedQuantity,
        unit: unit.trim() || 'pcs',
        locationId: locationId || null,
        categoryId: categoryId || null
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gray-300 sm:hidden" />
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Hasil scan</p>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{displayBarcode(draft.barcode)}{draft.brand ? ` · ${draft.brand}` : ''}</p>
          {draft.confidence === 'low' && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Nama produk kurang yakin. Edit dulu kalau salah.</p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Nama">
            <Input value={name} onChange={event => setName(event.target.value)} placeholder="Nama barang" />
          </Field>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Qty">
              <div className="flex rounded-md border border-gray-300">
                <button type="button" className="px-3 text-lg" onClick={() => setQuantity(String(Math.max(1, Number(quantity || 1) - 1)))}>-</button>
                <Input className="border-0 text-center" type="number" step="0.01" value={quantity} onChange={event => setQuantity(event.target.value)} />
                <button type="button" className="px-3 text-lg" onClick={() => setQuantity(String(Number(quantity || 0) + 1))}>+</button>
              </div>
            </Field>
            <Field label="Unit">
              <Input list="scan-units" value={unit} onChange={event => setUnit(event.target.value)} />
            </Field>
          </div>

          <Field label="Lokasi">
            <NativeSelect value={locationId} onChange={setLocationId} options={locations} />
          </Field>
          <Field label="Kategori opsional">
            <NativeSelect value={categoryId} onChange={setCategoryId} options={categories} />
          </Field>
        </div>

        <datalist id="scan-units">{HOUSEHOLD_UNITS.map(unitValue => <option key={unitValue} value={unitValue} />)}</datalist>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="button" onClick={save} disabled={saving || !name.trim()}>{saving ? 'Menyimpan...' : 'Simpan Barang'}</Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>
}

function NativeSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ id: string; name: string }> }) {
  return (
    <select className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" value={value} onChange={event => onChange(event.target.value)}>
      <option value="">-</option>
      {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  )
}
