'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';

interface SavingsGoalCardProps {
  walletId?: string;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  category?: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SavingsGoalCard({ walletId }: SavingsGoalCardProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setIsLoading(true);
        
        // Add walletId to URL if provided
        const url = walletId 
          ? `/api/goals?walletId=${walletId}`
          : '/api/goals';
          
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch goals');
        }
        
        const data = await response.json();
        setGoals(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching savings goals:', error);
        setError('Failed to load savings goals');
        setIsLoading(false);
      }
    };
    
    fetchGoals();
  }, [walletId]); // Re-fetch when walletId changes
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Link href="/goals" className="hover:text-blue-500 transition-colors">
              Target Tabungan
            </Link>
            {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
          </CardTitle>
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
          <CardTitle>
            <Link href="/goals" className="hover:text-blue-500 transition-colors">
              Target Tabungan
            </Link>
            {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
          </CardTitle>
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
          <CardTitle>
            <Link href="/goals" className="hover:text-blue-500 transition-colors">
              Target Tabungan
            </Link>
            {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">Belum ada target tabungan</p>
        </CardContent>
        <CardFooter className="pt-0">
          <Link href="/goals" className="text-blue-500 text-sm flex items-center hover:underline w-full justify-center">
            Lihat Semua Target <FiChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </CardFooter>
      </Card>
    );
  }
  
  // Show only up to 3 goals in the dashboard widget
  const displayGoals = goals.slice(0, 3);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href="/goals" className="hover:text-blue-500 transition-colors">
            Target Tabungan
          </Link>
          {walletId && <Badge variant="outline" className="ml-2">Filter Aktif</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="divide-y">
          {displayGoals.map((goal) => {
            const progressPercentage = Math.min(
              Math.round((goal.current / goal.target) * 100), 
              100
            );
            
            let daysLeft = 0;
            if (goal.deadline) {
              const deadline = new Date(goal.deadline);
              const today = new Date();
              daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
            
            return (
              <div key={goal.id} className="py-4 px-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{goal.name}</h3>
                  {goal.deadline && (
                    <span className="text-sm text-gray-500">
                      {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Batas waktu terlewati'}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>{formatCurrency(goal.current)}</span>
                    <span className="font-medium">{progressPercentage}%</span>
                    <span className="text-right">{formatCurrency(goal.target)}</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Link href="/goals" className="text-blue-500 text-sm flex items-center hover:underline w-full justify-center">
          Lihat Semua Target <FiChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
} 