'use client';

import type { AllocationResult } from '@/app/types/allocation';

interface Props {
  results: AllocationResult[] | null;
  totalAllocated: number;
  unallocatedPercentage: number;
  monthlyIncome: number;
}

const TYPE_COLORS = {
  needs: 'bg-blue-100 text-blue-800 border-blue-200',
  wants: 'bg-purple-100 text-purple-800 border-purple-200',
  savings: 'bg-green-100 text-green-800 border-green-200',
};

const TYPE_LABELS = {
  needs: 'Kebutuhan',
  wants: 'Keinginan',
  savings: 'Tabungan',
};

export default function AllocationPreview({
  results,
  totalAllocated,
  unallocatedPercentage,
  monthlyIncome,
}: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!results || results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Preview Alokasi</h2>
        <div className="text-center text-gray-500 py-8">
          <p>Masukkan gaji dan pilih template untuk melihat preview alokasi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Preview Alokasi</h2>

      {/* Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">Gaji Bulanan</div>
        <div className="text-2xl font-bold text-gray-900">
          {formatCurrency(monthlyIncome)}
        </div>
      </div>

      {/* Allocation Items */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${TYPE_COLORS[result.categoryType]}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-lg mr-2">{result.icon || '📊'}</span>
                <span className="font-medium">{result.categoryName}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/50">
                  {TYPE_LABELS[result.categoryType]}
                </span>
              </div>
              <span className="font-bold">{result.percentage}%</span>
            </div>

            <div className="text-xl font-bold mb-2">
              {formatCurrency(result.amount)}
            </div>

            <div className="flex gap-4 text-xs opacity-75">
              <div>
                <span className="font-medium">Harian:</span>{' '}
                {formatCurrency(result.dailyLimit)}
              </div>
              <div>
                <span className="font-medium">Mingguan:</span>{' '}
                {formatCurrency(result.weeklyLimit)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-current opacity-50 rounded-full"
                style={{ width: `${result.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total & Unallocated */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span>Total Dialokasikan</span>
          <span className="font-medium">{totalAllocated}%</span>
        </div>
        {unallocatedPercentage > 0 && (
          <div className="flex justify-between text-sm text-amber-600 mt-1">
            <span>⚠️ Belum Dialokasikan</span>
            <span className="font-medium">{unallocatedPercentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
