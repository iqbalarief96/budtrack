'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface BudgetFormProps {
  userId: string;
  categories: Array<{
    id: string;
    name: string;
    type: string;
    color?: string;
    icon?: string;
  }>;
  wallets: Array<{
    id: string;
    name: string;
    balance: number;
    isDefault?: boolean;
  }>;
  initialData?: {
    id?: string;
    amount: number;
    categoryId: string;
    walletId: string;
    startDate: Date;
    endDate: Date;
  };
  isEditing?: boolean;
}

export default function BudgetForm({ 
  userId, 
  categories, 
  wallets, 
  initialData,
  isEditing = false
}: BudgetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultStartDate = initialData?.startDate || new Date();
  const defaultEndDate = initialData?.endDate || new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
  
  const [formData, setFormData] = useState({
    amount: initialData?.amount || 0,
    categoryId: initialData?.categoryId || (categories[0]?.id || ''),
    walletId: initialData?.walletId || (wallets.find(w => w.isDefault)?.id || wallets[0]?.id || ''),
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    period: 'monthly'
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }
    
    if (!formData.walletId) {
      toast.error('Please select a wallet');
      return;
    }
    
    if (formData.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const url = isEditing 
        ? '/api/budgets' // PUT request in handler
        : '/api/budgets';
        
      const method = isEditing ? 'PUT' : 'POST';

      console.log('Submitting budget with dates:', {
        startDate: formData.startDate,
        endDate: formData.endDate,
        startDateFormatted: format(formData.startDate, "yyyy-MM-dd"),
        endDateFormatted: format(formData.endDate, "yyyy-MM-dd"),
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(isEditing && initialData?.id ? { id: initialData.id } : {}),
          ...formData,
          userId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save budget');
      }
      
      const result = await response.json();
      console.log('Budget created/updated successfully:', result);
      
      toast.success(isEditing ? 'Budget updated!' : 'Budget created!');
      
      // Redirect setelah berhasil update/create
      if (isEditing && initialData?.id) {
        // Jika sedang edit, kembali ke halaman detail budget
        router.push(`/budgets/${initialData.id}`);
      } else {
        // Jika sedang create, kembali ke daftar budget
        router.push('/budgets');
      }
      router.refresh();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save budget');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePeriodChange = (period: string) => {
    const currentStartDate = formData.startDate;
    let newEndDate = new Date(currentStartDate);
    
    switch (period) {
      case 'daily':
        newEndDate = addDays(currentStartDate, 1);
        break;
      case 'weekly':
        newEndDate = addWeeks(currentStartDate, 1);
        break;
      case 'monthly':
        // Set to last day of the current month
        const year = currentStartDate.getFullYear();
        const month = currentStartDate.getMonth();
        // Create date for the first day of next month, then subtract 1 day
        newEndDate = new Date(year, month + 1, 0);
        break;
      default:
        newEndDate = addMonths(currentStartDate, 1);
    }
    
    setFormData({
      ...formData,
      period,
      endDate: newEndDate
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="amount">Budget Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.categoryId} 
          onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="wallet">Wallet</Label>
        <Select 
          value={formData.walletId} 
          onValueChange={(value) => setFormData({ ...formData, walletId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a wallet" />
          </SelectTrigger>
          <SelectContent>
            {wallets.map(wallet => (
              <SelectItem key={wallet.id} value={wallet.id}>
                {wallet.name} ({parseFloat(wallet.balance.toString()).toFixed(2)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="period">Period</Label>
        <Select 
          value={formData.period} 
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={format(formData.startDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                setFormData({ ...formData, startDate: date });
              }
            }}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={format(formData.endDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const date = new Date(e.target.value);
              if (!isNaN(date.getTime())) {
                setFormData({ ...formData, endDate: date });
              }
            }}
            min={format(formData.startDate, "yyyy-MM-dd")}
            required
          />
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting 
          ? (isEditing ? 'Updating...' : 'Creating...') 
          : (isEditing ? 'Update Budget' : 'Create Budget')
        }
      </Button>
    </form>
  );
} 