import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, DollarSign, Clock, Wallet, PiggyBank, TrendingUp, Scale } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';

interface Advice {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  estimatedImpact?: number;
  walletId?: string;
  timeframe: string;
  createdAt: Date;
  userId: string;
}

interface AdviceCardProps {
  advice: Advice;
}

const getAdviceIcon = (type: string) => {
  switch (type) {
    case 'saving':
      return <PiggyBank className="h-6 w-6 text-white" />;
    case 'investment':
      return <TrendingUp className="h-6 w-6 text-white" />;
    case 'budgeting':
      return <Scale className="h-6 w-6 text-white" />;
    default:
      return <PiggyBank className="h-6 w-6 text-white" />;
  }
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

const AdviceCard = ({ advice }: AdviceCardProps) => {
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const handleConvertToBudget = async () => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: advice.title,
          description: advice.description,
          amount: advice.estimatedImpact || 0,
          categoryId: 'uncategorized',
          walletId: advice.walletId,
          timeframe: advice.timeframe,
          userId: advice.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create budget');
      }

      // Show success toast
      toast.success('Budget created successfully!', {
        position: 'top-right',
        duration: 3000,
      });

      // Close the dialog
      setShowConvertDialog(false);
    } catch (error) {
      console.error('Error creating budget:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create budget. Please try again.';
      toast.error(errorMessage, {
        position: 'top-right',
        duration: 3000,
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white/20 rounded-full">
              {getAdviceIcon(advice.type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{advice.title}</h3>
              <p className="text-sm text-blue-100">{formatDate(advice.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getPriorityVariant(advice.priority)}>
              {advice.priority}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowConvertDialog(true)}
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-gray-600 mb-4">{advice.description}</p>
        {advice.estimatedImpact && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <DollarSign className="h-4 w-4" />
            <span>Estimated Impact: ${advice.estimatedImpact.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-gray-50 p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {advice.timeframe.charAt(0).toUpperCase() + advice.timeframe.slice(1)}
            </span>
          </div>
          {advice.walletId && (
            <div className="flex items-center space-x-2">
              <Wallet className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Linked to Wallet</span>
            </div>
          )}
        </div>
      </CardFooter>

      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Budget</DialogTitle>
            <DialogDescription>
              Create a budget based on this financial advice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={advice.title} readOnly />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={advice.description} readOnly />
            </div>
            {advice.estimatedImpact && (
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={advice.estimatedImpact}
                  readOnly
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertToBudget}>
              Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdviceCard; 