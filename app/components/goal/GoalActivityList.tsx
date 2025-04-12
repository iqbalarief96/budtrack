import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GoalActivity {
  id: string;
  goalId: string;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
}

interface GoalActivityListProps {
  goalId: string;
  refreshTrigger?: number;
}

export function GoalActivityList({ goalId, refreshTrigger = 0 }: GoalActivityListProps) {
  const [activities, setActivities] = useState<GoalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/goals/${goalId}/activities`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch activities');
        }
        
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [goalId, refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading activities...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activities recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start justify-between border-b pb-3"
            >
              <div>
                <div className="flex items-center">
                  {activity.amount > 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={activity.amount > 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                    {formatCurrency(activity.amount)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.description || 'No description'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {format(new Date(activity.date), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(activity.createdAt), 'h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 