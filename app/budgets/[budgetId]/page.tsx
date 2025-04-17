import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Wallet, BarChart3, Calendar } from 'lucide-react';

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
  
  // Calculate the percentage spent
  const percentSpent = budget.amount > 0 
    ? Math.min(100, Math.round((budget.spent / budget.amount) * 100)) 
    : 0;
  
  return {
    ...budget,
    percentSpent,
  };
}

export default async function BudgetPage({ params }: { params: { budgetId: string } }) {
  const budget = await getBudgetData(params.budgetId);
  
  if (!budget) {
    notFound();
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{budget.category?.name || 'Budget'}</h1>
        <p className="text-muted-foreground">
          Period: {format(new Date(budget.startDate), 'MMM d, yyyy')} - {format(new Date(budget.endDate), 'MMM d, yyyy')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
            <CardTitle>Spending Progress</CardTitle>
            <CardDescription>Amount spent from budget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(budget.spent)}</div>
            <div className="mt-2">
              <Progress value={budget.percentSpent} className="h-2" />
              <div className="flex justify-between mt-1 text-sm text-muted-foreground">
                <span>{budget.percentSpent}% spent</span>
                <span>{formatCurrency(budget.amount - budget.spent)} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
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
            
            <Separator />
            
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Period</div>
                <div className="text-muted-foreground">
                  {format(new Date(budget.startDate), 'MMM d, yyyy')} - {format(new Date(budget.endDate), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* We could add transaction list here later */}
    </div>
  );
} 