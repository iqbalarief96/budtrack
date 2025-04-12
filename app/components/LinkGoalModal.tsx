'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { FiTarget, FiX } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';
import { trackTransactionToGoal } from './TransactionModalHelper';

interface LinkGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export default function LinkGoalModal({ isOpen, onClose, transaction }: LinkGoalModalProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/goals');
        if (!response.ok) throw new Error('Failed to fetch goals');
        const data = await response.json();
        setGoals(data.filter((goal: any) => goal.status === 'ONGOING'));
      } catch (error) {
        console.error('Error fetching goals:', error);
        toast({
          title: 'Error',
          description: 'Gagal memuat data tujuan keuangan',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchGoals();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGoalId) {
      toast({
        title: 'Error',
        description: 'Silakan pilih tujuan keuangan terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await trackTransactionToGoal(
        transaction.id,
        selectedGoalId,
        transaction.amount,
        transaction.type,
        transaction.description || '',
        transaction.date
      );
      
      toast({
        title: 'Sukses',
        description: 'Transaksi berhasil dihubungkan dengan tujuan keuangan',
      });
      
      onClose();
    } catch (error) {
      console.error('Error linking transaction to goal:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghubungkan transaksi dengan tujuan keuangan',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={isSubmitting}
        >
          <FiX size={24} />
        </button>

        <h2 className="text-xl font-bold mb-4">
          Hubungkan dengan Tujuan Keuangan
        </h2>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-sm font-medium text-gray-500">Transaksi</p>
          <p className="text-lg font-bold text-gray-900">
            {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
          </p>
          <p className="text-sm text-gray-600">
            {transaction.description || 'Tanpa deskripsi'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(transaction.date).toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Tujuan Keuangan
              </label>
              {goals.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <FiTarget className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Tidak ada tujuan keuangan aktif
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedGoalId === goal.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedGoalId(goal.id)}
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full ${selectedGoalId === goal.id ? 'bg-blue-500' : 'border border-gray-300'}`} />
                        <div className="ml-3">
                          <h3 className="font-medium">{goal.name}</h3>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <div className="flex-grow">
                              <div className="h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-2 bg-blue-500 rounded-full"
                                  style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className="ml-2">{Math.round((goal.current / goal.target) * 100)}%</span>
                          </div>
                          <p className="text-xs mt-1">
                            {formatCurrency(goal.current)} dari {formatCurrency(goal.target)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md mr-2 hover:bg-gray-300"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                disabled={isSubmitting || !selectedGoalId}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Memproses...
                  </>
                ) : (
                  <>
                    <FiTarget className="mr-2 h-4 w-4" />
                    Hubungkan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 