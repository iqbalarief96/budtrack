'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GoalForm } from '@/components/dashboard/GoalForm';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';

interface ConvertToGoalProps {
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

export function ConvertToGoal({ advice }: ConvertToGoalProps) {
  const [converting, setConverting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Menangani konversi advice ke goal
  const handleConvertToGoal = async (formData: any) => {
    try {
      setLoading(true);
      
      // Tambahkan adviceId ke data
      const goalData = {
        ...formData,
        adviceId: advice.id
      };
      
      // Kirim request untuk membuat goal baru
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create goal');
      }
      
      const goal = await response.json();
      
      // Tampilkan toast sukses
      toast({
        title: 'Goal Created!',
        description: 'Your financial advice has been converted to a goal.',
      });
      
      // Tutup dialog dan arahkan ke halaman goal
      setConverting(false);
      router.push(`/goals/${goal.id}`);
      
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to create goal. Please try again.',
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
          Convert to Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Goal from Advice</DialogTitle>
        </DialogHeader>
        <GoalForm 
          onSubmit={handleConvertToGoal}
          initialData={getDefaultGoalData()}
          isEditing={false}
        />
      </DialogContent>
    </Dialog>
  );
} 