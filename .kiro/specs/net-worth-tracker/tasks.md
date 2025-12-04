# Implementation Plan - Net Worth Tracker

- [x] 1. Setup database schema dan types






  - [x] 1.1 Add NetWorthSnapshot and NetWorthGoal models to Prisma schema

    - Add models dengan fields sesuai design document
    - Run prisma migrate
    - _Requirements: 2.3, 4.1_
  - [x] 1.2 Create TypeScript types for net worth feature


    - Create `app/types/net-worth.ts` dengan interfaces
    - _Requirements: 1.1, 4.1_


- [x] 2. Implement NetWorthCalculator service




  - [x] 2.1 Create NetWorthCalculator with core calculation logic


    - Create `lib/net-worth/calculator.ts`
    - Implement calculateAssets, calculateLiabilities, calculate methods
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 2.2 Write property test for net worth calculation


    - **Property 1: Net Worth Calculation Accuracy**
    - **Validates: Requirements 1.1, 1.3, 1.4**
  - [x] 2.3 Implement breakdown grouping by category


    - Implement groupByCategory method
    - _Requirements: 1.2, 3.1, 3.2_
  - [x] 2.4 Write property tests for breakdown consistency


    - **Property 2: Asset Breakdown Sum Consistency**
    - **Property 3: Liability Breakdown Sum Consistency**
    - **Validates: Requirements 1.2, 3.1, 3.2**
  - [x] 2.5 Implement percentage change calculation


    - Add calculateChange method
    - _Requirements: 1.5, 3.5_
  - [x] 2.6 Write property test for percentage change


    - **Property 4: Percentage Change Calculation**
    - **Validates: Requirements 1.5, 3.5**


- [x] 3. Implement SnapshotService





  - [x] 3.1 Create SnapshotService with CRUD operations


    - Create `lib/net-worth/snapshot-service.ts`
    - Implement createSnapshot, getHistory, getLatestSnapshot
    - _Requirements: 2.1, 2.3_
  - [x] 3.2 Implement time filter logic


    - Add filtering by period (3M, 6M, 1Y, ALL)
    - _Requirements: 2.2_

  - [x] 3.3 Write property test for time filter

    - **Property 5: Time Filter Accuracy**
    - **Validates: Requirements 2.2**

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Implement NetWorthGoalService


  - [x] 5.1 Create NetWorthGoalService with CRUD operations


    - Create `lib/net-worth/goal-service.ts`
    - Implement createGoal, updateGoal, deleteGoal, getGoals
    - _Requirements: 4.1, 4.5_
  - [x] 5.2 Implement goal progress calculation


    - Add calculateProgress method
    - _Requirements: 4.2_
  - [x] 5.3 Write property test for goal progress


    - **Property 6: Goal Progress Calculation**
    - **Validates: Requirements 4.2**
  - [x] 5.4 Implement required monthly growth rate calculation

    - Add calculateRequiredGrowth method
    - _Requirements: 4.3_
  - [x] 5.5 Write property test for required growth rate

    - **Property 7: Required Monthly Growth Rate**
    - **Validates: Requirements 4.3**

  - [x] 5.6 Implement milestone detection
    - Add checkMilestone method
    - _Requirements: 4.4_

  - [x] 5.7 Write property test for milestone detection
    - **Property 8: Milestone Detection**

    - **Validates: Requirements 4.4**
  - [x] 5.8 Write property test for goal data round-trip

    - **Property 9: Goal Data Round-Trip**
    - **Validates: Requirements 4.1, 4.5**

- [x] 6. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.


- [x] 7. Create API endpoints




  - [x] 7.1 Create GET /api/net-worth endpoint


    - Create `app/api/net-worth/route.ts`
    - Return current net worth with breakdown
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 Create GET /api/net-worth/history endpoint

    - Create `app/api/net-worth/history/route.ts`
    - Return historical snapshots with filtering
    - _Requirements: 2.1, 2.2_

  - [x] 7.3 Create POST /api/net-worth/snapshot endpoint

    - Create `app/api/net-worth/snapshot/route.ts`
    - Create manual snapshot
    - _Requirements: 2.3_

  - [x] 7.4 Create CRUD endpoints for goals

    - Create `app/api/net-worth/goals/route.ts` (GET, POST)
    - Create `app/api/net-worth/goals/[goalId]/route.ts` (PUT, DELETE)
    - _Requirements: 4.1, 4.5_

- [x] 8. Create UI components






  - [x] 8.1 Create NetWorthCard component

    - Create `components/net-worth/NetWorthCard.tsx`
    - Display current net worth with change indicator
    - _Requirements: 1.1, 1.5_

  - [x] 8.2 Create NetWorthBreakdown component

    - Create `components/net-worth/NetWorthBreakdown.tsx`
    - Display pie charts for assets and liabilities
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 8.3 Create NetWorthChart component


    - Create `components/net-worth/NetWorthChart.tsx`
    - Display line chart with time filter
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - [x] 8.4 Create NetWorthGoalCard component


    - Create `components/net-worth/NetWorthGoalCard.tsx`
    - Display goal progress and required growth
    - _Requirements: 4.2, 4.3_
  - [x] 8.5 Create NetWorthGoalForm component


    - Create `components/net-worth/NetWorthGoalForm.tsx`
    - Form for creating/editing goals
    - _Requirements: 4.1, 4.5_

- [x] 9. Create Net Worth page






  - [x] 9.1 Create main net worth page

    - Create `app/net-worth/page.tsx`
    - Integrate all components
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 10. Create Dashboard widget






  - [x] 10.1 Create NetWorthWidget component

    - Create `components/dashboard/NetWorthWidget.tsx`
    - Display summary with mini chart
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 11. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
