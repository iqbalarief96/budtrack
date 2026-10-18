'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import ReactMarkdown from 'react-markdown'
import {
  Activity,
  Heart,
  Scale,
  Flame,
  Upload,
  Sparkles,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Minus,
  Droplets,
  Dumbbell,
  ShieldAlert,
  Zap,
  Target,
  UserCheck,
  Award,
  Bone,
  Layers,
  Moon,
  Footprints,
  Route,
  Mountain,
  Users,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface HealthRecord {
  id: string
  date: string
  walletId: string | null
  wallet: { id: string; name: string } | null
  weight: number | null
  bmi: number | null
  bodyFat: number | null
  bodyWater: number | null
  skeletalMuscle: number | null
  boneMass: number | null
  protein: number | null
  muscleRate: number | null
  visceralFat: number | null
  subcutaneousFat: number | null
  leanBodyMass: number | null
  bmr: number | null
  bodyAge: number | null
  bodyScore: number | null
  steps: number | null
  activeCalories: number | null
  restingHeartRate: number | null
  sleepHours: number | null
  walkingDistance: number | null
  flightsClimbed: number | null
  source: string
}

interface WalletOption {
  id: string
  name: string
}

// Format angka bersih
function fmt(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined) return '-'
  return Number(val.toFixed(decimals)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

// Status badge helper
function getBadge(name: string, val: number | null): { text: string; color: string } | null {
  if (val === null || val === undefined) return null

  const g = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  const w = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
  const d = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
  const i = 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'

  switch (name) {
    case 'bodyFat': return val > 22 ? { text: 'Tinggi', color: w } : val < 10 ? { text: 'Rendah', color: i } : { text: 'Standar', color: g }
    case 'bmi': return val >= 25 ? { text: 'Tinggi', color: w } : val < 18.5 ? { text: 'Rendah', color: i } : { text: 'Normal', color: g }
    case 'visceralFat': return val >= 10 ? { text: 'Waspada', color: d } : { text: 'Aman', color: g }
    case 'bmr': return val >= 1500 ? { text: 'Baik', color: g } : { text: 'Standar', color: i }
    case 'boneMass': return val < 4.2 ? { text: 'Rendah', color: i } : { text: 'Standar', color: g }
    case 'bodyWater': return val < 50 ? { text: 'Rendah', color: w } : { text: 'Standar', color: g }
    default: return { text: 'Standar', color: g }
  }
}

// Delta badge
function Delta({ val, unit = '', inverse = false }: { val: number | null | undefined; unit?: string; inverse?: boolean }) {
  if (val === null || val === undefined || val === 0) return null
  const pos = val > 0
  const good = inverse ? !pos : pos
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${good ? 'text-emerald-500' : 'text-amber-500'}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? '+' : ''}{fmt(val, 1)}{unit}
    </span>
  )
}

// Metric card component
function MetricCard({ icon, label, value, unit, badge, delta, deltaUnit, deltaInverse, sub }: {
  icon: React.ReactNode; label: string; value: string; unit?: string; badge?: { text: string; color: string } | null
  delta?: number | null; deltaUnit?: string; deltaInverse?: boolean; sub?: string
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          {icon} {label}
        </span>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div>
        <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>}
      </div>
      <div className="flex items-center gap-2">
        {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
        <Delta val={delta} unit={deltaUnit} inverse={deltaInverse} />
      </div>
    </div>
  )
}

export default function HealthDashboardPage() {
  const [metrics, setMetrics] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisText, setAnalysisText] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [wallets, setWallets] = useState<WalletOption[]>([])
  const [hasUnlinkedData, setHasUnlinkedData] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string>('')

  const fetchHealthData = async (walletFilter?: string) => {
    setLoading(true)
    try {
      const w = walletFilter ?? selectedWallet
      const params = new URLSearchParams({ limit: '60' })
      if (w) params.set('wallet', w)
      const res = await fetch(`/api/health?${params.toString()}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        const sorted = [...json.data].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setMetrics(sorted)
        if (json.wallets) setWallets(json.wallets)
        if (json.hasUnlinkedData !== undefined) setHasUnlinkedData(json.hasUnlinkedData)
      } else {
        toast.error('Gagal memuat data kesehatan')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHealthData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWalletChange = (val: string) => { setSelectedWallet(val); fetchHealthData(val) }

  const runAiAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/health/ai-correlation', { method: 'POST' })
      const json = await res.json()
      if (json.success && json.analysis) { setAnalysisText(json.analysis); toast.success(`Analisis AI berhasil (${json.provider})`) }
      else toast.error(json.error || 'Gagal memproses analisis AI')
    } catch (err: any) { toast.error('Koneksi AI gagal: ' + err.message) }
    finally { setAnalyzing(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    if (selectedWallet) formData.append('wallet', selectedWallet)
    const toastId = toast.loading('Membaca metrik timbangan via AI Vision...')
    try {
      const res = await fetch('/api/health/scan-report', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success) { toast.success(json.message || 'Metrik timbangan berhasil dicatat!', { id: toastId }); fetchHealthData() }
      else toast.error(json.error || 'Gagal membaca laporan', { id: toastId })
    } catch (err: any) { toast.error('Gagal upload gambar: ' + err.message, { id: toastId }) }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  // Latest & previous
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null
  const prev = metrics.length > 1 ? metrics[metrics.length - 2] : null

  function d(key: keyof HealthRecord): number | null {
    const c = latest?.[key]; const p = prev?.[key]
    if (typeof c === 'number' && typeof p === 'number') return Number((c - p).toFixed(2))
    return null
  }

  // Chart data
  const labels = metrics.map((m) => new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }))

  const compositionChart = {
    data: {
      labels,
      datasets: [
        { label: 'Berat (kg)', data: metrics.map((m) => m.weight), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.06)', yAxisID: 'yW', tension: 0.3, fill: true, pointRadius: 3 },
        { label: 'Body Fat (%)', data: metrics.map((m) => m.bodyFat), borderColor: '#f59e0b', backgroundColor: 'transparent', yAxisID: 'yP', borderDash: [5, 4], tension: 0.3, pointRadius: 3 },
        { label: 'Otot (%)', data: metrics.map((m) => m.muscleRate), borderColor: '#10b981', backgroundColor: 'transparent', yAxisID: 'yP', tension: 0.3, pointRadius: 3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } } } },
      scales: {
        yW: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'kg', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        yP: { type: 'linear' as const, position: 'right' as const, title: { display: true, text: '%', font: { size: 11 } }, grid: { drawOnChartArea: false }, suggestedMin: 10, suggestedMax: 80 },
      },
    },
  }

  const activityChart = {
    data: {
      labels,
      datasets: [
        { type: 'bar' as const, label: 'Langkah', data: metrics.map((m) => m.steps || 0), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, yAxisID: 'yS', barThickness: 16 },
        { type: 'line' as const, label: 'Detak Jantung (bpm)', data: metrics.map((m) => m.restingHeartRate || null), borderColor: '#ef4444', borderWidth: 2, tension: 0.3, yAxisID: 'yH', pointRadius: 3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } } } },
      scales: {
        yS: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'Langkah', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        yH: { type: 'linear' as const, position: 'right' as const, title: { display: true, text: 'bpm', font: { size: 11 } }, grid: { drawOnChartArea: false }, suggestedMin: 40, suggestedMax: 100 },
      },
    },
  }

  const wellnessChart = {
    data: {
      labels,
      datasets: [
        { label: 'Tidur (jam)', data: metrics.map((m) => m.sleepHours), borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.06)', yAxisID: 'yL', tension: 0.3, fill: true, pointRadius: 3 },
        { label: 'Kalori Aktif (kcal)', data: metrics.map((m) => m.activeCalories), borderColor: '#f97316', backgroundColor: 'transparent', yAxisID: 'yR', tension: 0.3, pointRadius: 3 },
        { label: 'Jarak (km)', data: metrics.map((m) => m.walkingDistance), borderColor: '#3b82f6', backgroundColor: 'transparent', yAxisID: 'yL', borderDash: [5, 4], tension: 0.3, pointRadius: 3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } } } },
      scales: {
        yL: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'Jam / km', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        yR: { type: 'linear' as const, position: 'right' as const, title: { display: true, text: 'kcal', font: { size: 11 } }, grid: { drawOnChartArea: false }, suggestedMin: 0 },
      },
    },
  }

  const exportHealthCSV = () => {
    if (metrics.length === 0) return toast.error('Tidak ada data kesehatan untuk diekspor')
    const headers = ['Tanggal', 'Berat(kg)', 'BMI', 'Lemak(%)', 'Air(%)', 'Otot(%)', 'OtotRangka(%)', 'Visceral', 'Subkutan(kg)', 'LeanMass(kg)', 'BMR', 'BodyAge', 'BodyScore', 'Langkah', 'KaloriAktif', 'DetakJantung', 'Tidur(jam)', 'Jarak(km)', 'Tangga', 'Wallet', 'Source']
    const rows = metrics.map((m) => [
      new Date(m.date).toISOString().slice(0, 10),
      m.weight ?? '', m.bmi ?? '', m.bodyFat ?? '', m.bodyWater ?? '', m.muscleRate ?? '', m.skeletalMuscle ?? '',
      m.visceralFat ?? '', m.subcutaneousFat ?? '', m.leanBodyMass ?? '', m.bmr ?? '', m.bodyAge ?? '', m.bodyScore ?? '',
      m.steps ?? '', m.activeCalories ?? '', m.restingHeartRate ?? '', m.sleepHours ?? '', m.walkingDistance ?? '', m.flightsClimbed ?? '',
      m.wallet?.name ?? '', m.source
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budtrack-health-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data kesehatan berhasil diekspor ke CSV')
  }

  // Weight management
  const cw = latest?.weight || 0
  const stdW = cw > 0 ? Number((cw * 0.933).toFixed(1)) : 0
  const wCtrl = cw > 0 ? Number((stdW - cw).toFixed(1)) : 0
  const fCtrl = latest?.bodyFat ? -Number(((latest.bodyFat - 15) * 0.6).toFixed(1)) : 0

  const walletLabel = selectedWallet ? wallets.find((w) => w.name.toLowerCase() === selectedWallet.toLowerCase())?.name || selectedWallet : null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-blue-500 w-7 h-7" />
            Kesehatan & Komposisi Tubuh
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Smart scale BIA · Huawei Fit 4 · Apple Health
            {walletLabel && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">{walletLabel}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(wallets.length > 0 || hasUnlinkedData) && (
            <select value={selectedWallet} onChange={(e) => handleWalletChange(e.target.value)}
              className="pl-3 pr-8 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">Semua</option>
              {wallets.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
              {hasUnlinkedData && <option value="_unlinked">Tanpa Wallet</option>}
            </select>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer disabled:opacity-50">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Memproses...' : 'Upload Laporan'}
          </button>
          <button onClick={exportHealthCSV} disabled={loading || metrics.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition cursor-pointer disabled:opacity-50"
            title="Ekspor CSV">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button onClick={() => fetchHealthData()} disabled={loading}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 transition cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── HERO CARD ── */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Body Score */}
          <div className="col-span-2 md:col-span-1 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <div className="text-center">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{latest.bodyScore || '-'}</span>
                <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400">Skor</p>
              </div>
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-gray-400">Terakhir diukur</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {new Date(latest.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-gray-400">{latest.source} {latest.wallet ? `· ${latest.wallet.name}` : ''}</p>
            </div>
          </div>

          {/* Berat */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <p className="text-xs text-gray-400 mb-1">Berat Badan</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(latest.weight)} <span className="text-sm font-medium text-gray-400">kg</span></p>
            <Delta val={d('weight')} unit=" kg" inverse />
          </div>

          {/* Body Fat */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <p className="text-xs text-gray-400 mb-1">Lemak Tubuh</p>
            <p className="text-2xl font-black text-amber-500">{fmt(latest.bodyFat)}<span className="text-sm font-medium text-amber-400">%</span></p>
            <Delta val={d('bodyFat')} unit="%" inverse />
          </div>

          {/* Body Age */}
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <p className="text-xs text-gray-400 mb-1">Usia Metabolik</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{latest.bodyAge || '-'} <span className="text-sm font-medium text-gray-400">tahun</span></p>
            <Delta val={d('bodyAge')} inverse />
          </div>
        </div>
      )}

      {/* ── KOMPOSISI TUBUH ── */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" /> Komposisi Tubuh (BIA)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricCard icon={<Scale className="w-3.5 h-3.5 text-blue-500" />} label="BMI" value={fmt(latest?.bmi)} badge={getBadge('bmi', latest?.bmi ?? null)} delta={d('bmi')} deltaInverse sub="Normal: 18.5 – 24.9" />
          <MetricCard icon={<Droplets className="w-3.5 h-3.5 text-cyan-500" />} label="Air Tubuh" value={fmt(latest?.bodyWater)} unit="%" badge={getBadge('bodyWater', latest?.bodyWater ?? null)} delta={d('bodyWater')} deltaUnit="%" sub="Standar: 50 – 65%" />
          <MetricCard icon={<Dumbbell className="w-3.5 h-3.5 text-emerald-500" />} label="Otot Total" value={fmt(latest?.muscleRate)} unit="%" delta={d('muscleRate')} deltaUnit="%" sub="Standar: > 70%" />
          <MetricCard icon={<Dumbbell className="w-3.5 h-3.5 text-emerald-500" />} label="Otot Rangka" value={fmt(latest?.skeletalMuscle)} unit="%" delta={d('skeletalMuscle')} deltaUnit="%" sub="Skeletal Muscle" />
          <MetricCard icon={<ShieldAlert className="w-3.5 h-3.5 text-purple-500" />} label="Lemak Visceral" value={latest?.visceralFat != null ? `Lv. ${latest.visceralFat}` : '-'} badge={getBadge('visceralFat', latest?.visceralFat ?? null)} delta={d('visceralFat')} deltaInverse sub="Aman: 1 – 9" />
          <MetricCard icon={<Layers className="w-3.5 h-3.5 text-amber-500" />} label="Lemak Subkutan" value={fmt(latest?.subcutaneousFat)} unit="kg" delta={d('subcutaneousFat')} deltaUnit=" kg" deltaInverse sub="Di bawah kulit" />
          <MetricCard icon={<UserCheck className="w-3.5 h-3.5 text-blue-500" />} label="Lean Mass" value={fmt(latest?.leanBodyMass)} unit="kg" delta={d('leanBodyMass')} deltaUnit=" kg" sub="Massa tanpa lemak" />
          <MetricCard icon={<Zap className="w-3.5 h-3.5 text-amber-500" />} label="BMR" value={latest?.bmr ? `${latest.bmr.toLocaleString('id-ID')}` : '-'} unit="kcal" badge={getBadge('bmr', latest?.bmr ?? null)} delta={d('bmr')} deltaUnit=" kcal" sub="Metabolisme basal" />
          <MetricCard icon={<Award className="w-3.5 h-3.5 text-emerald-500" />} label="Protein" value={fmt(latest?.protein)} unit="%" delta={d('protein')} deltaUnit="%" sub="Kadar protein" />
          <MetricCard icon={<Bone className="w-3.5 h-3.5 text-gray-400" />} label="Massa Tulang" value={fmt(latest?.boneMass)} unit="%" badge={getBadge('boneMass', latest?.boneMass ?? null)} delta={d('boneMass')} deltaUnit="%" sub="Mineral tulang" />
        </div>
      </section>

      {/* ── AKTIVITAS HARIAN ── */}
      <section>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" /> Aktivitas Harian (Huawei Fit 4)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={<Footprints className="w-3.5 h-3.5 text-emerald-500" />} label="Langkah" value={latest?.steps ? latest.steps.toLocaleString('id-ID') : '-'} delta={d('steps')} sub="Target: 8.000/hari" />
          <MetricCard icon={<Flame className="w-3.5 h-3.5 text-orange-500" />} label="Kalori Aktif" value={fmt(latest?.activeCalories, 0)} unit="kcal" delta={d('activeCalories')} deltaUnit=" kcal" sub="Active Energy" />
          <MetricCard icon={<Heart className="w-3.5 h-3.5 text-rose-500" />} label="Detak Jantung" value={latest?.restingHeartRate != null ? `${latest.restingHeartRate}` : '-'} unit="bpm" delta={d('restingHeartRate')} deltaInverse sub="Resting HR" />
          <MetricCard icon={<Moon className="w-3.5 h-3.5 text-indigo-500" />} label="Tidur" value={fmt(latest?.sleepHours)} unit="jam" delta={d('sleepHours')} deltaUnit=" jam" sub="Target: 7 – 8 jam" />
          <MetricCard icon={<Route className="w-3.5 h-3.5 text-blue-500" />} label="Jarak Tempuh" value={fmt(latest?.walkingDistance, 2)} unit="km" delta={d('walkingDistance')} deltaUnit=" km" sub="Jalan + Lari" />
          <MetricCard icon={<Mountain className="w-3.5 h-3.5 text-teal-500" />} label="Tangga" value={latest?.flightsClimbed != null ? `${latest.flightsClimbed}` : '-'} unit="lantai" delta={d('flightsClimbed')} sub="Flights Climbed" />
        </div>
      </section>

      {/* ── TARGET BERAT BADAN ── */}
      {latest && cw > 0 && (
        <section className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-emerald-500" /> Target Manajemen Berat
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <p className="text-[11px] text-gray-400 font-medium">Berat Ideal</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{stdW} kg</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Kontrol Berat</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{wCtrl > 0 ? `+${wCtrl}` : wCtrl} kg</p>
            </div>
            <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20">
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Kontrol Lemak</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{fCtrl} kg</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Kontrol Otot</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">+2.1 kg</p>
            </div>
          </div>
        </section>
      )}

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Tren Berat, Lemak & Otot</h3>
          <p className="text-[11px] text-gray-400 mb-4">Berat (kg) vs persentase lemak & otot (%)</p>
          <div className="h-56">
            {metrics.length > 0 ? <Line data={compositionChart.data} options={compositionChart.options} /> : <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada data</div>}
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Aktivitas Harian</h3>
          <p className="text-[11px] text-gray-400 mb-4">Langkah kaki & detak jantung istirahat</p>
          <div className="h-56">
            {metrics.length > 0 ? <Bar data={activityChart.data as any} options={activityChart.options as any} /> : <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada data</div>}
          </div>
        </div>
      </div>

      {/* Chart 3: Tidur, Kalori, Jarak */}
      <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Tren Tidur, Kalori & Jarak Tempuh</h3>
        <p className="text-[11px] text-gray-400 mb-4">Durasi tidur (jam), kalori aktif (kcal), dan akumulasi jarak tempuh (km)</p>
        <div className="h-56">
          {metrics.length > 0 ? <Line data={wellnessChart.data} options={wellnessChart.options} /> : <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada data</div>}
        </div>
      </div>

      {/* ── AI ANALYSIS ── */}
      <section className="p-5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Analisis AI: Finansial vs Kesehatan</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Korelasi spending, anomali pengeluaran, dan fluktuasi berat & aktivitas</p>
            </div>
          </div>
          <button onClick={runAiAnalysis} disabled={analyzing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 cursor-pointer">
            <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Menganalisis...' : 'Mulai Analisis'}
          </button>
        </div>
        {analysisText ? (
          <div className="prose dark:prose-invert max-w-none text-xs md:text-sm bg-white dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-800 leading-relaxed">
            <ReactMarkdown>{analysisText}</ReactMarkdown>
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-gray-900/40 p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Klik tombol di atas untuk menganalisis korelasi pengeluaran dengan parameter fisik tubuh.</p>
          </div>
        )}
      </section>
    </div>
  )
}
