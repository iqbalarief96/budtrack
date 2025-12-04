'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Target, Calendar, DollarSign } from 'lucide-react';
import type { NetWorthGoal, CreateGoalInput, UpdateGoalInput } from '@/app/types/net-worth';

/**
 * NetWorthGoalForm Component
 * Form for creating/editing net worth goals
 * 
 * Requirements: 4.1, 4.5
 */

interface NetWorthGoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalInput | UpdateGoalInput) => Promise<void>;
  existingGoal?: NetWorthGoal | null;
  currentNetWorth?: number;
  isLoading?: boolean;
}

export const NetWorthGoalForm: React.FC<NetWorthGoalFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingGoal,
  currentNetWorth = 0,
  isLoading = false,
}) => {
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!existingGoal;

  // Initialize form with existing goal data
  useEffect(() => {
    if (existingGoal) {
      setTargetAmount(existingGoal.targetAmount.toString());
      setTargetDate(new Date(existingGoal.targetDate).toISOString().split('T')[0]);
      setIsActive(existingGoal.isActive);
    } else {
      // Default values for new goal
      setTargetAmount('');
      setTargetDate('');
      setIsActive(true);
    }
    setError(null);
  }, [existingGoal, isOpen]);

  // Calculate months until target date
  const calculateMonthsRemaining = () => {
    if (!targetDate) return 0;
    const target = new Date(targetDate);
    const now = new Date();
    const months = (target.getFullYear() - now.getFullYear()) * 12 
      + (target.getMonth() - now.getMonth());
    return Math.max(0, months);
  };

  // Calculate required monthly growth
  const calculateRequiredGrowth = () => {
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) return 0;
    
    const remaining = amount - currentNetWorth;
    if (remaining <= 0) return 0;
    
    const months = calculateMonthsRemaining();
    if (months <= 0) return remaining;
    
    return remaining / months;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Target amount harus berupa angka positif');
      return;
    }

    if (!targetDate) {
      setError('Target date harus diisi');
      return;
    }

    const targetDateObj = new Date(targetDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (targetDateObj < now) {
      setError('Target date tidak boleh di masa lalu');
      return;
    }

    try {
      if (isEditing) {
        await onSubmit({
          targetAmount: amount,
          targetDate: targetDateObj,
          isActive,
        } as UpdateGoalInput);
      } else {
        await onSubmit({
          targetAmount: amount,
          targetDate: targetDateObj,
        } as CreateGoalInput);
      }
      onClose();
    } catch (err) {
      setError('Gagal menyimpan goal. Silakan coba lagi.');
    }
  };

  const monthsRemaining = calculateMonthsRemaining();
  const requiredGrowth = calculateRequiredGrowth();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            {isEditing ? 'Edit Target Net Worth' : 'Buat Target Net Worth'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Perbarui target net worth Anda'
              : 'Tetapkan target net worth yang ingin Anda capai'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Net Worth Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-muted-foreground">Net Worth Saat Ini</div>
              <div className="text-lg font-semibold">
                {formatCurrency(currentNetWorth)}
              </div>
            </div>

            {/* Target Amount */}
            <div className="space-y-2">
              <Label htmlFor="targetAmount" className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                Target Amount
              </Label>
              <Input
                id="targetAmount"
                type="number"
                min="1"
                step="1000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Contoh: 500000000"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Masukkan target net worth yang ingin dicapai
              </p>
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate" className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Target Date
              </Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Kapan Anda ingin mencapai target ini
              </p>
            </div>

            {/* Active Status (only for editing) */}
            {isEditing && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Status Aktif</Label>
                  <p className="text-xs text-muted-foreground">
                    Goal yang tidak aktif tidak akan ditampilkan di dashboard
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            {/* Preview Calculation */}
            {targetAmount && targetDate && parseFloat(targetAmount) > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                <div className="text-sm font-medium text-blue-800">Preview</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Target:</span>
                    <span className="ml-1 font-medium">
                      {formatCurrency(parseFloat(targetAmount))}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Waktu:</span>
                    <span className="ml-1 font-medium">{monthsRemaining} bulan</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Pertumbuhan/bulan:</span>
                    <span className="ml-1 font-medium">
                      {formatCurrency(requiredGrowth)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? 'Menyimpan...' 
                : isEditing ? 'Simpan Perubahan' : 'Buat Target'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NetWorthGoalForm;
