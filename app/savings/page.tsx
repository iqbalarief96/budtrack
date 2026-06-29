import SavingsDashboard from '@/components/savings/SavingsDashboard'

export default function SavingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tabungan</h1>
        <p className="text-gray-600">Rekap total saving, bucket/wallet tabungan, trend setoran, dan transaksi yang belum termigrasi.</p>
      </div>
      <SavingsDashboard />
    </div>
  )
}
