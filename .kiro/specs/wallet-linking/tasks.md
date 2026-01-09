# Implementation Plan: Wallet Linking

## Overview

Implementasi fitur Wallet Linking untuk mengelompokkan beberapa wallet dan melihat data gabungan. Menggunakan TypeScript dengan Next.js API routes dan Prisma ORM.

## Tasks

- [x] 1. Setup database schema
  - [x] 1.1 Add WalletGroup and WalletGroupMember models to Prisma schema
    - Create WalletGroup model with id, name, description, icon, color, userId
    - Create WalletGroupMember model with walletGroupId, walletId
    - Add relations to User and Wallet models
    - _Requirements: 1.1, 2.1_
  - [x] 1.2 Run Prisma migration
    - Generate and apply migration
    - _Requirements: 1.1_

- [x] 2. Implement WalletGroupService
  - [x] 2.1 Create wallet group service with CRUD operations
    - Implement createGroup with name validation
    - Implement getGroups, getGroupById
    - Implement updateGroup, deleteGroup
    - Enforce max 5 groups per user constraint
    - _Requirements: 1.1, 1.2, 1.4, 5.2, 5.3_
  - [x] 2.2 Write property test for group creation validation
    - **Property 1: Valid Group Creation**
    - **Property 2: Empty Name Rejection**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 2.3 Write property test for max groups constraint
    - **Property 3: Max Groups Per User Constraint**
    - **Validates: Requirements 1.4**
  - [x] 2.4 Implement wallet linking operations
    - Implement addWalletToGroup with validation
    - Implement removeWalletFromGroup
    - Enforce max 10 wallets per group constraint
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_
  - [x] 2.5 Write property test for wallet linking
    - **Property 5: Multi-Group Wallet Membership**
    - **Property 6: Wallet Data Preservation on Link**
    - **Property 7: Max Wallets Per Group Constraint**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 3. Checkpoint - Ensure core service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement AggregationService
  - [x] 4.1 Create aggregation service for transactions
    - Implement getAggregatedTransactions with sorting and wallet info
    - Support filtering by date, type, category
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 4.2 Write property test for transaction aggregation
    - **Property 8: Aggregated Transactions Completeness and Order**
    - **Property 9: Filter Application Across Wallets**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [x] 4.3 Create aggregation service for summary
    - Implement getAggregatedSummary with total balance, income, expense
    - Calculate wallet breakdown with percentages
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.4 Write property test for summary aggregation
    - **Property 10: Aggregated Balance Correctness**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 5. Implement data preservation and cascade behavior
  - [x] 5.1 Implement wallet preservation on unlink and group delete
    - Verify wallet data unchanged after removeWalletFromGroup
    - Verify wallets preserved after deleteGroup
    - _Requirements: 5.1, 5.3_
  - [x] 5.2 Write property test for data preservation
    - **Property 11: Wallet Preservation on Unlink**
    - **Property 12: Wallet Preservation on Group Delete**
    - **Validates: Requirements 5.1, 5.3**
  - [x] 5.3 Implement cascade removal when wallet is deleted
    - Add onDelete: Cascade to WalletGroupMember.wallet relation
    - _Requirements: 5.4_
  - [x] 5.4 Write property test for cascade removal
    - **Property 13: Cascade Removal on Wallet Delete**
    - **Validates: Requirements 5.4**

- [x] 6. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement API routes
  - [x] 7.1 Create wallet groups API routes
    - GET /api/wallet-groups - list groups
    - POST /api/wallet-groups - create group
    - GET /api/wallet-groups/[id] - get group
    - PATCH /api/wallet-groups/[id] - update group
    - DELETE /api/wallet-groups/[id] - delete group
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.2, 5.3_
  - [x] 7.2 Create wallet group members API routes
    - POST /api/wallet-groups/[id]/wallets - add wallet
    - DELETE /api/wallet-groups/[id]/wallets/[walletId] - remove wallet
    - _Requirements: 2.1, 2.4, 5.1_
  - [x] 7.3 Create aggregation API routes
    - GET /api/wallet-groups/[id]/transactions - aggregated transactions
    - GET /api/wallet-groups/[id]/summary - aggregated summary
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

- [x] 8. Implement full integration aggregation services
  - [x] 8.1 Create DashboardAggregationService
    - Implement getAggregatedDashboard with spending by category
    - Calculate financial health score from combined data
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 8.2 Write property test for dashboard aggregation
    - **Property 14: Aggregated Dashboard Data Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3**
  - [x] 8.3 Create InsightsAggregationService
    - Implement getAggregatedInsights with patterns and anomalies
    - Include wallet comparison analysis
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 8.4 Write property test for insights aggregation
    - **Property 15: Aggregated Insights Cross-Wallet Analysis**
    - **Validates: Requirements 8.1, 8.3, 8.4**
  - [x] 8.5 Create BudgetAggregationService
    - Implement getAggregatedBudgets with wallet contributions
    - Calculate budget utilization from all wallets
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 8.6 Write property test for budget aggregation
    - **Property 16: Aggregated Budget Calculation Correctness**
    - **Validates: Requirements 9.1, 9.2**
  - [x] 8.7 Create ReportAggregationService
    - Implement getAggregatedReport with per-wallet breakdown
    - Support date range filtering
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 8.8 Write property test for report aggregation
    - **Property 17: Aggregated Report Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [x] 9. Implement bills, goals, recurring aggregation
  - [x] 9.1 Create BillAggregationService
    - Implement getAggregatedBills with wallet attribution
    - Calculate total upcoming and overdue amounts
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 9.2 Write property test for bills aggregation
    - **Property 18: Aggregated Bills Completeness**
    - **Validates: Requirements 11.1, 11.2, 11.3**
  - [x] 9.3 Create GoalAggregationService
    - Implement getAggregatedGoals with progress calculation
    - Calculate combined savings rate
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 9.4 Write property test for goals aggregation
    - **Property 19: Aggregated Goals Completeness**
    - **Validates: Requirements 12.1, 12.2, 12.3**
  - [x] 9.5 Create RecurringAggregationService
    - Implement getAggregatedRecurring with totals
    - Include upcoming transactions list
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [x] 9.6 Write property test for recurring aggregation
    - **Property 20: Aggregated Recurring Completeness**
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [x] 10. Checkpoint - Ensure all aggregation service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create aggregation API routes for full integration
  - [x] 11.1 Create dashboard aggregation API
    - GET /api/wallet-groups/[id]/dashboard
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 11.2 Create insights aggregation API
    - GET /api/wallet-groups/[id]/insights
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 11.3 Create budget aggregation API
    - GET /api/wallet-groups/[id]/budgets
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 11.4 Create report aggregation API
    - GET /api/wallet-groups/[id]/reports
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 11.5 Create bills aggregation API
    - GET /api/wallet-groups/[id]/bills
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x] 11.6 Create goals aggregation API
    - GET /api/wallet-groups/[id]/goals
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 11.7 Create recurring aggregation API
    - GET /api/wallet-groups/[id]/recurring
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 12. Implement UI components
  - [x] 12.1 Create WalletGroupForm component
    - Form for creating/editing wallet groups
    - Wallet selection checkboxes
    - _Requirements: 1.1, 1.3, 2.1_
  - [x] 12.2 Create WalletGroupCard component
    - Display group info with linked wallets
    - Edit and delete actions
    - _Requirements: 5.2, 5.3_
  - [x] 12.3 Update WalletSelector to include groups
    - Show wallet groups as selectable options
    - Visual distinction between wallets and groups
    - _Requirements: 6.1, 6.4_
  - [x] 12.4 Create WalletGroupSummary component
    - Display aggregated balance and breakdown
    - Show income/expense totals
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 13. Integrate with existing features
  - [x] 13.1 Update WalletProvider to support groups
    - Add selectedGroup state
    - Add group selection methods
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 13.2 Update transaction list to show aggregated view
    - Show wallet indicator on each transaction
    - Support group-level filtering
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 13.3 Update dashboard widgets to support group selection
    - Spending chart with aggregated data
    - Top categories from all wallets
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 13.4 Update insights page to support group selection
    - Aggregated spending patterns
    - Cross-wallet comparison
    - _Requirements: 8.1, 8.3, 8.4_
  - [x] 13.5 Update budget page to support group selection
    - Aggregated budget progress
    - Per-wallet contribution breakdown
    - _Requirements: 9.1, 9.2_
  - [x] 13.6 Update bills page to support group selection
    - Aggregated bills list
    - Per-wallet bill breakdown
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 13.7 Update goals page to support group selection
    - Aggregated goals list
    - Combined savings rate
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 13.8 Update recurring page to support group selection
    - Aggregated recurring list
    - Total recurring income/expense
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 14. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All property-based tests are required for comprehensive coverage
- All wallets use IDR currency, so currency conversion (Req 4.4) is deferred
- Focus on core functionality first, UI polish can be iterative
- Full integration includes: Dashboard, Insights, Budget, Reports, Bills, Goals, Recurring
