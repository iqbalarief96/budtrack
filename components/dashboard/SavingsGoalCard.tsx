'use client';

import React, { useState, useEffect } from 'react';
import { FiTarget, FiChevronRight } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

type Goal = {
  id: string;
  name: string;
  current: number;
  target: number;
  deadline: string | null;
};

export default function SavingsGoalCard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/goals');
        if (!response.ok) {
          throw new Error('Failed to fetch goals');
        }
        
        const data = await response.json();
        setGoals(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching savings goals:', error);
        setError('Failed to load goals');
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getColorClass = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-pulse text-gray-400">Loading savings goals...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4 text-center">
        <FiTarget className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-gray-500">Belum ada target tabungan</p>
        <Link href="/goals" className="mt-3 text-blue-600 text-sm hover:underline">
          + Tambah Target Baru
        </Link>
      </div>
    );
  }

  // Display only up to 3 goals in the dashboard widget
  const displayGoals = goals.slice(0, 3);

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto space-y-4 flex-1">
        {displayGoals.map(goal => {
          const progress = calculateProgress(goal.current, goal.target);
          const colorClass = getColorClass(progress);
          
          return (
            <div key={goal.id} className="border border-gray-100 rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{goal.name}</h3>
                {goal.deadline && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Target: {formatDate(goal.deadline)}
                  </span>
                )}
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className={`h-2.5 rounded-full ${colorClass}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{progress}% tercapai</span>
                <span className="font-medium">
                  {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t text-center">
        <Link href="/goals" className="text-blue-600 text-sm hover:underline flex items-center justify-center">
          Lihat Semua Target <FiChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
} 