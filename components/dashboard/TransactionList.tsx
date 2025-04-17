'use client';

import React, { useEffect, useState } from 'react';
import { FiArrowUpRight, FiArrowDownLeft, FiCalendar } from 'react-icons/fi';
import { useWallet } from '@/app/providers/WalletProvider';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

// Define transaction type
type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
};

type TransactionListProps = {
  limit?: number;
};

export default function TransactionList({ limit = 5 }: TransactionListProps) {
  const { selectedWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        // Placeholder data - in real app, fetch from API
        const dummyData: Transaction[] = [
          {
            id: 'tx1',
            description: 'Gaji Bulanan',
            amount: 7500000,
            type: 'income',
            date: '2024-07-01',
            category: 'Pendapatan'
          },
          {
            id: 'tx2',
            description: 'Belanja Bulanan',
            amount: 1200000,
            type: 'expense',
            date: '2024-07-03',
            category: 'Belanja'
          },
          {
            id: 'tx3',
            description: 'Makan Siang',
            amount: 75000,
            type: 'expense',
            date: '2024-07-05',
            category: 'Makanan'
          },
          {
            id: 'tx4',
            description: 'Pembayaran Freelance',
            amount: 2500000,
            type: 'income',
            date: '2024-07-07',
            category: 'Pendapatan'
          },
          {
            id: 'tx5',
            description: 'Tagihan Internet',
            amount: 350000,
            type: 'expense',
            date: '2024-07-10',
            category: 'Tagihan'
          },
          {
            id: 'tx6',
            description: 'Bensin',
            amount: 200000,
            type: 'expense',
            date: '2024-07-12',
            category: 'Transportasi'
          },
          {
            id: 'tx7',
            description: 'Dividends',
            amount: 500000,
            type: 'income',
            date: '2024-07-15',
            category: 'Investasi'
          },
        ];

        // Simulate API delay
        setTimeout(() => {
          setTransactions(dummyData.slice(0, limit));
          setIsLoading(false);
        }, 500);
        
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedWallet, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading transactions...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-500">
        <p className="mb-2">Belum ada transaksi</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <li key={tx.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full mr-3 ${
                    tx.type === 'income' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {tx.type === 'income' 
                      ? <FiArrowDownLeft size={16} /> 
                      : <FiArrowUpRight size={16} />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      <span className="inline-flex items-center">
                        <FiCalendar size={12} className="mr-1" />
                        {formatDate(tx.date)}
                      </span>
                      <span className="mx-1">•</span>
                      {tx.category}
                    </p>
                  </div>
                </div>
                <div className={`font-medium ${
                  tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-3 pt-3 border-t text-center">
        <Link href="/transactions" className="text-blue-600 text-sm hover:underline">
          Lihat Semua Transaksi
        </Link>
      </div>
    </div>
  );
} 