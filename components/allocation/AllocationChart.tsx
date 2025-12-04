'use client';

import type { AllocationResult } from '@/app/types/allocation';

interface Props {
  results: AllocationResult[];
}

const TYPE_COLORS = {
  needs: '#3B82F6',
  wants: '#8B5CF6',
  savings: '#10B981',
};

export default function AllocationChart({ results }: Props) {
  if (!results || results.length === 0) {
    return null;
  }

  const total = results.reduce((sum, r) => sum + r.percentage, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Distribusi Alokasi</h3>

      {/* Simple bar chart */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="flex items-center gap-2">
                <span>{result.icon || '📊'}</span>
                <span>{result.categoryName}</span>
              </span>
              <span className="font-medium">{result.percentage}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(result.percentage / 100) * 100}%`,
                  backgroundColor: result.color || TYPE_COLORS[result.categoryType],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary by type */}
      <div className="mt-6 pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-600 mb-3">Ringkasan per Tipe</h4>
        <div className="grid grid-cols-3 gap-2">
          {(['needs', 'wants', 'savings'] as const).map((type) => {
            const typeTotal = results
              .filter((r) => r.categoryType === type)
              .reduce((sum, r) => sum + r.percentage, 0);

            const labels = {
              needs: 'Kebutuhan',
              wants: 'Keinginan',
              savings: 'Tabungan',
            };

            return (
              <div
                key={type}
                className="text-center p-2 rounded-lg"
                style={{ backgroundColor: `${TYPE_COLORS[type]}15` }}
              >
                <div
                  className="text-xl font-bold"
                  style={{ color: TYPE_COLORS[type] }}
                >
                  {typeTotal}%
                </div>
                <div className="text-xs text-gray-600">{labels[type]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unallocated warning */}
      {total < 100 && (
        <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
          ⚠️ {100 - total}% belum dialokasikan
        </div>
      )}
    </div>
  );
}
