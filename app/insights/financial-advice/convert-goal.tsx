'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GoalForm } from '@/components/dashboard/GoalForm';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';

interface ConvertToBudgetProps {
  advice: {
    id: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    estimatedImpact?: number;
    timeframe: string;
  }
}

export function ConvertToBudget({ advice }: ConvertToBudgetProps) {
  const [converting, setConverting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Menangani konversi advice ke budget
  const handleConvertToBudget = async (formData: any) => {
    try {
      setLoading(true);
      
      // Calculate date ranges based on timeframe
      const startDate = new Date();
      const endDate = new Date();
      
      switch (advice.timeframe.toLowerCase()) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1); // Default to month
      }
      
      // Kirim request untuk membuat budget baru
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.name,
          description: formData.description,
          amount: formData.target || 0,
          categoryId: formData.trackedCategoryIds && formData.trackedCategoryIds.length > 0 
            ? formData.trackedCategoryIds[0] 
            : 'uncategorized',
          walletId: formData.walletId,
          timeframe: advice.timeframe,
          userId: formData.userId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create budget');
      }
      
      const budget = await response.json();
      
      // Tampilkan toast sukses
      toast({
        title: 'Budget Created!',
        description: 'Your financial advice has been converted to a budget.',
      });
      
      // Tutup dialog dan arahkan ke halaman budget
      setConverting(false);
      router.push(`/budgets/${budget.id}`);
      
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to create budget. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Generate default goal data berdasarkan advice
  const getDefaultGoalData = () => {
    // Set waktu target berdasarkan timeframe advice
    const targetDate = new Date();
    switch (advice.timeframe.toLowerCase()) {
      case 'month':
        targetDate.setMonth(targetDate.getMonth() + 1);
        break;
      case 'quarter':
        targetDate.setMonth(targetDate.getMonth() + 3);
        break;
      case 'year':
        targetDate.setFullYear(targetDate.getFullYear() + 1);
        break;
      default:
        targetDate.setMonth(targetDate.getMonth() + 1);
    }
    
    // Convert advice type ke goal type
    let goalType = 'OTHER';
    switch (advice.type.toLowerCase()) {
      case 'saving':
        goalType = 'EMERGENCY_FUND';
        break;
      case 'investment':
        goalType = 'INVESTMENT';
        break;
      case 'budgeting':
        goalType = 'BUDGET_REDUCTION';
        break;
    }
    
    return {
      name: advice.title,
      description: advice.description,
      targetDate,
      type: goalType,
      target: advice.estimatedImpact || 0,
    };
  };

  return (
    <Dialog open={converting} onOpenChange={setConverting}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusIcon className="h-4 w-4 mr-2" />
          Convert to Budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Budget from Advice</DialogTitle>
        </DialogHeader>
        <GoalForm 
          onSubmit={handleConvertToBudget}
          initialData={getDefaultGoalData()}
          isEditing={false}
          formType="budget"
        />
      </DialogContent>
    </Dialog>
  );
} 