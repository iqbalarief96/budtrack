# Design Document: Salary Allocation Calculator

## Overview

Fitur Salary Allocation Calculator memungkinkan pengguna menghitung dan merencanakan alokasi gaji bulanan ke berbagai kategori pengeluaran. Sistem ini menyediakan template preset (50/30/20, 70/20/10) dan opsi custom allocation, dengan kemampuan untuk mengkonversi alokasi menjadi budget records yang dapat di-track.

## Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[Salary Allocation Page]
        Form[Allocation Form Component]
        Preview[Allocation Preview Component]
        Chart[Allocation Chart Component]
    end
    
    subgraph API Layer
        AllocAPI[/api/salary-allocation]
        ConfigAPI[/api/salary-allocation/configs]
        ApplyAPI[/api/salary-allocation/apply-to-budgets]
    end
    
    subgraph Services
        AllocService[AllocationService]
        TemplateService[TemplateService]
        BudgetMapper[BudgetMapperService]
    end
    
    subgraph Database
        AllocConfig[(SalaryAllocationConfig)]
        AllocItem[(AllocationItem)]
        Budget[(Budget)]
        Category[(Category)]
    end
    
    UI --> Form
    UI --> Preview
    UI --> Chart
    Form --> AllocAPI
    Preview --> AllocAPI
    AllocAPI --> AllocService
    AllocAPI --> TemplateService
    ConfigAPI --> AllocService
    ApplyAPI --> BudgetMapper
    AllocService --> AllocConfig
    AllocService --> AllocItem
    BudgetMapper --> Budget
    BudgetMapper --> Category
```

## Components and Interfaces

### 1. Data Types

```typescript
// Allocation Template Types
type AllocationTemplateType = '50-30-20' | '70-20-10' | 'custom';

interface AllocationTemplate {
  id: string;
  name: string;
  description: string;
  categories: AllocationCategoryTemplate[];
}

interface AllocationCategoryTemplate {
  name: string;
  type: 'needs' | 'wants' | 'savings';
  percentage: number;
  icon?: string;
  color?: string;
}

// User Allocation Configuration
interface SalaryAllocationConfig {
  id: string;
  userId: string;
  name: string;
  monthlyIncome: number;
  templateType: AllocationTemplateType;
  items: AllocationItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface AllocationItem {
  id: string;
  configId: string;
  categoryName: string;
  categoryType: 'needs' | 'wants' | 'savings';
  percentage: number;
  amount: number;
  mappedCategoryId?: string; // Link to existing Category
  icon?: string;
  color?: string;
}

// Calculation Results
interface AllocationResult {
  categoryName: string;
  categoryType: 'needs' | 'wants' | 'savings';
  percentage: number;
  amount: number;
  dailyLimit: number;
  weeklyLimit: number;
}

// Export/Import Format
interface AllocationExportData {
  version: string;
  name: string;
  templateType: AllocationTemplateType;
  items: {
    categoryName: string;
    categoryType: string;
    percentage: number;
  }[];
  exportedAt: string;
}
```

### 2. API Endpoints

```typescript
// POST /api/salary-allocation/calculate
interface CalculateRequest {
  monthlyIncome: number;
  templateType: AllocationTemplateType;
  customItems?: { categoryName: string; percentage: number }[];
}

interface CalculateResponse {
  results: AllocationResult[];
  totalAllocated: number;
  unallocatedPercentage: number;
}

// GET/POST /api/salary-allocation/configs
// Save and retrieve user configurations

// POST /api/salary-allocation/apply-to-budgets
interface ApplyToBudgetsRequest {
  configId: string;
  walletId: string;
  categoryMappings: { allocationCategory: string; categoryId: string }[];
}

// POST /api/salary-allocation/export
// GET /api/salary-allocation/import
```

### 3. Core Services

```typescript
// AllocationService - Core calculation logic
class AllocationService {
  calculateAllocation(income: number, items: AllocationItem[]): AllocationResult[];
  validatePercentages(items: { percentage: number }[]): ValidationResult;
  calculateDailyWeeklyLimits(monthlyAmount: number): { daily: number; weekly: number };
}

// TemplateService - Preset templates
class TemplateService {
  getTemplate(type: AllocationTemplateType): AllocationTemplate;
  getAllTemplates(): AllocationTemplate[];
}

// BudgetMapperService - Convert allocations to budgets
class BudgetMapperService {
  createBudgetsFromAllocation(
    config: SalaryAllocationConfig,
    walletId: string,
    categoryMappings: Map<string, string>
  ): Promise<Budget[]>;
}

// AllocationSerializer - Export/Import
class AllocationSerializer {
  serialize(config: SalaryAllocationConfig): string;
  deserialize(json: string): AllocationExportData;
  prettyPrint(data: AllocationExportData): string;
}
```

## Data Models

### Database Schema (Prisma)

```prisma
model SalaryAllocationConfig {
  id            String           @id @default(cuid())
  userId        String
  name          String
  monthlyIncome Float
  templateType  String           // '50-30-20', '70-20-10', 'custom'
  isActive      Boolean          @default(true)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  user          User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  items         AllocationItem[]

  @@index([userId])
}

model AllocationItem {
  id               String                 @id @default(cuid())
  configId         String
  categoryName     String
  categoryType     String                 // 'needs', 'wants', 'savings'
  percentage       Float
  amount           Float
  mappedCategoryId String?
  icon             String?
  color            String?
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt
  config           SalaryAllocationConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  mappedCategory   Category?              @relation(fields: [mappedCategoryId], references: [id])

  @@index([configId])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid income is stored correctly
*For any* valid positive income amount, storing it in the system should result in the same value being retrievable from the allocation interface.
**Validates: Requirements 1.1**

### Property 2: Invalid income is rejected
*For any* invalid income value (negative, zero, or non-numeric), the system should reject the input and return a validation error.
**Validates: Requirements 1.2**

### Property 3: Income update recalculates amounts
*For any* allocation configuration and new income value, updating the income should result in all allocation amounts being recalculated as (percentage / 100) * newIncome.
**Validates: Requirements 1.3**

### Property 4: Template produces correct percentages
*For any* preset template and any positive income, applying the template should produce allocation items with percentages matching the template definition and amounts equal to (percentage / 100) * income.
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 5: Custom allocation validation - over 100%
*For any* set of allocation percentages that sum to more than 100%, the system should reject the allocation and return a validation error.
**Validates: Requirements 3.2**

### Property 6: Custom allocation validation - under 100%
*For any* set of allocation percentages that sum to less than 100%, the system should accept the allocation and report the correct unallocated percentage (100 - sum).
**Validates: Requirements 3.3**

### Property 7: Allocation result contains required fields
*For any* allocation result, the display data should include category name, percentage, nominal amount, and correct daily/weekly limits (monthly / 30 and monthly / 4 respectively).
**Validates: Requirements 4.1, 4.3**

### Property 8: Budget creation from allocation
*For any* allocation applied to budgets, the system should create Budget records with amounts matching the allocation amounts and period set to monthly (start of current month to end of current month).
**Validates: Requirements 5.1, 5.4**

### Property 9: Configuration save/load round-trip
*For any* allocation configuration, saving then loading should restore the original category percentages exactly.
**Validates: Requirements 6.1, 6.2**

### Property 10: Configuration deletion
*For any* saved configuration, after deletion the configuration should not be retrievable.
**Validates: Requirements 6.3**

### Property 11: JSON serialization round-trip
*For any* valid allocation configuration, serializing to JSON then deserializing should produce an equivalent configuration with matching percentages and category names.
**Validates: Requirements 7.1, 7.2**

### Property 12: Import displays parsed data
*For any* imported JSON configuration, the system should display (pretty print) the parsed configuration data before applying, and the displayed data should match the parsed values.
**Validates: Requirements 7.3**

## Error Handling

| Error Scenario | Error Code | User Message | Recovery Action |
|----------------|------------|--------------|-----------------|
| Invalid income (negative/zero) | INVALID_INCOME | "Gaji harus lebih dari 0" | Show validation error, keep form open |
| Invalid income (non-numeric) | INVALID_INCOME_FORMAT | "Masukkan angka yang valid" | Show validation error, highlight field |
| Percentages > 100% | ALLOCATION_OVERFLOW | "Total alokasi melebihi 100%" | Show error, prevent save |
| Invalid JSON import | INVALID_IMPORT_FORMAT | "Format file tidak valid" | Show error, reject import |
| Category mapping missing | UNMAPPED_CATEGORY | "Pilih kategori untuk {name}" | Prompt user to map category |
| Config not found | CONFIG_NOT_FOUND | "Konfigurasi tidak ditemukan" | Redirect to config list |

## Testing Strategy

### Unit Testing
- Test AllocationService calculation methods with specific examples
- Test TemplateService returns correct template data
- Test validation functions for edge cases (0, negative, exactly 100%)
- Test BudgetMapperService creates correct budget records

### Property-Based Testing
Library: **fast-check** (TypeScript PBT library)

Each correctness property will be implemented as a property-based test with minimum 100 iterations:

1. **Property 1-2**: Generate random numbers (positive, negative, zero, strings) and verify storage/rejection behavior
2. **Property 3**: Generate random configs and income values, verify recalculation formula
3. **Property 4**: Generate random positive incomes, apply each template, verify percentages and amounts
4. **Property 5-6**: Generate random percentage arrays, verify validation behavior based on sum
5. **Property 7**: Generate random allocations, verify all required fields present with correct calculations
6. **Property 8**: Generate random allocations, verify budget creation with correct amounts and dates
7. **Property 9**: Generate random configs, save/load, verify equality
8. **Property 10**: Generate random configs, save/delete, verify not retrievable
9. **Property 11**: Generate random configs, serialize/deserialize, verify equality
10. **Property 12**: Generate random JSON configs, import, verify display matches parsed data

Test annotations will follow format: `**Feature: salary-allocation, Property {number}: {property_text}**`
