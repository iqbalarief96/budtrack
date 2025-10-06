'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { BudgetForm } from '@/app/components/dashboard/BudgetForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  LightbulbIcon,
  ArrowLeftIcon,
  BanknoteIcon,
  PlusIcon
} from 'lucide-react';
import Link from 'next/link';

interface Advice {
  id: string;
  title: string;
  description: string;
  detailedAnalysis?: string;
  actionSteps?: string[];
  resources?: {
    title: string;
    url: string;
  }[];
  type: string;
  priority: string;
  estimatedImpact?: number;
  timeframe: string;
  createdAt: string;
  updatedAt: string;
  walletId?: string | null;
}

export default function AdviceDetailPage() {
  const { id } = useParams();
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAdvice() {
      try {
        const response = await fetch(`/api/insights/advice/${id}`);
        if (!response.ok) throw new Error('Failed to fetch advice');
        const data = await response.json();
        setAdvice(data);
      } catch (error) {
        console.error('Error fetching advice:', error);
        toast({
          title: 'Error',
          description: 'Failed to load financial advice',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAdvice();
  }, [id, toast]);

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

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!advice) {
    return <div className="p-4">Advice not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/insights/financial-advice" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to all advice
        </Link>
      </div>

      <Card className="w-full overflow-hidden shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between">
              <div className="flex space-x-2">
                {getPriorityBadge()}
                {getTypeBadge()}
              </div>
              
              {advice.estimatedImpact && (
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
                <h1 className="font-semibold text-xl">{advice.title}</h1>
                <p className="text-gray-600 mt-2 whitespace-pre-line">{advice.description}</p>
                
                {advice.detailedAnalysis && (
                  <div className="mt-6">
                    <h2 className="font-medium text-lg">Detailed Analysis</h2>
                    <p className="text-gray-600 mt-2 whitespace-pre-line">{advice.detailedAnalysis}</p>
                  </div>
                )}
  
                {advice.actionSteps && advice.actionSteps.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-medium text-lg">Action Steps</h2>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                      {advice.actionSteps.map((step, index) => (
                        <li key={index} className="text-gray-600">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
  
                {advice.resources && advice.resources.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-medium text-lg">Helpful Resources</h2>
                    <ul className="mt-2 space-y-2">
                      {advice.resources.map((resource, index) => (
                        <li key={index}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {resource.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 flex justify-end py-3">
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
              <BudgetForm
                onSubmit={async (formData) => {
                  try {
                    const response = await fetch('/api/budgets', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        ...formData,
                        adviceId: advice?.id || null
                      }),
                    });

                    if (!response.ok) throw new Error('Failed to create budget');

                    setConverting(false);
                    toast({
                      title: 'Budget Created',
                      description: 'Your financial advice has been converted to a budget',
                    });
                  } catch (error) {
                    console.error('Error creating budget:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to create budget',
                      variant: 'destructive',
                    });
                  }
                }}
                initialData={{
                  name: advice.title,
                  description: advice.description,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(
                    new Date().setMonth(new Date().getMonth() + 1)
                  ).toISOString().split('T')[0],
                  amount: advice.estimatedImpact || 0
                }}
                isEditing={false}
              />
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}