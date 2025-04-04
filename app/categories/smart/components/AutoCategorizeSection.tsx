'use client';

import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiZap, FiCheck, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';

type Category = {
  id: string;
  name: string;
  type: string;
  color: string;
};

type Transaction = {
  id: string;
  description: string | null;
  amount: number;
  date: string;
  categoryId: string | null;
  category?: Category;
};

export default function AutoCategorizeSection() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [recentlyCategorized, setRecentlyCategorized] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const AUTO_CATEGORIZE_STEPS = [
    'Mengambil transaksi yang belum dikategorikan...',
    'Memeriksa pola transaksi sebelumnya...',
    'Menerapkan aturan kategori...',
    'Memperbarui transaksi...',
    'Selesai!'
  ];

  // Fetch uncategorized count when component mounts
  useEffect(() => {
    fetchUncategorizedCount();
  }, []);

  const fetchUncategorizedCount = async () => {
    try {
      setError(null);
      const response = await fetch('/api/transactions/uncategorized');
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data transaksi');
      }
      
      const data = await response.json();
      setUncategorizedCount(data.count);
    } catch (err) {
      setError('Gagal mengambil jumlah transaksi yang belum dikategorikan');
      console.error(err);
    }
  };

  const startAutoCategorize = async () => {
    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);
    setRecentlyCategorized([]);

    try {
      // Step 1: Fetching uncategorized transactions
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 800)); // UI feedback delay
      
      // Step 2: Checking patterns
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Applying rules
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Updating transactions
      setCurrentStep(3);
      
      // Make actual API call to auto-categorize
      const response = await fetch('/api/transactions/auto-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to auto-categorize transactions');
      }
      
      const result = await response.json();
      
      // Step 5: Complete
      setCurrentStep(4);
      
      // Update UI with categorized transactions
      if (result.categorized && result.categorized.length > 0) {
        setRecentlyCategorized(result.categorized);
      }
      
      // Refresh the uncategorized count
      fetchUncategorizedCount();
      
      // UI feedback delay before completing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengkategorikan otomatis');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Auto-Kategorisasi Transaksi</h3>
        <button
          onClick={fetchUncategorizedCount}
          className="text-blue-600 hover:text-blue-800"
          disabled={isProcessing}
        >
          <FiRefreshCw className={isProcessing ? "animate-spin" : ""} />
        </button>
      </div>
      
      <p className="text-gray-600 mb-4">
        Secara otomatis kategorikan transaksi berdasarkan riwayat dan pola Anda sebelumnya.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
          <FiAlertCircle className="mr-2 mt-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="mb-6 p-4 bg-blue-50 rounded-md">
        <div className="flex items-center mb-2">
          <FiInfo className="text-blue-500 mr-2" />
          <span className="font-medium text-blue-700">Transaksi Belum Terkategorisasi</span>
        </div>
        <p className="text-blue-800 text-2xl font-bold">
          {uncategorizedCount}
        </p>
      </div>
      
      <button
        onClick={startAutoCategorize}
        disabled={isProcessing || uncategorizedCount === 0}
        className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
          ${isProcessing || uncategorizedCount === 0 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
        `}
      >
        {isProcessing ? (
          <>
            <FiRefreshCw className="animate-spin mr-2" />
            {AUTO_CATEGORIZE_STEPS[currentStep]}
          </>
        ) : (
          <>
            <FiZap className="mr-2" />
            Kategorikan Otomatis
          </>
        )}
      </button>
      
      {/* Smart Learning Information */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-1">Smart Learning</h4>
        <p className="text-xs text-gray-600">
          Sistem ini belajar dari interaksi Anda. Semakin banyak transaksi yang Anda kategorikan secara manual, semakin akurat pengelompokan otomatisnya.
        </p>
      </div>
      
      {/* Recently Categorized Transactions */}
      {recentlyCategorized.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Transaksi Baru Dikategorikan ({recentlyCategorized.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentlyCategorized.map(tx => (
              <div key={tx.id} className="flex items-center p-2 bg-green-50 rounded-md">
                <FiCheck className="text-green-500 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.description || 'Unnamed Transaction'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.date).toLocaleDateString()} • <span className="text-green-600">{tx.category?.name}</span>
                  </p>
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 