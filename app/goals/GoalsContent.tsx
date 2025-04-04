'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { GoalForm } from '@/components/dashboard/GoalForm';
import { FiPlus, FiTarget } from 'react-icons/fi';

export function GoalsContent() {
  const [goals, setGoals] = useState<any[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create goal');
      
      setIsAddingGoal(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleUpdateGoal = async (id: string, data: any) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });

      if (!response.ok) throw new Error('Failed to update goal');
      
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
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

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FiTarget className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Financial Goals</h3>
              <p className="text-sm text-blue-100">Track your progress toward financial freedom</p>
            </div>
          </div>
          <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
            <DialogTrigger asChild>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                <FiPlus className="h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <GoalForm onSubmit={handleCreateGoal} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-blue-50 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
            <FiTarget className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mt-4">No goals yet</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Set financial goals to track your progress and stay motivated on your financial journey.
          </p>
          <Button 
            className="mt-6 bg-blue-600 hover:bg-blue-700" 
            onClick={() => setIsAddingGoal(true)}
          >
            <FiPlus className="mr-2 h-4 w-4" />
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={handleUpdateGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
} 