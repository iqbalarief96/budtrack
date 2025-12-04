'use client';

import { useState } from 'react';

interface Category {
  id: string;
  name: string;
}

interface Wallet {
  id: string;
  name: string;
}

interface Props {
  configs: any[];
  onLoad: (config: any) => void;
  onDelete: (configId: string) => void;
  categories: Category[];
  wallets: Wallet[];
}

const TEMPLATE_LABELS: Record<string, string> = {
  '50-30-20': '50/30/20',
  '70-20-10': '70/20/10',
  custom: 'Custom',
};

export default function SavedConfigsList({ configs, onLoad, onDelete, categories, wallets }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [categoryMappings, setCategoryMappings] = useState<Record<string, string>>({});

  const handleDelete = async (configId: string) => {
    if (!confirm('Hapus konfigurasi ini?')) return;

    setDeletingId(configId);
    try {
      const response = await fetch(`/api/salary-allocation/configs/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(configId);
      }
    } catch (error) {
      console.error('Error deleting config:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const openApplyModal = (config: any) => {
    setSelectedConfig(config);
    setSelectedWallet(wallets[0]?.id || '');
    // Initialize mappings
    const mappings: Record<string, string> = {};
    config.items.forEach((item: any) => {
      mappings[item.categoryName] = '';
    });
    setCategoryMappings(mappings);
    setShowApplyModal(true);
  };

  const handleApplyToBudgets = async () => {
    if (!selectedConfig || !selectedWallet) return;

    // Check all mappings are set
    const allMapped = Object.values(categoryMappings).every((v) => v);
    if (!allMapped) {
      alert('Pilih kategori untuk semua item alokasi');
      return;
    }

    setApplyingId(selectedConfig.id);
    try {
      const response = await fetch('/api/salary-allocation/apply-to-budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: selectedConfig.id,
          walletId: selectedWallet,
          categoryMappings: Object.entries(categoryMappings).map(([allocationCategory, categoryId]) => ({
            allocationCategory,
            categoryId,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`${data.budgets.length} budget berhasil dibuat!`);
        setShowApplyModal(false);
      } else {
        alert(data.error || 'Gagal membuat budget');
      }
    } catch (error) {
      console.error('Error applying to budgets:', error);
      alert('Terjadi kesalahan');
    } finally {
      setApplyingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Konfigurasi Tersimpan</h2>

      {configs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>Belum ada konfigurasi tersimpan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <div key={config.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{config.name}</h3>
                  <p className="text-sm text-gray-500">
                    {TEMPLATE_LABELS[config.templateType] || config.templateType}
                  </p>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {formatCurrency(config.monthlyIncome)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {config.items.slice(0, 3).map((item: any, i: number) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-gray-100 rounded"
                  >
                    {item.categoryName} {item.percentage}%
                  </span>
                ))}
                {config.items.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    +{config.items.length - 3} lainnya
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onLoad(config)}
                  className="flex-1 text-sm px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                >
                  Load
                </button>
                <button
                  onClick={() => openApplyModal(config)}
                  className="flex-1 text-sm px-3 py-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"
                >
                  Terapkan ke Budget
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  disabled={deletingId === config.id}
                  className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50"
                >
                  {deletingId === config.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply to Budgets Modal */}
      {showApplyModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Terapkan ke Budget</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Pilih Wallet</label>
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Petakan Kategori</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedConfig.items.map((item: any) => (
                  <div key={item.categoryName} className="flex items-center gap-2">
                    <span className="text-sm w-24 truncate">{item.categoryName}</span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={categoryMappings[item.categoryName] || ''}
                      onChange={(e) =>
                        setCategoryMappings({
                          ...categoryMappings,
                          [item.categoryName]: e.target.value,
                        })
                      }
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    >
                      <option value="">Pilih kategori...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleApplyToBudgets}
                disabled={applyingId === selectedConfig.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {applyingId === selectedConfig.id ? 'Menyimpan...' : 'Terapkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
