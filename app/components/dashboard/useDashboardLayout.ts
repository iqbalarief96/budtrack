'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardWidget } from './WidgetTypes'
import { LAYOUT_VERSION, defaultWidgets, migrateWidgets, normalizeWidgets } from './widgetCatalog'

const CACHE_KEY = 'dashboardLayoutV2'
const LEGACY_KEY = 'ringkasanWidgets'

type StoredLayout = { version: number; widgets: DashboardWidget[]; updatedAt?: string }

/** Accepts v2 layouts and the older shapes (array, or { widgets }). */
function readLayout(raw: unknown): { widgets: DashboardWidget[]; isV2: boolean } | null {
  if (!raw) return null
  if (Array.isArray(raw)) return { widgets: raw as DashboardWidget[], isV2: false }
  const obj = raw as Partial<StoredLayout>
  if (Array.isArray(obj.widgets)) return { widgets: obj.widgets, isV2: obj.version === LAYOUT_VERSION }
  return null
}

function fromCache(): DashboardWidget[] | null {
  try {
    const v2 = readLayout(JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'))
    // An empty v2 layout is a deliberate choice (user hid everything).
    if (v2?.isV2) return normalizeWidgets(v2.widgets)
    const legacy = readLayout(JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'))
    if (legacy) return migrateWidgets(legacy.widgets)
  } catch {
    /* corrupted cache -> ignore */
  }
  return null
}

/**
 * Dashboard widget layout. Source of truth = server (User.dashboardLayout via
 * /api/dashboard/layout) so it follows the user across devices; localStorage
 * is a fast cache. Older layouts are migrated once to the new defaults while
 * keeping widgets the user added themselves.
 */
export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => defaultWidgets())
  const [ready, setReady] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const dirtyRef = useRef(false)

  const persist = useCallback(async (next: DashboardWidget[]) => {
    const layout: StoredLayout = { version: LAYOUT_VERSION, widgets: next, updatedAt: new Date().toISOString() }
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(layout))
    } catch {
      /* storage full / disabled */
    }
    const res = await fetch('/api/dashboard/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout }),
    }).catch(() => null)
    setSaveError(res && res.ok ? null : 'Layout tersimpan di perangkat ini, tapi gagal sinkron ke server.')
  }, [])

  useEffect(() => {
    let cancelled = false
    const cached = fromCache()
    if (cached) setWidgets(cached)

    fetch('/api/dashboard/layout')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || dirtyRef.current) return
        const server = readLayout(data?.layout)
        if (server?.isV2) {
          const next = normalizeWidgets(server.widgets)
          setWidgets(next)
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version: LAYOUT_VERSION, widgets: next })) } catch { /* ignore */ }
        } else if (!cached || !localStorage.getItem(CACHE_KEY)) {
          // First visit after the rework: migrate whatever we have and save it.
          const migrated = cached ?? migrateWidgets(server?.widgets)
          setWidgets(migrated)
          persist(migrated)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true) })

    return () => { cancelled = true }
  }, [persist])

  const save = useCallback((next: DashboardWidget[]) => {
    dirtyRef.current = true
    const normalized = normalizeWidgets(next)
    setWidgets(normalized)
    return persist(normalized)
  }, [persist])

  return { widgets, ready, save, saveError, resetToDefault: () => save(defaultWidgets()) }
}
