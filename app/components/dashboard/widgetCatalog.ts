import type { DashboardWidget, WidgetSize, WidgetType } from './WidgetTypes'

export type WidgetCategory = 'Ringkasan' | 'Pengeluaran' | 'Tabungan & Goal' | 'Tagihan & Rencana' | 'Lainnya'

export type WidgetMeta = {
  type: WidgetType
  title: string
  description: string
  category: WidgetCategory
  defaultSize: WidgetSize
  sizes: WidgetSize[]
  /** Renders its own card + heading, so the frame hides its title outside edit mode. */
  ownChrome?: boolean
  /** Can be added more than once. */
  multi?: boolean
}

export const SIZE_LABEL: Record<WidgetSize, string> = { small: 'S', medium: 'M', large: 'L', full: 'Penuh' }

// Grid: 1 col (mobile), 2 cols (md), 4 cols (lg). Dense packing fills holes.
export const SIZE_CLASS: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 lg:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
  full: 'col-span-1 md:col-span-2 lg:col-span-4',
}

export const WIDGET_CATALOG: WidgetMeta[] = [
  { type: 'summary-stats', title: 'Rasio Keuangan', description: 'Saving rate, rasio pengeluaran, dan kategori terbesar di periode ini.', category: 'Ringkasan', defaultSize: 'medium', sizes: ['medium', 'large', 'full'] },
  { type: 'income-expense-chart', title: 'Tren 6 Bulan', description: 'Pemasukan, pengeluaran, dan yang ditabung per bulan.', category: 'Ringkasan', defaultSize: 'medium', sizes: ['medium', 'large', 'full'] },
  { type: 'quick-actions', title: 'Aksi Cepat', description: 'Tombol cepat: tambah transaksi, import, chatbot.', category: 'Ringkasan', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'safe-to-spend', title: 'Aman Dibelanjakan (detail)', description: 'Rincian kewajiban, reserve, dan buffer.', category: 'Ringkasan', defaultSize: 'medium', sizes: ['medium', 'large'], ownChrome: true },
  { type: 'financial-health', title: 'Skor Kesehatan (detail)', description: 'Rincian skor kesehatan finansial.', category: 'Ringkasan', defaultSize: 'medium', sizes: ['medium', 'large'], ownChrome: true },
  { type: 'cashflow-forecast', title: 'Proyeksi Cashflow', description: 'Perkiraan saldo beberapa bulan ke depan.', category: 'Ringkasan', defaultSize: 'large', sizes: ['large', 'full'], ownChrome: true },
  { type: 'expense-chart', title: 'Distribusi Pengeluaran', description: 'Kategori pengeluaran terbesar di periode ini (tanpa transfer tabungan).', category: 'Pengeluaran', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'transaction-list', title: 'Transaksi Terbaru', description: 'Transaksi terakhir di dompet & periode yang dipilih.', category: 'Pengeluaran', defaultSize: 'large', sizes: ['medium', 'large', 'full'], multi: true },
  { type: 'budget-overview', title: 'Budget', description: 'Pemakaian budget per kategori.', category: 'Pengeluaran', defaultSize: 'medium', sizes: ['medium', 'large', 'full'], multi: true },
  { type: 'budget-forecast', title: 'Proyeksi Budget', description: 'Perkiraan budget habis sebelum akhir periode.', category: 'Pengeluaran', defaultSize: 'medium', sizes: ['medium', 'large'] },
  { type: 'top-spending', title: 'Kategori Terbesar (detail)', description: 'Daftar kategori pengeluaran terbesar.', category: 'Pengeluaran', defaultSize: 'medium', sizes: ['medium', 'large'], ownChrome: true },
  { type: 'emergency-fund', title: 'Dana Darurat & Tabungan', description: 'Progres dana darurat dan saldo tiap dompet tabungan/investasi.', category: 'Tabungan & Goal', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'savings-goals', title: 'Goal Tabungan', description: 'Progres goal tabungan.', category: 'Tabungan & Goal', defaultSize: 'medium', sizes: ['medium', 'large'] },
  { type: 'investment-performance', title: 'Investasi', description: 'Performa portofolio investasi.', category: 'Tabungan & Goal', defaultSize: 'medium', sizes: ['medium', 'large', 'full'] },
  { type: 'debt-payoff-planner', title: 'Rencana Lunasi Utang', description: 'Strategi pelunasan utang/cicilan.', category: 'Tabungan & Goal', defaultSize: 'large', sizes: ['large', 'full'], ownChrome: true },
  { type: 'upcoming-bills', title: 'Tagihan Minggu Ini', description: 'Tagihan yang jatuh tempo minggu ini.', category: 'Tagihan & Rencana', defaultSize: 'medium', sizes: ['medium', 'large'], ownChrome: true },
  { type: 'upcoming-recurring', title: 'Transaksi Berulang', description: 'Transaksi rutin yang akan datang.', category: 'Tagihan & Rencana', defaultSize: 'medium', sizes: ['medium', 'large'] },
  { type: 'subscription-intelligence', title: 'Langganan', description: 'Analisis langganan digital.', category: 'Tagihan & Rencana', defaultSize: 'large', sizes: ['large', 'full'], ownChrome: true },
  { type: 'financial-tips', title: 'Tips Keuangan', description: 'Tips singkat pengelolaan uang.', category: 'Lainnya', defaultSize: 'small', sizes: ['small', 'medium'] },
]

const BY_TYPE = new Map(WIDGET_CATALOG.map((m) => [m.type, m]))

/** Catalog entry, or a permissive fallback for legacy types still in saved layouts. */
export function widgetMeta(type: WidgetType): WidgetMeta {
  return BY_TYPE.get(type) ?? {
    type,
    title: type,
    description: '',
    category: 'Lainnya',
    defaultSize: 'medium',
    sizes: ['small', 'medium', 'large', 'full'],
    ownChrome: ['summary', 'balance'].includes(type),
  }
}

// ---------------------------------------------------------------------------
// Default layout + migration
// ---------------------------------------------------------------------------

export const LAYOUT_VERSION = 2

const newId = (type: string) =>
  `${type}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`

export function makeWidget(type: WidgetType, position: number, size?: WidgetSize): DashboardWidget {
  const meta = widgetMeta(type)
  return { id: newId(type), type, size: size ?? meta.defaultSize, title: meta.title, position }
}

/** Hero already shows totals, so the default grid focuses on what's below it. */
export function defaultWidgets(): DashboardWidget[] {
  return (['expense-chart', 'income-expense-chart', 'transaction-list', 'emergency-fund'] as WidgetType[]).map((t, i) =>
    makeWidget(t, i)
  )
}

// The pre-rework defaults. Their types are replaced by the new default set on
// migration; anything else the user added is kept.
const OLD_DEFAULT_TYPES = new Set<WidgetType>([
  'summary', 'summary-stats', 'quick-actions', 'expense-chart', 'income-expense-chart', 'transaction-list', 'emergency-fund',
])

export function migrateWidgets(old: DashboardWidget[] | null | undefined): DashboardWidget[] {
  const base = defaultWidgets()
  const baseTypes = new Set(base.map((w) => w.type))
  const extras = (old ?? []).filter((w) => w && !OLD_DEFAULT_TYPES.has(w.type) && !baseTypes.has(w.type))
  return normalizeWidgets([...base, ...extras])
}

/** Renumber positions and refresh titles/sizes against the catalog. */
export function normalizeWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  return widgets.map((w, i) => {
    const meta = widgetMeta(w.type)
    const size = meta.sizes.includes(w.size) ? w.size : meta.defaultSize
    return { ...w, size, title: w.title || meta.title, position: i }
  })
}
