'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { WidgetType } from './WidgetTypes'
import { WIDGET_CATALOG, type WidgetCategory } from './widgetCatalog'

const CATEGORY_ORDER: WidgetCategory[] = ['Ringkasan', 'Pengeluaran', 'Tabungan & Goal', 'Tagihan & Rencana', 'Lainnya']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingTypes: Set<WidgetType>
  onAdd: (type: WidgetType) => void
}

export default function AddWidgetDialog({ open, onOpenChange, existingTypes, onAdd }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {CATEGORY_ORDER.map((cat) => {
            const items = WIDGET_CATALOG.filter((w) => w.category === cat)
            if (!items.length) return null
            return (
              <section key={cat}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{cat}</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((w) => {
                    const added = existingTypes.has(w.type) && !w.multi
                    return (
                      <button
                        key={w.type}
                        type="button"
                        disabled={added}
                        onClick={() => onAdd(w.type)}
                        className="rounded-lg border border-gray-200 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-transparent"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900">{w.title}</span>
                          {added && <span className="text-[11px] text-gray-500">Sudah ada</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-600">{w.description}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
