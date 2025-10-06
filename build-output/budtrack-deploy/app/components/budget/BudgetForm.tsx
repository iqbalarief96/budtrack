import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';

interface BudgetFormProps {
  onSubmit: (data: BudgetFormData) => Promise<void>;
  initialData?: BudgetFormData;
}

interface BudgetFormData {
  title: string;
  description: string;
  amount: number;
  categoryId: string;
  walletId?: string;
  timeframe: string;
  userId: string;
}

const BudgetForm = ({ onSubmit, initialData }: BudgetFormProps) => {
  const [formData, setFormData] = useState<BudgetFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    categoryId: initialData?.categoryId || 'uncategorized',
    walletId: initialData?.walletId,
    timeframe: initialData?.timeframe || 'month',
    userId: initialData?.userId || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting budget:', error);
      toast.error('Failed to create budget. Please try again.', {
        position: 'top-right',
        duration: 3000,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          required
        />
      </div>
      <div>
        <Label htmlFor="timeframe">Timeframe</Label>
        <select
          id="timeframe"
          value={formData.timeframe}
          onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
          className="w-full p-2 border rounded"
          required
        >
          <option value="month">Monthly</option>
          <option value="quarter">Quarterly</option>
          <option value="year">Yearly</option>
        </select>
      </div>
      <Button type="submit">Create Budget</Button>
    </form>
  );
};

export default BudgetForm; 