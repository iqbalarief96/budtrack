'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';

interface EmergencyFundData {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  isActive: boolean;
}

export default function EmergencyFundCard() {
  const [emergencyFund, setEmergencyFund] = useState<EmergencyFundData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmergencyFund = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/emergency-fund');
        
        if (!response.ok) {
          throw new Error('Failed to fetch emergency fund data');
        }
        
        const data = await response.json();
        setEmergencyFund(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching emergency fund:', error);
        setError('Failed to load emergency fund data');
        setIsLoading(false);
      }
    };
    
    fetchEmergencyFund();
  }, []);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dana Darurat</CardTitle>
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
          <CardTitle>Dana Darurat</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!emergencyFund || !emergencyFund.isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dana Darurat</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">Dana darurat belum diatur</p>
        </CardContent>
      </Card>
    );
  }
  
  const progressPercentage = Math.min(
    Math.round((emergencyFund.currentAmount / emergencyFund.targetAmount) * 100), 
    100
  );
  
  const remainingAmount = emergencyFund.targetAmount - emergencyFund.currentAmount;
  const monthsToGoal = remainingAmount > 0 && emergencyFund.monthlyContribution > 0
    ? Math.ceil(remainingAmount / emergencyFund.monthlyContribution)
    : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dana Darurat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Saat Ini</p>
            <p className="text-lg font-medium">
              {formatCurrency(emergencyFund.currentAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Target</p>
            <p className="text-lg font-medium">
              {formatCurrency(emergencyFund.targetAmount)}
            </p>
          </div>
        </div>
        
        {remainingAmount > 0 && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-600">
              {monthsToGoal > 0 
                ? `${monthsToGoal} bulan lagi untuk mencapai target`
                : 'Hampir mencapai target!'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 