'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  category?: {
    name: string;
    icon?: string;
    color?: string;
  };
}

interface TransactionListProps {
  limit?: number;
}

export default function TransactionList({ limit = 5 }: TransactionListProps) {
  const { selectedWallet } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (selectedWallet?.id) {
          params.append('walletId', selectedWallet.id);
        }
        params.append('limit', limit.toString());
        
        const response = await fetch(`/api/transactions?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const json = await response.json();
        // Handle both array and paginated response formats
        const data = Array.isArray(json) ? json : json.data || [];
        setTransactions(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setError('Failed to load transactions');
        setIsLoading(false);
      }
    };
    
    fetchTransactions();
  }, [selectedWallet, limit]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">Belum ada transaksi</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Terbaru</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="divide-y">
          {transactions.slice(0, 5).map((transaction) => (
            <div 
              key={transaction.id} 
              className="flex items-center justify-between py-3 px-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${
                  transaction.type === 'INCOME' 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  {transaction.type === 'INCOME' ? (
                    <FiArrowDownLeft className="h-4 w-4 text-green-600" />
                  ) : (
                    <FiArrowUpRight className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium truncate max-w-[180px]">
                    {transaction.description || 'Transaksi'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transaction.category?.name || 'Tidak ada kategori'} • {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
              <p className={`font-medium ${
                transaction.type === 'INCOME' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {transaction.type === 'INCOME' ? '+' : '-'} 
                {formatCurrency(Math.abs(transaction.amount))}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <a 
            href="/transactions" 
            className="inline-block w-full py-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors rounded-md font-medium"
          >
            Tampilkan Semua
          </a>
        </div>
      </CardContent>
    </Card>
  );
} 