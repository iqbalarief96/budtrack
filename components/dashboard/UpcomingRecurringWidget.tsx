'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, TrendingDown, TrendingUp, Play, SkipForward, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UpcomingRecurring {
  id: string;
  name: string;
  amount: number;
  type: string;
  frequency: string;
  nextDate: string;
  daysUntil: number;
}

export default function UpcomingRecurringWidget() {
  const [upcoming, setUpcoming] = useState<UpcomingRecurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    try {
      const response = await fetch('/api/recurring/upcoming?days=30');
      if (response.ok) {
        const data = await response.json();
        setUpcoming(data.upcoming || []);
      }
    } catch (error) {
      console.error('Error fetching upcoming recurring:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerNow = async (id: string, name: string) => {
    if (!confirm(`Create transaction for "${name}" now?`)) return;

    setProcessing(id);
    try {
      const response = await fetch('/api/recurring/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', recurringId: id }),
      });

      if (response.ok) {
        toast.success('Transaction created successfully! Refreshing page...');
        fetchUpcoming();
        // Reload page after 1 second to refresh all data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error('Failed to create transaction');
      }
    } catch (error) {
      toast.error('Failed to create transaction');
    } finally {
      setProcessing(null);
    }
  };

  const handleSkip = async (id: string, name: string) => {
    if (!confirm(`Skip next occurrence of "${name}"?`)) return;

    setProcessing(id);
    try {
      const response = await fetch('/api/recurring/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip', recurringId: id }),
      });

      if (response.ok) {
        toast.success('Next occurrence skipped');
        fetchUpcoming();
      } else {
        throw new Error('Failed to skip');
      }
    } catch (error) {
      toast.error('Failed to skip occurrence');
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysText = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No upcoming recurring transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcoming.slice(0, 5).map((item) => (
        <div
          key={item.id}
          className={`border rounded-lg p-3 ${
            item.daysUntil === 0 
              ? 'bg-blue-50 border-blue-200' 
              : item.daysUntil === 1
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {item.type === 'EXPENSE' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
              <div>
                <h4 className="font-medium text-sm">{item.name}</h4>
                <p className="text-xs text-gray-500">{item.frequency}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold text-sm ${
                item.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
              }`}>
                {item.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(item.amount)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3 h-3" />
              <span>{getDaysText(item.daysUntil)}</span>
              <span className="text-gray-400">
                ({new Date(item.nextDate).toLocaleDateString('id-ID')})
              </span>
            </div>

            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleTriggerNow(item.id, item.name)}
                disabled={processing === item.id}
                className="h-6 px-2 text-xs"
                title="Create now"
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSkip(item.id, item.name)}
                disabled={processing === item.id}
                className="h-6 px-2 text-xs"
                title="Skip next"
              >
                <SkipForward className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {upcoming.length > 5 && (
        <p className="text-xs text-center text-gray-500">
          +{upcoming.length - 5} more in the next 30 days
        </p>
      )}
    </div>
  );
}
