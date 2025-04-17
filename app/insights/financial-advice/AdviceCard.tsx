'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoalForm } from '@/components/dashboard/GoalForm';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { 
  LightbulbIcon, 
  ArrowRightIcon, 
  BanknoteIcon, 
  CheckCircleIcon,
  PlusIcon
} from 'lucide-react';

interface AdviceCardProps {
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

export function AdviceCard({ advice }: AdviceCardProps) {
  const [converting, setConverting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Menentukan warna badge berdasarkan priority
  const getPriorityBadge = () => {
    const priority = advice?.priority?.toLowerCase() || '';
    
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="default">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="secondary">{advice?.priority || ''} Priority</Badge>;
    }
  };

  // Menentukan badge kategori advice
  const getTypeBadge = () => {
    const type = advice?.type?.toLowerCase() || '';
    
    switch (type) {
      case 'saving':
        return <Badge className="bg-blue-500">Saving</Badge>;
      case 'budgeting':
        return <Badge className="bg-green-500">Budgeting</Badge>;
      case 'investment':
        return <Badge className="bg-purple-500">Investment</Badge>;
      case 'general':
        return <Badge className="bg-gray-500">General</Badge>;
      default:
        return <Badge>{advice?.type || ''}</Badge>;
    }
  };

  // Menangani konversi advice ke budget
  const handleConvertToBudget = async (formData: any) => {
    try {
      setLoading(true);
      
      // Jika punya advice yang valid, kirim ID-nya
      // Jika tidak, kirim null (server akan create budget tanpa link ke advice)
      let adviceData = null;
      
      if (advice?.id) {
        // Kirim string ID jika valid
        adviceData = advice.id;
      } else if (advice) {
        // Jika tidak punya ID tapi punya advice object, kirim object
        adviceData = {
          title: advice.title || 'Untitled Advice',
          description: advice.description || '',
          type: advice.type || 'general',
          priority: advice.priority || 'medium',
          estimatedImpact: advice.estimatedImpact || null,
          timeframe: advice.timeframe || 'month'
        };
      }
      
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
    const timeframe = advice?.timeframe?.toLowerCase() || 'month';
    
    switch (timeframe) {
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
    const adviceType = advice?.type?.toLowerCase() || '';
    
    switch (adviceType) {
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
      name: advice?.title || 'New Goal',
      description: advice?.description || '',
      targetDate,
      type: goalType,
      target: advice?.estimatedImpact || 0,
    };
  };

  return (
    <Card className="w-full overflow-hidden shadow-md hover:shadow-lg transition-all mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between">
            <div className="flex space-x-2">
              {getPriorityBadge()}
              {getTypeBadge()}
            </div>
            
            {advice?.estimatedImpact && (
              <div className="text-sm text-gray-500">
                Estimated Impact: Rp {advice.estimatedImpact.toLocaleString()}
              </div>
            )}
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-amber-100 p-2 rounded-full">
              <LightbulbIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{advice?.title || 'Untitled Advice'}</h3>
              <p className="text-gray-600 mt-1">{advice?.description || 'No description available'}</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 flex justify-between py-3">
        <Dialog open={converting} onOpenChange={setConverting}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
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
        
        <Button 
          variant="link" 
          className="text-gray-500 hover:text-gray-700"
          onClick={() => router.push(`/insights/financial-advice/${advice?.id || ''}`)}
        >
          Learn More <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
} 