'use client'

import React, { useState } from 'react'
import { FiPlus, FiRotateCcw, FiSliders } from 'react-icons/fi'
import WidgetGrid from './WidgetGrid'
import AddWidgetDialog from './AddWidgetDialog'
import { useDashboardLayout } from './useDashboardLayout'
import { makeWidget } from './widgetCatalog'
import type { DashboardWidget } from './WidgetTypes'

/**
 * Customizable widget area. Edits happen on a draft: "Simpan" persists it,
 * "Batal" throws it away (the old editor kept unsaved changes on screen).
 */
export default function DashboardWidgets({ selectedWalletId }: { selectedWalletId?: string }) {
  const { widgets, save, saveError, resetToDefault } = useDashboardLayout()
  const [draft, setDraft] = useState<DashboardWidget[] | null>(null)
  const [adding, setAdding] = useState(false)
  const editing = draft !== null
  const shown = draft ?? widgets
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(widgets)

  const finish = async () => {
    if (draft && dirty) await save(draft)
    setDraft(null)
  }
  const btn = 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!editing ? (
          <button type="button" onClick={() => setDraft(widgets)} className={`${btn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
            <FiSliders /> Atur widget
          </button>
        ) : (
          <>
            <span className="mr-auto text-xs text-gray-500">Geser, ubah ukuran, atau sembunyikan widget. Perubahan baru kesimpen setelah klik Simpan.</span>
            <button type="button" onClick={() => setAdding(true)} className={`${btn} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}>
              <FiPlus /> Tambah
            </button>
            <button
              type="button"
              onClick={() => { if (window.confirm('Kembalikan widget ke susunan default?')) { resetToDefault(); setDraft(null) } }}
              className={`${btn} text-gray-600 hover:bg-gray-100`}
            >
              <FiRotateCcw /> Reset
            </button>
            <button type="button" onClick={() => setDraft(null)} className={`${btn} text-gray-600 hover:bg-gray-100`}>Batal</button>
            <button type="button" onClick={finish} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
              {dirty ? 'Simpan' : 'Selesai'}
            </button>
          </>
        )}
      </div>
      {saveError && <p className="text-xs text-amber-700">{saveError}</p>}

      {shown.length ? (
        <WidgetGrid widgets={shown} editing={editing} selectedWalletId={selectedWalletId} onChange={setDraft} />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Belum ada widget.{' '}
          <button type="button" className="font-medium text-blue-600 hover:underline" onClick={() => { setDraft(widgets); setAdding(true) }}>
            Tambah widget
          </button>
        </div>
      )}

      <AddWidgetDialog
        open={adding}
        onOpenChange={setAdding}
        existingTypes={new Set(shown.map((w) => w.type))}
        onAdd={(type) => {
          const base = draft ?? widgets
          setDraft([...base, makeWidget(type, base.length)])
          setAdding(false)
        }}
      />
    </div>
  )
}
