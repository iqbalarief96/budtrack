// Allocation Template Types
export type AllocationTemplateType = '50-30-20' | '70-20-10' | 'custom';

export type AllocationCategoryType = 'needs' | 'wants' | 'savings';

export interface AllocationCategoryTemplate {
  name: string;
  type: AllocationCategoryType;
  percentage: number;
  icon?: string;
  color?: string;
}

export interface AllocationTemplate {
  id: string;
  name: string;
  description: string;
  categories: AllocationCategoryTemplate[];
}

// User Allocation Configuration (matches Prisma model)
export interface SalaryAllocationConfig {
  id: string;
  userId: string;
  name: string;
  monthlyIncome: number;
  templateType: AllocationTemplateType;
  isActive: boolean;
  items: AllocationItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AllocationItem {
  id: string;
  configId: string;
  categoryName: string;
  categoryType: AllocationCategoryType;
  percentage: number;
  amount: number;
  mappedCategoryId?: string | null;
  icon?: string | null;
  color?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Calculation Results
export interface AllocationResult {
  categoryName: string;
  categoryType: AllocationCategoryType;
  percentage: number;
  amount: number;
  dailyLimit: number;
  weeklyLimit: number;
  icon?: string;
  color?: string;
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  totalPercentage: number;
  unallocatedPercentage: number;
  error?: string;
}

// Export/Import Format
export interface AllocationExportData {
  version: string;
  name: string;
  templateType: AllocationTemplateType;
  items: {
    categoryName: string;
    categoryType: string;
    percentage: number;
    icon?: string;
    color?: string;
  }[];
  exportedAt: string;
}

// API Request/Response Types
export interface CalculateAllocationRequest {
  monthlyIncome: number;
  templateType: AllocationTemplateType;
  customItems?: {
    categoryName: string;
    categoryType: AllocationCategoryType;
    percentage: number;
    icon?: string;
    color?: string;
  }[];
}

export interface CalculateAllocationResponse {
  results: AllocationResult[];
  totalAllocated: number;
  unallocatedPercentage: number;
}

export interface ApplyToBudgetsRequest {
  configId: string;
  walletId: string;
  categoryMappings: {
    allocationCategory: string;
    categoryId: string;
  }[];
}

export interface SaveConfigRequest {
  name: string;
  monthlyIncome: number;
  templateType: AllocationTemplateType;
  items: {
    categoryName: string;
    categoryType: AllocationCategoryType;
    percentage: number;
    icon?: string;
    color?: string;
  }[];
}
