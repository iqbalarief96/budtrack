import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

interface GoalActivityFormProps {
  goalId: string;
  onSuccess?: (data: any) => void;
}

export function GoalActivityForm({ goalId, onSuccess }: GoalActivityFormProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !date) {
      toast.error('Amount and date are required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/goals/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          amount: parseFloat(amount),
          description,
          date: date.toISOString(),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add activity');
      }
      
      const data = await response.json();
      toast.success('Activity added successfully');
      
      // Reset form
      setAmount('');
      setDescription('');
      setDate(new Date());
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add activity');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-sm text-gray-500">
              Positive amounts add to your goal, negative amounts subtract
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this progress"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adding...' : 'Add Progress'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 