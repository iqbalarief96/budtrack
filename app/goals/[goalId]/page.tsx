'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, Target, Clock, TrendingUp, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tag } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { trackGoalActivityToTransaction } from '@/app/components/TransactionModalHelper';

// Type definitions
interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  type: string;
  description?: string;
  targetDate?: string;
  deadline?: string;
  status: string;
  icon?: string;
  color?: string;
}

interface GoalActivity {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  description?: string;
}

interface TrackedCategory {
  id: string;
  name: string;
}

export default function GoalDetailPage({ params }: { params: { goalId: string } }) {
  const router = useRouter();
  const { toast } = useToast();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [activities, setActivities] = useState<GoalActivity[]>([]);
  const [trackedCategories, setTrackedCategories] = useState<TrackedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [resetForm, setResetForm] = useState({
    resetValue: 0,
  });

  useEffect(() => {
    const fetchGoalData = async () => {
      try {
        setLoading(true);
        // Fetch goal data
        const goalResponse = await fetch(`/api/goals?id=${params.goalId}`);

        if (!goalResponse.ok) {
          throw new Error('Failed to fetch goal');
        }

        const goalData = await goalResponse.json();
        const targetGoal = Array.isArray(goalData)
          ? goalData.find(g => g.id === params.goalId)
          : goalData;

        if (!targetGoal) {
          throw new Error('Goal not found');
        }

        console.log('Got goal data from API:', targetGoal);
        setGoal(targetGoal);

        // Fetch activities
        const activitiesResponse = await fetch(`/api/goals/${params.goalId}/activities`);

        if (!activitiesResponse.ok) {
          throw new Error('Failed to fetch activities');
        }

        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.activities || []);

        // Fetch tracked categories - Handle errors gracefully
        try {
          const trackedCategoriesResponse = await fetch(`/api/goals/${params.goalId}/tracked-categories`);
          if (trackedCategoriesResponse.ok) {
            const trackedCategoriesData = await trackedCategoriesResponse.json();
            setTrackedCategories(trackedCategoriesData || []);
          } else {
            console.warn('Tracked categories API returned an error. Feature might not be implemented.');
            setTrackedCategories([]);
          }
        } catch (categoryError) {
          console.warn('Failed to fetch tracked categories:', categoryError);
          setTrackedCategories([]);
        }
      } catch (error) {
        console.error('Error fetching goal data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load goal data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGoalData();
  }, [params.goalId, toast]);

  // Calculate progress
  const progress = goal ? (goal.current / goal.target) * 100 : 0;
  const remaining = goal ? goal.target - goal.current : 0;

  // Get progress color
  const getProgressColor = () => {
    if (progress >= 75) return "bg-gradient-to-r from-green-500 to-green-400";
    if (progress >= 50) return "bg-gradient-to-r from-blue-600 to-blue-400";
    if (progress >= 25) return "bg-gradient-to-r from-yellow-500 to-yellow-400";
    return "bg-gradient-to-r from-red-500 to-red-400";
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setActivityForm(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  // Handle activity submission
  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create goal activity
      const response = await fetch(`/api/goals/${params.goalId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityForm),
      });

      if (!response.ok) {
        throw new Error('Failed to add activity');
      }

      // Also create a transaction if it's a manual activity (not linked to existing transaction)
      try {
        // First, get default wallet
        const walletsResponse = await fetch('/api/wallets');
        if (!walletsResponse.ok) {
          throw new Error('Failed to fetch wallets');
        }

        const wallets = await walletsResponse.json();
        const defaultWallet = wallets.find((wallet: any) => wallet.isDefault) || wallets[0];

        if (!defaultWallet) {
          throw new Error('No wallet available');
        }

        // Use helper function to create transaction from goal activity
        await trackGoalActivityToTransaction(
          params.goalId,
          activityForm.amount,
          activityForm.description || `${goal?.name} goal activity`,
          activityForm.date,
          defaultWallet.id
        );

        console.log('Transaction created successfully for goal activity');
      } catch (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // Continue execution even if transaction creation fails
      }

      // Refresh data
      const activitiesResponse = await fetch(`/api/goals/${params.goalId}/activities`);
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData.activities || []);

      // Update goal data to reflect new balance
      const goalResponse = await fetch(`/api/goals?id=${params.goalId}`);
      const goalData = await goalResponse.json();

      const targetGoal = Array.isArray(goalData)
        ? goalData.find(g => g.id === params.goalId)
        : goalData;

      setGoal(targetGoal);

      // Reset form and close dialog
      setActivityForm({
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setActivityFormOpen(false);

      toast({
        title: 'Success',
        description: 'Activity added successfully',
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to add activity. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Delete activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      const response = await fetch(`/api/goals/${params.goalId}/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      // Refresh activities
      const activitiesResponse = await fetch(`/api/goals/${params.goalId}/activities`);
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData.activities || []);

      // Update goal data to reflect new balance
      const goalResponse = await fetch(`/api/goals?id=${params.goalId}`);
      const goalData = await goalResponse.json();

      const targetGoal = Array.isArray(goalData)
        ? goalData.find(g => g.id === params.goalId)
        : goalData;

      setGoal(targetGoal);

      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete activity. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle reset progress
  const handleResetProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const response = await fetch(`/api/goals/${params.goalId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newValue: resetForm.resetValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset progress');
      }

      // Refresh data
      const goalResponse = await fetch(`/api/goals?id=${params.goalId}`);
      const goalData = await goalResponse.json();
      const targetGoal = Array.isArray(goalData)
        ? goalData.find(g => g.id === params.goalId)
        : goalData;
      setGoal(targetGoal);

      const activitiesResponse = await fetch(`/api/goals/${params.goalId}/activities`);
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData.activities || []);

      setResetDialogOpen(false);
      setResetForm({ resetValue: 0 });

      toast({
        title: 'Success',
        description: 'Goal progress reset successfully',
      });
    } catch (error) {
      console.error('Error resetting progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset progress. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle delete goal
  const handleDeleteGoal = async () => {
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/goals/${params.goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      toast({
        title: 'Success',
        description: 'Goal deleted successfully',
      });

      router.push('/goals');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative w-12 h-12">
          <div className="absolute top-0 w-full h-full rounded-full border-4 border-gray-200"></div>
          <div className="absolute top-0 w-full h-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Goal not found</h2>
        <Link href="/goals">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/goals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">{goal.name}</CardTitle>
                {goal.description && (
                  <p className="text-muted-foreground mt-1">{goal.description}</p>
                )}
              </div>
            </div>
            <Badge variant={goal.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {goal.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tracked Categories */}
          {trackedCategories.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Auto-tracked Categories</h3>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Transactions in these categories automatically contribute to this goal
              </p>
              <div className="flex flex-wrap gap-2">
                {trackedCategories.map((category) => (
                  <Badge key={category.id} variant="outline" className="bg-white">
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Target</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(goal.target)}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Current</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(goal.current)}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(remaining)}</p>
            </div>
          </div>

          {goal.deadline && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                Target date: {new Date(goal.deadline).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity History Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Activity History</h2>
          <div className="flex gap-2">
            <Dialog open={activityFormOpen} onOpenChange={setActivityFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Activity</DialogTitle>
                  <DialogDescription>
                    Record your progress towards this goal.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitActivity} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      value={activityForm.amount}
                      onChange={handleInputChange}
                      required
                    />
                    {activityForm.amount > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(activityForm.amount)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={activityForm.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      name="description"
                      value={activityForm.description}
                      onChange={handleInputChange}
                      placeholder="e.g., Monthly savings"
                    />
                  </div>

                  <Button type="submit" className="w-full">Add Activity</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Progress
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Goal Progress</DialogTitle>
                  <DialogDescription>
                    Set a new value for your goal progress. This will add an adjustment activity.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleResetProgress} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetValue">New progress value</Label>
                    <Input
                      id="resetValue"
                      name="resetValue"
                      type="number"
                      step="0.01"
                      value={resetForm.resetValue}
                      onChange={(e) => setResetForm({ ...resetForm, resetValue: parseFloat(e.target.value) || 0 })}
                      required
                    />
                    {resetForm.resetValue > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(resetForm.resetValue)}
                      </p>
                    )}
                  </div>

                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      This will replace your current progress of {formatCurrency(goal.current)} with the new value.
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" className="w-full" variant="destructive" disabled={isResetting}>
                    {isResetting ? 'Resetting...' : 'Reset Progress'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="destructive" onClick={handleDeleteGoal}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Goal
            </Button>
          </div>
        </div>

        {activities.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your progress by adding activities.
            </p>
            <Button onClick={() => setActivityFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Activity
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      {new Date(activity.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{activity.description || 'No description'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(activity.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
