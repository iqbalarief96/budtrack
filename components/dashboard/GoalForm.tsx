import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface GoalFormProps {
  onSubmit: (data: any) => void;
  initialData?: {
    name: string;
    target: number;
    type: string;
    description?: string;
    targetDate: Date;
  };
  isEditing?: boolean;
}

const GOAL_TYPES = [
  { id: 'EMERGENCY_FUND', name: 'Emergency Fund' },
  { id: 'HOME_DOWN_PAYMENT', name: 'Home Down Payment' },
  { id: 'EDUCATION', name: 'Education' },
  { id: 'RETIREMENT', name: 'Retirement' },
  { id: 'VACATION', name: 'Vacation' },
  { id: 'CAR', name: 'Car' },
  { id: 'OTHER', name: 'Other' },
];

export function GoalForm({ onSubmit, initialData, isEditing = false }: GoalFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    target: initialData?.target || 0,
    type: initialData?.type || 'EMERGENCY_FUND',
    description: initialData?.description || '',
    targetDate: initialData?.targetDate ? new Date(initialData.targetDate).toISOString().split('T')[0] : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      target: Number(formData.target),
      targetDate: new Date(formData.targetDate),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      type: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Goal Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Emergency Fund"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Goal Type</Label>
        <Select
          value={formData.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select goal type" />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target">Target Amount</Label>
        <Input
          id="target"
          name="target"
          type="number"
          value={formData.target}
          onChange={handleChange}
          placeholder="0"
          min="0"
          required
        />
        {formData.target > 0 && (
          <p className="text-sm text-muted-foreground">
            {formatCurrency(Number(formData.target))}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetDate">Target Date</Label>
        <Input
          id="targetDate"
          name="targetDate"
          type="date"
          value={formData.targetDate}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add some details about your goal"
        />
      </div>

      <Button type="submit" className="w-full">
        {isEditing ? 'Update Goal' : 'Create Goal'}
      </Button>
    </form>
  );
} 