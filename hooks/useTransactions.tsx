'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Transaction {
  id?: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  walletId?: string;
  goalId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  currencyCode: string;
}

export function useTransactions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (typeof value === 'object') {
            // Handle date ranges, amount ranges, etc.
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue) {
                queryParams.append(`${key}.${subKey}`, String(subValue));
              }
            });
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
      
      const response = await fetch(`/api/transactions?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error fetching transactions:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      const response = await fetch('/api/wallets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching wallets:', error);
      return [];
    }
  }, []);

  const createTransaction = useCallback(async (transaction: Transaction) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create transaction');
      }
      
      return await response.json();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error creating transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    if (!transaction.id) {
      throw new Error('Transaction ID is required for update');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transaction');
      }
      
      return await response.json();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error updating transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }
      
      return await response.json();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error deleting transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processVoiceTransaction = useCallback(async (transcription: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create form data with transcription
      const formData = new FormData();
      formData.append('transcription', transcription);

      // Call the voice-transcribe API
      const response = await fetch('/api/voice-transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memproses transaksi suara');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Gagal mengekstrak detail transaksi');
      }
      
      return data.transaction;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui');
      console.error('Error processing voice transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    fetchTransactions,
    fetchCategories,
    fetchWallets,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    processVoiceTransaction
  };
} 