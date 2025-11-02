import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Wallet, BarChart3, Calendar, ArrowLeft, Edit2, RefreshCw, Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import BudgetDetailClient from './BudgetDetailClient';
import { calculateBudgetDetails, isActiveBudget } from '@/lib/budgetCalculations';

// Fetch budget data
async function getBudgetData(budgetId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const budget = await prisma.budget.findUnique({
    where: {
      id: budgetId,
    },
    include: {
      category: true,
      wallet: true,
    },
  });

  if (!budget || budget.userId !== session.user.id) {
    return null;
  }

  // Calculate actual spending using the new calculation logic
  const { spent, percentage, remaining } = await calculateBudgetDetails({
    id: budget.id,
    userId: budget.userId,
    walletId: budget.walletId,
    categoryId: budget.categoryId,
    amount: budget.amount,
    startDate: budget.startDate,
    endDate: budget.endDate,
  });

  const active = isActiveBudget({
    startDate: budget.startDate,
    endDate: budget.endDate,
  });

  // Parse notification thresholds
  let thresholds = { warning: 80, critical: 100 };
  if (budget.notificationThresholds) {
    try {
      thresholds = JSON.parse(budget.notificationThresholds);
    } catch (e) {
      console.error('Failed to parse notification thresholds:', e);
    }
  }

  return {
    ...budget,
    spent,
    percentSpent: percentage,
    remaining,
    isActive: active,
    thresholds,
  };
}

export default async function BudgetPage({ params }: { params: { budgetId: string } }) {
  const budget = await getBudgetData(params.budgetId);
  
  if (!budget) {
    notFound();
  }
  
  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-4">
        <Link href="/budgets" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Kembali ke Anggaran</span>
        </Link>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{budget.category?.name || 'Budget'}</h1>
            {budget.isActive ? (
              <Badge variant="default" className="bg-green-500">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {budget.isRecurring && (
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Recurring
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {format(new Date(budget.startDate), 'MMM d, yyyy')} - {format(new Date(budget.endDate), 'MMM d, yyyy')}
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span>Alerts at {budget.thresholds.warning}% (warning) and {budget.thresholds.critical}% (critical)</span>
          </div>
        </div>
        <Button asChild variant="outline" className="flex items-center gap-2">
          <Link href={`/budgets/${params.budgetId}/edit`}>
            <Edit2 className="h-4 w-4" />
            <span>Edit Budget</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Budget Amount</CardTitle>
            <CardDescription>Total allocated budget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(budget.amount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amount Spent</CardTitle>
            <CardDescription>Total expenses so far</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(budget.spent)}</div>
            <div className="mt-2">
              <Progress
                value={Math.min(100, budget.percentSpent)}
                className="h-2"
              />
              <div className="flex justify-between mt-1 text-sm text-muted-foreground">
                <span>{budget.percentSpent.toFixed(1)}% spent</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remaining</CardTitle>
            <CardDescription>Available to spend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${budget.remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(budget.remaining)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {budget.remaining > 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Wallet</div>
                  <div className="text-muted-foreground">{budget.wallet?.name || 'No wallet'}</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-muted-foreground">{budget.category?.name || 'Uncategorized'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Period</div>
                  <div className="text-muted-foreground">
                    {format(new Date(budget.startDate), 'MMM d, yyyy')} - {format(new Date(budget.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Type</div>
                  <div className="text-muted-foreground">
                    {budget.isRecurring ? `Recurring (${budget.periodType})` : 'One-time budget'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BudgetDetailClient
        budgetId={params.budgetId}
        budgetAmount={budget.amount}
        isRecurring={budget.isRecurring}
        periodType={budget.periodType}
      />
    </div>
  );
} 