import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { FiClock, FiTrendingUp, FiTarget, FiArrowRight, FiTrash2, FiEdit } from 'react-icons/fi';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface GoalCardProps {
  goal: {
    id: string;
    name: string;
    target: number;
    current: number;
    type: string;
    description?: string;
    targetDate?: Date | string;
    deadline?: Date | string;
    estimatedMonths?: number | null;
    averageMonthly?: number;
    status: string;
  };
  onUpdate?: (id: string, data: any) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function GoalCard({ goal, onUpdate, onDelete, onEdit }: GoalCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const progress = (goal.current / goal.target) * 100;
  const remaining = goal.target - goal.current;
  
  // Parse and validate the target date
  let targetDate: Date | null = null;
  try {
    // Try both targetDate and deadline fields
    const dateValue = goal.targetDate || goal.deadline || null;
    console.log('Debug date value:', {
      targetDate: goal.targetDate,
      deadline: goal.deadline, 
      dateValue,
      goalData: goal
    });
    
    targetDate = dateValue ? new Date(dateValue) : null;
    console.log('Parsed date:', targetDate);
    
    // Check if date is valid
    if (targetDate && isNaN(targetDate.getTime())) {
      console.log('Invalid date detected!');
      targetDate = null;
    }
  } catch (error) {
    console.error('Error parsing target date:', error);
    targetDate = null;
  }
  
  // Get color based on progress
  const getProgressColor = () => {
    if (progress >= 75) return "bg-gradient-to-r from-green-500 to-green-400";
    if (progress >= 50) return "bg-gradient-to-r from-blue-600 to-blue-400";
    if (progress >= 25) return "bg-gradient-to-r from-yellow-500 to-yellow-400";
    return "bg-gradient-to-r from-red-500 to-red-400";
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the Link from being triggered
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    setIsDeleting(true);

    try {
      // Call parent's onDelete if provided
      if (onDelete) {
        onDelete(goal.id);

        toast({
          title: 'Success',
          description: 'Goal deleted successfully!'
        });
      } else {
        // Reload the page if no onDelete handler is provided
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete goal. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the Link from being triggered
    e.stopPropagation();

    if (onEdit) {
      onEdit(goal.id);
    }
  };
  
  return (
    <Link href={`/goals/${goal.id}`} className="block">
      <Card className="w-full overflow-hidden border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
        <div className={`h-1 w-full ${getProgressColor()}`}></div>
        <CardHeader className="pb-2 pt-5 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50">
              <FiTarget className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
              {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
            </div>
            {goal.status === 'COMPLETED' && (
              <span className="ml-auto text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Progress</p>
                <p className="text-sm font-medium text-blue-600">{Math.round(progress)}%</p>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor()} transition-all duration-500 ease-in-out`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Current</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(goal.current)}
                  </p>
                </div>
                <div className="text-gray-300">
                  <FiArrowRight className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-500">Target</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(goal.target)}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500 flex items-center justify-between">
                  <span>{remaining > 0 ? `${formatCurrency(remaining)} remaining` : 'Goal achieved!'}</span>
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                    Target: {targetDate ? targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Invalid Date'}
                  </span>
                </p>
              </div>
            </div>
            
            {goal.estimatedMonths !== undefined && goal.estimatedMonths !== null && (
              <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg">
                <div className="p-2 bg-blue-50 rounded-full flex-shrink-0">
                  <FiClock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Estimated Completion</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {goal.estimatedMonths} months at current rate
                  </p>
                  
                  {goal.averageMonthly && goal.averageMonthly > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <FiTrendingUp className="h-4 w-4 text-green-500" />
                      <p className="text-sm text-gray-600">
                        {formatCurrency(goal.averageMonthly)}/month average
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={(e) => {
                e.preventDefault(); // Prevent the Link from being triggered
                window.location.href = `/goals/${goal.id}`;
              }}>
                <FiArrowRight className="h-4 w-4 mr-2" />
                View Details
              </Button>

              <Button variant="outline" className="w-auto" onClick={handleEdit}>
                <FiEdit className="h-4 w-4" />
              </Button>

              <Button variant="destructive" className="w-auto" onClick={handleDelete} disabled={isDeleting}>
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
} 