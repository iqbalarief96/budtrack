'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiRefreshCw, FiZap, FiCheck, FiAlertCircle, FiInfo, FiShield } from 'react-icons/fi';
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

type AutoCategorizeSectionProps = {
  walletId?: string | null;
  walletName?: string;
};

type AutoCategorizeStats = {
  totalCandidates: number;
  categorizedCount: number;
  aiUsed: number;
  fallbackUsed: number;
  skipped: number;
  aiEnabled: boolean;
};

const AUTO_CATEGORIZE_STEPS = [
  'Mengambil transaksi yang belum dikategorikan...',
  'Memeriksa pola transaksi sebelumnya...',
  'Menerapkan aturan kategori...',
  'Memperbarui transaksi...',
  'Selesai!'
];

export default function AutoCategorizeSection({ walletId, walletName }: AutoCategorizeSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [uncategorizedPreview, setUncategorizedPreview] = useState<Transaction[]>([]);
  const [recentlyCategorized, setRecentlyCategorized] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'enabled' | 'fallback'>('unknown');
  const [lastRunSummary, setLastRunSummary] = useState<AutoCategorizeStats | null>(null);

  useEffect(() => {
    fetchUncategorizedCount();
    setRecentlyCategorized([]);
    setLastRunSummary(null);
    setAiStatus('unknown');
  }, [walletId]);

  const fetchUncategorizedCount = async () => {
    try {
      setError(null);
      const query = walletId ? `?walletId=${encodeURIComponent(walletId)}` : '';
      const response = await fetch(`/api/transactions/uncategorized${query}`);

      if (!response.ok) {
        throw new Error('Gagal mengambil data transaksi');
      }

      const data = await response.json();
      setUncategorizedCount(data.count || 0);
      setUncategorizedPreview(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (err) {
      setError('Gagal mengambil jumlah transaksi yang belum dikategorikan');
      console.error(err);
      setUncategorizedCount(0);
      setUncategorizedPreview([]);
    }
  };

  const startAutoCategorize = async () => {
    if (uncategorizedCount === 0 || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep(0);
    setRecentlyCategorized([]);
    setLastRunSummary(null);

    try {
      setCurrentStep(0);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setCurrentStep(1);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentStep(2);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentStep(3);

      const body: Record<string, unknown> = {};
      if (walletId) {
        body.walletId = walletId;
      }

      const response = await fetch('/api/transactions/auto-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to auto-categorize transactions');
      }

      const result = await response.json();
      setCurrentStep(4);

      if (Array.isArray(result.categorized) && result.categorized.length > 0) {
        setRecentlyCategorized(result.categorized);
      }

      if (result.stats) {
        setLastRunSummary(result.stats);
        setAiStatus(result.stats.aiEnabled ? 'enabled' : 'fallback');
      } else {
        setLastRunSummary(null);
      }

      await fetchUncategorizedCount();
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat mengkategorikan otomatis');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Auto-Kategorisasi Transaksi</h3>
        <button onClick={fetchUncategorizedCount} className="text-blue-600 hover:text-blue-800" disabled={isProcessing}>
          <FiRefreshCw className={isProcessing ? 'animate-spin' : ''} />
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Secara otomatis kategorikan transaksi berdasarkan riwayat dan pola Anda sebelumnya.
      </p>

      {walletName && (
        <div className="mb-4 text-xs text-gray-500 flex items-center gap-1">
          <FiShield className="text-gray-400" />
          Fokus pada dompet <span className="font-medium text-gray-700">{walletName}</span>
        </div>
      )}

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
        <p className="text-blue-800 text-2xl font-bold">{uncategorizedCount}</p>
      </div>

      <button
        onClick={startAutoCategorize}
        disabled={isProcessing || uncategorizedCount === 0}
        className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          isProcessing || uncategorizedCount === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }`}
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

      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-1">Smart Learning</h4>
        <p className="text-xs text-gray-600">
          Sistem ini belajar dari interaksi Anda. Semakin banyak transaksi yang Anda kategorikan secara manual, semakin akurat pengelompokan otomatisnya.
        </p>
      </div>

      {aiStatus === 'fallback' && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
          AI belum dikonfigurasi, jadi kami pakai aturan bawaan.{' '}
          <Link href="/settings" className="underline font-semibold">
            Aktifkan AI
          </Link>{' '}
          buat rekomendasi yang lebih akurat.
        </div>
      )}

      {uncategorizedPreview.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Contoh transaksi belum terkategorisasi</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {uncategorizedPreview.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-white border rounded-md px-3 py-2 text-xs">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-medium text-gray-800 truncate">{tx.description || 'Transaksi tanpa deskripsi'}</p>
                  <p className="text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                </div>
                <div className="font-semibold">{formatCurrency(tx.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastRunSummary && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-green-50 border border-green-100 rounded-md">
            <p className="text-green-800 font-semibold">Berhasil dikategorikan</p>
            <p className="text-green-600 text-lg font-bold">{lastRunSummary.categorizedCount}</p>
            <p className="text-green-700">dari {lastRunSummary.totalCandidates} transaksi</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-blue-800 font-semibold">AI Match</p>
            <p className="text-blue-600 text-lg font-bold">{lastRunSummary.aiUsed}</p>
            <p className="text-blue-700">Transaksi cocok lewat AI</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-gray-800 font-semibold">Fallback Rules</p>
            <p className="text-gray-700 text-lg font-bold">{lastRunSummary.fallbackUsed}</p>
            <p className="text-gray-600">Menggunakan pola bawaan</p>
          </div>
        </div>
      )}

      {recentlyCategorized.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Transaksi Baru Dikategorikan ({recentlyCategorized.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentlyCategorized.map((tx) => (
              <div key={tx.id} className="flex items-center p-2 bg-green-50 rounded-md">
                <FiCheck className="text-green-500 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description || 'Unnamed Transaction'}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-green-600">{tx.category?.name}</span>
                  </p>
                </div>
                <div className="text-sm font-medium">{formatCurrency(tx.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
