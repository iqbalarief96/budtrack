'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category?: string;
}

export default function SavingsGoalCard() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // For demonstration, we're using mock data
    // In a real app, this would fetch from an API
    const fetchGoals = async () => {
      try {
        setIsLoading(true);
        
        // Mock data
        const mockGoals: SavingsGoal[] = [
          {
            id: '1',
            name: 'Liburan ke Bali',
            targetAmount: 15000000,
            currentAmount: 9000000,
            deadline: '2023-12-31',
            category: 'Travel'
          },
          {
            id: '2',
            name: 'DP Rumah',
            targetAmount: 150000000,
            currentAmount: 75000000,
            deadline: '2024-06-30',
            category: 'Housing'
          }
        ];
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setGoals(mockGoals);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching savings goals:', error);
        setError('Failed to load savings goals');
        setIsLoading(false);
      }
    };
    
    fetchGoals();
  }, []);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Tabungan</CardTitle>
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
          <CardTitle>Target Tabungan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Tabungan</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">Belum ada target tabungan</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Tabungan</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="divide-y">
          {goals.map((goal) => {
            const progressPercentage = Math.min(
              Math.round((goal.currentAmount / goal.targetAmount) * 100), 
              100
            );
            
            const deadline = new Date(goal.deadline);
            const today = new Date();
            const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={goal.id} className="py-4 px-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{goal.name}</h3>
                  <span className="text-sm text-gray-500">
                    {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Batas waktu terlewati'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span className="font-medium">{progressPercentage}%</span>
                    <span className="text-right">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 