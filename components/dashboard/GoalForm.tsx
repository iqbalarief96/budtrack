import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface GoalFormProps {
  onSubmit: (data: any) => void;
  initialData?: {
    name: string;
    target: number;
    type: string;
    description?: string;
    targetDate: Date;
    trackedCategories?: any[];
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
    trackedCategoryIds: initialData?.trackedCategories?.map((tc: any) => tc.categoryId) || []
  });
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

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
  
  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => {
      // Check if category is already selected
      const isSelected = prev.trackedCategoryIds.includes(categoryId);
      
      // If selected, remove it; otherwise, add it
      const newTrackedCategoryIds = isSelected
        ? prev.trackedCategoryIds.filter(id => id !== categoryId)
        : [...prev.trackedCategoryIds, categoryId];
      
      return {
        ...prev,
        trackedCategoryIds: newTrackedCategoryIds
      };
    });
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
      
      <div className="space-y-3">
        <Label className="block mb-2">Auto-Track Categories</Label>
        <p className="text-sm text-gray-500 mb-3">
          Transactions with these categories will automatically update this goal's progress.
        </p>
        
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-2 text-center py-2">
                No categories found
              </p>
            ) : (
              categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category.id}`}
                    checked={formData.trackedCategoryIds.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <label
                    htmlFor={`category-${category.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category.name}
                  </label>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full">
        {isEditing ? 'Update Goal' : 'Create Goal'}
      </Button>
    </form>
  );
} 