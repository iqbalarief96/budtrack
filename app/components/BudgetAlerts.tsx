'use client';

import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface BudgetAlert {
  id: string;
  budgetId: string;
  userId: string;
  alertType: 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  threshold: number;
  currentSpent: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  budget: {
    id: string;
    amount: number;
    category: {
      id: string;
      name: string;
      color?: string;
    };
    wallet: {
      id: string;
      name: string;
    };
  };
}

export default function BudgetAlerts() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/budgets/alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch('/api/budgets/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alertId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark alert as read');
      }

      // Remove from local state
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Failed to dismiss alert');
    }
  };

  const markAllAsRead = async () => {
    if (alerts.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/budgets/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all alerts as read');
      }

      setAlerts([]);
      toast.success('All alerts marked as read');
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      toast.error('Failed to dismiss all alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'CRITICAL':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-950/20';
      case 'EXCEEDED':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'WARNING':
        return '⚠️';
      case 'CRITICAL':
        return '🔴';
      case 'EXCEEDED':
        return '🚨';
      default:
        return '📊';
    }
  };

  const unreadCount = alerts.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Budget alerts"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 md:w-96 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Budget Alerts</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="text-xs h-7"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No budget alerts</p>
            <p className="text-xs mt-1">You're doing great!</p>
          </div>
        ) : (
          <div className="py-2">
            {alerts.map((alert) => (
              <div key={alert.id}>
                <div
                  className={cn(
                    'px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors',
                    getAlertColor(alert.alertType)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getAlertIcon(alert.alertType)}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">
                          {alert.message}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 -mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(alert.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: alert.budget.category.color
                              ? `${alert.budget.category.color}20`
                              : undefined,
                            color: alert.budget.category.color || undefined
                          }}
                        >
                          {alert.budget.category.name}
                        </span>
                        <span className="text-muted-foreground">
                          • {alert.budget.wallet.name}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
