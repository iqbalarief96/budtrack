'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/app/components/SearchableSelect';
import { toast } from 'react-hot-toast';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

function budgetDateFromInput(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function budgetDateToInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function monthlyEndDate(startDate: Date): Date {
  const end = new Date(startDate);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return end;
}

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
  onSuccess?: () => void;
}

export default function BudgetForm({ 
  userId, 
  categories, 
  wallets, 
  initialData,
  isEditing = false,
  onSuccess
}: BudgetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultStartDate = initialData?.startDate || budgetDateFromInput(format(new Date(), 'yyyy-MM-dd'));
  const defaultEndDate = initialData?.endDate || monthlyEndDate(defaultStartDate);
  
  const [formData, setFormData] = useState({
    amount: initialData?.amount || 0,
    categoryId: initialData?.categoryId || (categories[0]?.id || ''),
    walletId: initialData?.walletId || (wallets.find(w => w.isDefault)?.id || wallets[0]?.id || ''),
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    period: 'monthly',
    isRecurring: false,
    warningThreshold: 80,
    criticalThreshold: 100,
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      console.log('[DEBUG] Form already submitting, ignoring duplicate submit');
      return;
    }

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
      
      const notificationThresholds = JSON.stringify({
        warning: formData.warningThreshold,
        critical: formData.criticalThreshold,
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(isEditing && initialData?.id ? { id: initialData.id } : {}),
          ...formData,
          periodType,
          notificationThresholds,
          userId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to save budget');
      }
      
      const result = await response.json();
      console.log('Budget created/updated successfully:', result);

      toast.success(isEditing ? 'Budget updated!' : 'Budget created!');

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Only redirect if no onSuccess callback (i.e., not in modal)
        if (isEditing && initialData?.id) {
          router.push(`/budgets/${initialData.id}`);
        } else {
          router.push('/budgets');
        }
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save budget');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePeriodChange = (period: string) => {
    setFormData(prev => {
      const currentStartDate = prev.startDate;
      let newEndDate = new Date(currentStartDate);
      
      switch (period) {
        case 'daily':
          newEndDate = addDays(currentStartDate, 1);
          break;
        case 'weekly':
          newEndDate = addWeeks(currentStartDate, 1);
          break;
        case 'monthly':
          newEndDate = monthlyEndDate(currentStartDate);
          break;
        default:
          newEndDate = addMonths(currentStartDate, 1);
      }
      
      return {
        ...prev,
        period,
        endDate: newEndDate
      };
    });
  };

  const periodType = formData.period === 'daily' ? 'DAILY' : formData.period === 'weekly' ? 'WEEKLY' : 'MONTHLY';
  
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
          onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
          placeholder="0.00"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <SearchableSelect
          options={categories.map(category => ({ id: category.id, name: category.name, color: category.color }))}
          value={formData.categoryId}
          onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
          placeholder="Search category..."
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="wallet">Wallet</Label>
        <SearchableSelect
          options={wallets.map(wallet => ({ id: wallet.id, name: wallet.name }))}
          value={formData.walletId}
          onChange={(value) => setFormData(prev => ({ ...prev, walletId: value }))}
          placeholder="Search wallet..."
          required
        />
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
            value={budgetDateToInput(formData.startDate)}
            onChange={(e) => {
              const date = budgetDateFromInput(e.target.value);
              if (!isNaN(date.getTime())) {
                setFormData(prev => ({
                  ...prev,
                  startDate: date,
                  endDate: prev.period === 'monthly' ? monthlyEndDate(date) : prev.endDate,
                }));
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
            value={budgetDateToInput(formData.endDate)}
            onChange={(e) => {
              const date = budgetDateFromInput(e.target.value);
              if (!isNaN(date.getTime())) {
                setFormData(prev => ({ ...prev, endDate: date }));
              }
            }}
            min={budgetDateToInput(formData.startDate)}
            required
          />
        </div>
      </div>

      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <input
            id="isRecurring"
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
            Auto-reset monthly
          </Label>
        </div>
        <p className="text-sm text-muted-foreground ml-6">
          Automatically reset this budget at the end of each period and save history
        </p>

        <div className="space-y-3 mt-4">
          <Label className="text-sm font-medium">Alert Thresholds</Label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="warningThreshold" className="text-sm text-muted-foreground">
                Warning at
              </Label>
              <span className="text-sm font-medium">{formData.warningThreshold}%</span>
            </div>
            <Input
              id="warningThreshold"
              type="range"
              min="50"
              max="100"
              step="5"
              value={formData.warningThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, warningThreshold: parseInt(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Get notified when spending reaches this percentage
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="criticalThreshold" className="text-sm text-muted-foreground">
                Critical at
              </Label>
              <span className="text-sm font-medium">{formData.criticalThreshold}%</span>
            </div>
            <Input
              id="criticalThreshold"
              type="range"
              min="80"
              max="120"
              step="5"
              value={formData.criticalThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, criticalThreshold: parseInt(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Critical alert when budget limit is reached or exceeded
            </p>
          </div>
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