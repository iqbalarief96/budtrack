'use client';

import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';

type Investment = {
  id: string;
  name: string;
  initialValue: number;
  currentValue: number;
  returnPercentage: number;
  type: string;
};

export default function InvestmentPerformance() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalReturn, setTotalReturn] = useState(0);
  const [avgReturnPercentage, setAvgReturnPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data fetching
    const fetchInvestments = async () => {
      setIsLoading(true);
      try {
        // Dummy data
        const dummyInvestments = [
          {
            id: 'inv1',
            name: 'Saham BBCA',
            initialValue: 10000000,
            currentValue: 12500000,
            returnPercentage: 25,
            type: 'Saham'
          },
          {
            id: 'inv2',
            name: 'Reksadana Pendapatan Tetap',
            initialValue: 5000000,
            currentValue: 5350000,
            returnPercentage: 7,
            type: 'Reksadana'
          },
          {
            id: 'inv3',
            name: 'Bitcoin',
            initialValue: 3000000,
            currentValue: 4500000,
            returnPercentage: 50,
            type: 'Crypto'
          },
          {
            id: 'inv4',
            name: 'Emas',
            initialValue: 8000000,
            currentValue: 8640000,
            returnPercentage: 8,
            type: 'Komoditas'
          }
        ];

        // Calculate totals
        const total = dummyInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
        const initialTotal = dummyInvestments.reduce((sum, inv) => sum + inv.initialValue, 0);
        const returnTotal = total - initialTotal;
        const avgReturn = (returnTotal / initialTotal) * 100;

        setTimeout(() => {
          setInvestments(dummyInvestments);
          setTotalValue(total);
          setTotalReturn(returnTotal);
          setAvgReturnPercentage(avgReturn);
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Error fetching investments:', error);
        setIsLoading(false);
      }
    };

    fetchInvestments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading investment data...</div>
      </div>
    );
  }

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4 text-center">
        <FiTrendingUp className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-500">Belum ada investasi tercatat</p>
        <button className="mt-3 text-blue-600 text-sm hover:underline">
          + Tambah Investasi
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Summary header */}
      <div className="mb-4 pb-3 border-b">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Investasi</p>
            <p className="font-bold">{formatCurrency(totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Return</p>
            <p className={`font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg. Return</p>
            <p className={`font-bold ${avgReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgReturnPercentage >= 0 ? '+' : ''}{avgReturnPercentage.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
      
      {/* Investment list */}
      <div className="overflow-y-auto flex-1">
        <div className="space-y-3">
          {investments.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-2 border-b">
              <div>
                <p className="font-medium">{inv.name}</p>
                <p className="text-xs text-gray-500">{inv.type}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(inv.currentValue)}</p>
                <div className={`flex items-center text-xs justify-end ${
                  inv.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {inv.returnPercentage >= 0 ? (
                    <FiTrendingUp size={12} className="mr-1" />
                  ) : (
                    <FiTrendingDown size={12} className="mr-1" />
                  )}
                  <span>
                    {inv.returnPercentage >= 0 ? '+' : ''}{inv.returnPercentage}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t text-center">
        <button className="text-blue-600 text-sm hover:underline">
          Lihat Semua Investasi
        </button>
      </div>
    </div>
  );
} 