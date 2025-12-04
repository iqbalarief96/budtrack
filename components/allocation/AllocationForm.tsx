'use client';

import React, { useState } from 'react';
import type {
  AllocationResult,
  AllocationTemplateType,
  AllocationCategoryType,
  SalaryAllocationConfig,
} from '@/app/types/allocation';

interface Category {
  id: string;
  name: string;
}

interface Wallet {
  id: string;
  name: string;
}

interface CustomItem {
  categoryName: string;
  categoryType: AllocationCategoryType;
  percentage: number;
  icon?: string;
  color?: string;
}

interface Props {
  onCalculate: (
    results: AllocationResult[],
    totalAllocated: number,
    unallocatedPercentage: number,
    income: number,
    templateType: AllocationTemplateType
  ) => void;
  onConfigSaved: (config: SalaryAllocationConfig) => void;
  categories: Category[];
  wallets: Wallet[];
  loadedConfig?: any;
}

const DEFAULT_CUSTOM_ITEMS: CustomItem[] = [
  { categoryName: 'Makan', categoryType: 'needs', percentage: 25, icon: '🍽️', color: '#F59E0B' },
  { categoryName: 'Transport', categoryType: 'needs', percentage: 15, icon: '🚗', color: '#6366F1' },
  { categoryName: 'Tagihan', categoryType: 'needs', percentage: 20, icon: '📄', color: '#EF4444' },
  { categoryName: 'Hiburan', categoryType: 'wants', percentage: 10, icon: '🎬', color: '#EC4899' },
  { categoryName: 'Tabungan', categoryType: 'savings', percentage: 20, icon: '💰', color: '#10B981' },
];

export default function AllocationForm({ onCalculate, onConfigSaved, categories, wallets, loadedConfig }: Props) {
  const [income, setIncome] = useState('');
  const [templateType, setTemplateType] = useState<AllocationTemplateType>('50-30-20');
  const [customItems, setCustomItems] = useState<CustomItem[]>(DEFAULT_CUSTOM_ITEMS);
  const [configName, setConfigName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update form when config is loaded
  React.useEffect(() => {
    if (loadedConfig) {
      setIncome(new Intl.NumberFormat('id-ID').format(loadedConfig.monthlyIncome));
      setTemplateType(loadedConfig.templateType);
      if (loadedConfig.templateType === 'custom' && loadedConfig.items) {
        setCustomItems(loadedConfig.items.map((item: any) => ({
          categoryName: item.categoryName,
          categoryType: item.categoryType,
          percentage: item.percentage,
          icon: item.icon,
          color: item.color,
        })));
      }
      setConfigName(loadedConfig.name || '');
    }
  }, [loadedConfig]);

  const handleCalculate = async () => {
    setError('');
    const incomeNum = parseFloat(income.replace(/[^0-9]/g, ''));

    if (!incomeNum || incomeNum <= 0) {
      setError('Masukkan gaji yang valid');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/salary-allocation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome: incomeNum,
          templateType,
          customItems: templateType === 'custom' ? customItems : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal menghitung alokasi');
        return;
      }

      onCalculate(
        data.results,
        data.totalAllocated,
        data.unallocatedPercentage,
        incomeNum,
        templateType
      );
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!configName.trim()) {
      setError('Masukkan nama konfigurasi');
      return;
    }

    const incomeNum = parseFloat(income.replace(/[^0-9]/g, ''));
    if (!incomeNum || incomeNum <= 0) {
      setError('Masukkan gaji yang valid');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/salary-allocation/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configName,
          monthlyIncome: incomeNum,
          templateType,
          items: templateType === 'custom' ? customItems : getTemplateItems(templateType),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal menyimpan');
        return;
      }

      onConfigSaved(data);
      setConfigName('');
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const getTemplateItems = (type: AllocationTemplateType): CustomItem[] => {
    if (type === '50-30-20') {
      return [
        { categoryName: 'Kebutuhan', categoryType: 'needs', percentage: 50 },
        { categoryName: 'Keinginan', categoryType: 'wants', percentage: 30 },
        { categoryName: 'Tabungan', categoryType: 'savings', percentage: 20 },
      ];
    }
    if (type === '70-20-10') {
      return [
        { categoryName: 'Kebutuhan', categoryType: 'needs', percentage: 70 },
        { categoryName: 'Tabungan', categoryType: 'savings', percentage: 20 },
        { categoryName: 'Keinginan', categoryType: 'wants', percentage: 10 },
      ];
    }
    return customItems;
  };

  const updateCustomItem = (index: number, field: keyof CustomItem, value: string | number) => {
    const updated = [...customItems];
    updated[index] = { ...updated[index], [field]: value };
    setCustomItems(updated);
  };

  const addCustomItem = () => {
    setCustomItems([
      ...customItems,
      { categoryName: '', categoryType: 'needs', percentage: 0 },
    ]);
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    return num ? new Intl.NumberFormat('id-ID').format(parseInt(num)) : '';
  };

  const totalPercentage = customItems.reduce((sum, item) => sum + item.percentage, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Hitung Alokasi</h2>

      {/* Income Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gaji Bulanan (Rp)
        </label>
        <input
          type="text"
          value={income}
          onChange={(e) => setIncome(formatCurrency(e.target.value))}
          placeholder="10.000.000"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Template Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template Alokasi
        </label>
        <select
          value={templateType}
          onChange={(e) => setTemplateType(e.target.value as AllocationTemplateType)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="50-30-20">50/30/20 (Kebutuhan/Keinginan/Tabungan)</option>
          <option value="70-20-10">70/20/10 (Kebutuhan/Tabungan/Keinginan)</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Items */}
      {templateType === 'custom' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori Custom
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {customItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.categoryName}
                  onChange={(e) => updateCustomItem(index, 'categoryName', e.target.value)}
                  placeholder="Nama"
                  className="flex-1 px-2 py-1 border rounded text-sm"
                />
                <select
                  value={item.categoryType}
                  onChange={(e) => updateCustomItem(index, 'categoryType', e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="needs">Kebutuhan</option>
                  <option value="wants">Keinginan</option>
                  <option value="savings">Tabungan</option>
                </select>
                <input
                  type="number"
                  value={item.percentage}
                  onChange={(e) => updateCustomItem(index, 'percentage', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 border rounded text-sm text-right"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-gray-500">%</span>
                <button
                  onClick={() => removeCustomItem(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addCustomItem}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + Tambah Kategori
          </button>
          <div className={`mt-2 text-sm ${totalPercentage > 100 ? 'text-red-600' : 'text-gray-600'}`}>
            Total: {totalPercentage}%
            {totalPercentage > 100 && ' (melebihi 100%)'}
            {totalPercentage < 100 && ` (sisa ${100 - totalPercentage}%)`}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
      >
        {isLoading ? 'Menghitung...' : 'Hitung Alokasi'}
      </button>

      {/* Save Config */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Simpan Konfigurasi
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Nama konfigurasi"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {isSaving ? '...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
