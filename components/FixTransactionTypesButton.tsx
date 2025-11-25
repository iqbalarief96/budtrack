'use client';

import { useState } from 'react';
import { FiTool, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'sonner';

export function FixTransactionTypesButton() {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFix = async () => {
    if (!confirm('Ini akan memperbaiki saldo wallet berdasarkan semua transaksi. Lanjutkan?')) {
      return;
    }

    setIsFixing(true);
    setResult(null);

    try {
      // Recalculate wallet balance from all transactions
      const response = await fetch('/api/transactions/recalculate-balance', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate balance');
      }

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success(data.message);
        // Reload page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Failed to recalculate balance');
      }
    } catch (error) {
      console.error('Error recalculating balance:', error);
      toast.error('Error recalculating balance');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <FiAlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-900">Recalculate Wallet Balance</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Jika saldo wallet tidak sesuai dengan transaksi yang ada, klik tombol ini untuk menghitung ulang 
            saldo berdasarkan semua transaksi income dan expense.
          </p>
          
          <button
            onClick={handleFix}
            disabled={isFixing}
            className="mt-3 inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFixing ? (
              <>
                <FiTool className="animate-spin mr-2" />
                Menghitung ulang...
              </>
            ) : (
              <>
                <FiTool className="mr-2" />
                Recalculate Balance
              </>
            )}
          </button>

          {result && result.success && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-green-800">
                <FiCheck className="mr-2" />
                <span className="font-medium">Berhasil!</span>
              </div>
              <div className="mt-2 text-sm text-green-700 space-y-1">
                {result.results.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between items-center">
                    <span>{r.walletName}:</span>
                    <span className="font-mono">
                      Rp {r.oldBalance.toLocaleString()} → Rp {r.newBalance.toLocaleString()}
                      {r.difference !== 0 && (
                        <span className={r.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                          {' '}({r.difference > 0 ? '+' : ''}{r.difference.toLocaleString()})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">Halaman akan reload otomatis...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
