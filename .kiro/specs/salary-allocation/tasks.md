# Implementation Plan

## 1. Database Schema and Core Types

- [x] 1.1 Add Prisma schema for SalaryAllocationConfig and AllocationItem models
  - Add SalaryAllocationConfig model with userId, name, monthlyIncome, templateType, isActive fields
  - Add AllocationItem model with configId, categoryName, categoryType, percentage, amount, mappedCategoryId fields
  - Add relation to User model
  - Add relation from AllocationItem to Category for mapping
  - Run prisma migrate
  - _Requirements: 6.1, 3.4_

- [x] 1.2 Create TypeScript type definitions for allocation feature
  - Create `app/types/allocation.ts` with AllocationTemplate, AllocationItem, AllocationResult, AllocationExportData interfaces
  - Define AllocationTemplateType union type
  - _Requirements: 2.4, 4.1_

## 2. Core Allocation Services

- [x] 2.1 Implement AllocationService with calculation logic
  - Create `lib/allocation/allocation-service.ts`
  - Implement `calculateAllocation(income, items)` method that computes amounts from percentages
  - Implement `validatePercentages(items)` method that checks sum <= 100
  - Implement `calculateDailyWeeklyLimits(monthlyAmount)` method
  - _Requirements: 1.3, 3.1, 3.2, 3.3, 4.3_

- [x] 2.2 Write property test for income recalculation
  - **Property 3: Income update recalculates amounts**
  - **Validates: Requirements 1.3**

- [x] 2.3 Write property test for percentage validation over 100%
  - **Property 5: Custom allocation validation - over 100%**
  - **Validates: Requirements 3.2**

- [x] 2.4 Write property test for percentage validation under 100%
  - **Property 6: Custom allocation validation - under 100%**
  - **Validates: Requirements 3.3**

- [x] 2.5 Implement TemplateService for preset allocation templates
  - Create `lib/allocation/template-service.ts`
  - Define 50/30/20 template (50% needs, 30% wants, 20% savings)
  - Define 70/20/10 template (70% needs, 20% savings, 10% wants)
  - Implement `getTemplate(type)` and `getAllTemplates()` methods
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2.6 Write property test for template percentage calculation
  - **Property 4: Template produces correct percentages**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 3. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

## 3. Serialization Service

- [x] 3.1 Implement AllocationSerializer for export/import
  - Create `lib/allocation/allocation-serializer.ts`
  - Implement `serialize(config)` method that converts config to JSON string
  - Implement `deserialize(json)` method that parses JSON to AllocationExportData
  - Implement `prettyPrint(data)` method for display before applying import
  - Add version field for future compatibility
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 3.2 Write property test for JSON serialization round-trip
  - **Property 11: JSON serialization round-trip**
  - **Validates: Requirements 7.1, 7.2**

- [x] 3.3 Write property test for import display
  - **Property 12: Import displays parsed data**
  - **Validates: Requirements 7.3**

## 4. API Endpoints

- [x] 4.1 Create calculation API endpoint
  - Create `app/api/salary-allocation/calculate/route.ts`
  - Handle POST request with monthlyIncome, templateType, customItems
  - Validate income (positive number)
  - Return AllocationResult array with amounts and limits
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 4.2 Write property test for valid income storage
  - **Property 1: Valid income is stored correctly**
  - **Validates: Requirements 1.1**

- [x] 4.3 Write property test for invalid income rejection
  - **Property 2: Invalid income is rejected**
  - **Validates: Requirements 1.2**

- [x] 4.4 Create configuration CRUD API endpoints
  - Create `app/api/salary-allocation/configs/route.ts` for GET (list) and POST (create)
  - Create `app/api/salary-allocation/configs/[configId]/route.ts` for GET, PUT, DELETE
  - Implement save with user-defined name
  - Implement load with recalculation based on stored percentages
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 4.5 Write property test for configuration save/load round-trip
  - **Property 9: Configuration save/load round-trip**
  - **Validates: Requirements 6.1, 6.2**

- [x] 4.6 Write property test for configuration deletion
  - **Property 10: Configuration deletion**
  - **Validates: Requirements 6.3**

- [x] 4.7 Create export/import API endpoints
  - Create `app/api/salary-allocation/export/route.ts` for POST (export config to JSON)
  - Create `app/api/salary-allocation/import/route.ts` for POST (import JSON, return parsed data)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## 5. Budget Integration

- [x] 5.1 Implement BudgetMapperService
  - Create `lib/allocation/budget-mapper-service.ts`
  - Implement `createBudgetsFromAllocation(config, walletId, categoryMappings)` method
  - Create Budget records with correct amounts and monthly period
  - Handle category mapping from allocation categories to existing expense categories
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 5.2 Write property test for budget creation from allocation
  - **Property 8: Budget creation from allocation**
  - **Validates: Requirements 5.1, 5.4**

- [x] 5.3 Create apply-to-budgets API endpoint
  - Create `app/api/salary-allocation/apply-to-budgets/route.ts`
  - Handle POST with configId, walletId, categoryMappings
  - Return created budget IDs
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## 6. Frontend Components

- [x] 6.1 Create Salary Allocation page
  - Create `app/salary-allocation/page.tsx`
  - Server component that fetches user's saved configs and categories
  - Pass data to client component
  - _Requirements: 1.1, 2.4_

- [x] 6.2 Create AllocationForm component
  - Create `app/components/allocation/AllocationForm.tsx`
  - Income input field with validation
  - Template selector (50/30/20, 70/20/10, Custom)
  - Custom percentage inputs when custom selected
  - Real-time validation feedback
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

- [x] 6.3 Create AllocationPreview component
  - Create `app/components/allocation/AllocationPreview.tsx`
  - Display allocation results with percentage and nominal amount
  - Show daily and weekly spending limits
  - Show unallocated percentage warning if applicable
  - _Requirements: 4.1, 4.3_

- [x] 6.4 Write property test for allocation result fields
  - **Property 7: Allocation result contains required fields**
  - **Validates: Requirements 4.1, 4.3**

- [x] 6.5 Create AllocationChart component
  - Create `app/components/allocation/AllocationChart.tsx`
  - Pie chart or progress bars showing allocation distribution
  - Color-coded by category type (needs, wants, savings)
  - _Requirements: 4.2_

- [x] 6.6 Create SavedConfigsList component
  - Create `app/components/allocation/SavedConfigsList.tsx`
  - List saved configurations with name and template type
  - Load, edit, delete actions
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 6.7 Create ApplyToBudgetsModal component
  - Create `app/components/allocation/ApplyToBudgetsModal.tsx`
  - Wallet selector
  - Category mapping interface for each allocation category
  - Confirm button to create budgets
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.8 Create ImportExportButtons component
  - Create `app/components/allocation/ImportExportButtons.tsx`
  - Export button that downloads JSON file
  - Import button with file picker
  - Preview modal showing parsed data before applying
  - _Requirements: 7.1, 7.2, 7.3_

## 7. Navigation and Integration

- [x] 7.1 Add Salary Allocation to sidebar navigation
  - Update `app/components/Sidebar.tsx` to include Salary Allocation link
  - Add appropriate icon
  - _Requirements: 1.1_

- [x] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
