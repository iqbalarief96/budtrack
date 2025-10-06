'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BudgetFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    amount: number;
    categoryId?: string;
    walletId?: string;
  };
  isEditing: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Wallet {
  id: string;
  name: string;
}

export function BudgetForm({ onSubmit, initialData, isEditing }: BudgetFormProps) {
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [amount, setAmount] = useState(initialData.amount);
  const [startDate, setStartDate] = useState(initialData.startDate);
  const [endDate, setEndDate] = useState(initialData.endDate);
  const [categoryId, setCategoryId] = useState(initialData.categoryId || '');
  const [walletId, setWalletId] = useState(initialData.walletId || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, walletsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/wallets')
        ]);
        
        const categoriesData = await categoriesRes.json();
        const walletsData = await walletsRes.json();
        
        setCategories(categoriesData);
        setWallets(walletsData);
        
        // Set default selections if not already set
        if (!categoryId && categoriesData.length > 0) {
          setCategoryId(categoriesData[0].id);
        }
        if (!walletId && walletsData.length > 0) {
          setWalletId(walletsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryId || !walletId) {
      alert('Please select both a category and wallet');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        startDate,
        endDate,
        amount,
        categoryId,
        walletId
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wallet">Wallet</Label>
          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger>
              <SelectValue placeholder="Select wallet" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Budget Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (Rp)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isEditing ? 'Update Budget' : 'Create Budget'}
      </Button>
    </form>
  );
}