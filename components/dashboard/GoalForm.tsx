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
    id?: string;
    name: string;
    target: number;
    type: string;
    description?: string;
    targetDate: Date;
    trackedCategories?: any[];
    categoryId?: string;
  };
  isEditing?: boolean;
  formType?: 'goal' | 'budget';
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

export function GoalForm({ onSubmit, initialData, isEditing = false, formType = 'goal' }: GoalFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    target: initialData?.target || 0,
    type: initialData?.type || 'EMERGENCY_FUND',
    description: initialData?.description || '',
    targetDate: initialData?.targetDate ? new Date(initialData.targetDate).toISOString().split('T')[0] : '',
    trackedCategoryIds: initialData?.trackedCategories?.map((tc: any) => tc.id || tc.categoryId) || [],
    categoryId: initialData?.categoryId || ''
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

  // Fetch tracked categories for existing goal
  useEffect(() => {
    const fetchTrackedCategories = async () => {
      if (isEditing && initialData && 'id' in initialData) {
        try {
          const goalId = (initialData as any).id;
          const response = await fetch(`/api/goals/${goalId}/tracked-categories`);
          if (response.ok) {
            const data = await response.json();
            // Handle both array and object response formats
            const categoriesArray = Array.isArray(data) ? data : (data?.categories || []);
            setFormData(prev => ({
              ...prev,
              trackedCategoryIds: categoriesArray.map((tc: any) => tc.categoryId || tc.id)
            }));
          }
        } catch (error) {
          console.error('Error fetching tracked categories:', error);
        }
      }
    };

    fetchTrackedCategories();
    // Only depend on the goal ID, not the entire initialData object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, (initialData as any)?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data for API - omit targetDate and type, use deadline and category instead
    const { targetDate, type, ...rest } = formData;

    // Ensure we have a valid date to work with
    let deadlineValue = null;

    if (targetDate && targetDate.trim() !== '') {
      try {
        // Convert to a proper Date object
        const dateObj = new Date(targetDate);

        // Check if valid date
        if (!isNaN(dateObj.getTime())) {
          deadlineValue = dateObj;
          console.log("Valid date prepared:", deadlineValue.toISOString());
        } else {
          console.warn("Invalid date format:", targetDate);
        }
      } catch (error) {
        console.error("Error parsing date:", error);
      }
    }

    const submissionData = {
      ...rest,
      target: Number(formData.target),
      // Map 'type' to 'category' for database
      category: type,
      // Use the correct field name for the API (deadline)
      deadline: deadlineValue,
    };

    console.log("Form submission data:", {
      original: formData,
      submitted: submissionData,
      rawTargetDate: targetDate,
      parsedDate: deadlineValue
    });

    onSubmit(submissionData);
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

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId: value,
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
        <Label htmlFor="name">
          {formType === 'budget' ? 'Budget Name' : 'Goal Name'}
        </Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={formType === 'budget' ? "e.g., Monthly Expenses" : "e.g., Emergency Fund"}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">
          {formType === 'budget' ? 'Budget Type' : 'Goal Type'}
        </Label>
        <Select
          value={formData.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={formType === 'budget' ? "Select budget type" : "Select goal type"} />
          </SelectTrigger>
          <SelectContent>
            {GOAL_TYPES.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500 mt-1">
          This determines how transactions are auto-tracked to this goal
        </p>
      </div>

      {formType === 'budget' && (
        <div className="space-y-2">
          <Label htmlFor="categoryId">Budget Category</Label>
          <Select
            value={formData.categoryId}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select budget category" />
            </SelectTrigger>
            <SelectContent>
              {!loading && categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
              {loading && (
                <SelectItem value="loading" disabled>
                  Loading categories...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500 mt-1">
            Pilih kategori utama untuk budget ini
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="target">
          {formType === 'budget' ? 'Budget Amount' : 'Target Amount'}
        </Label>
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
        <Label htmlFor="targetDate">
          {formType === 'budget' ? 'End Date' : 'Target Date'}
        </Label>
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
          placeholder={formType === 'budget' ? "Add some details about your budget" : "Add some details about your goal"}
        />
      </div>

      <div className="space-y-3">
        <Label className="block mb-2">
          {formType === 'budget' ? 'Tracked Categories' : 'Auto-Track Categories'}
        </Label>
        <p className="text-sm text-gray-500 mb-3">
          {formType === 'budget'
            ? "This budget will track spending in these categories."
            : "Transactions with these categories will automatically update this goal's progress."}
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
        {isEditing
          ? (formType === 'budget' ? 'Update Budget' : 'Update Goal')
          : (formType === 'budget' ? 'Create Budget' : 'Create Goal')
        }
      </Button>
    </form>
  );
}