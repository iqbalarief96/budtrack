# Design Document: Wallet Linking

## Overview

Fitur Wallet Linking memungkinkan user untuk mengelompokkan beberapa wallet menjadi satu "Wallet Group" sehingga dapat melihat transaksi, summary, dashboard, insights, budget, reports, bills, goals, dan recurring transactions gabungan. Ini ideal untuk pasangan yang share satu account tapi punya wallet terpisah, dan ingin melihat gambaran keuangan bersama secara lengkap.

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        WS[Wallet Selector]
        GV[Group View]
        GM[Group Management]
        DB[Dashboard Widgets]
        IN[Insights Page]
        BU[Budget Page]
        RP[Reports Page]
        BL[Bills Page]
        GL[Goals Page]
        RC[Recurring Page]
    end
    
    subgraph "API Layer"
        GA[/api/wallet-groups]
        GT[/api/wallet-groups/[id]/transactions]
        GS[/api/wallet-groups/[id]/summary]
        GD[/api/wallet-groups/[id]/dashboard]
        GI[/api/wallet-groups/[id]/insights]
        GB[/api/wallet-groups/[id]/budgets]
        GR[/api/wallet-groups/[id]/reports]
        GBL[/api/wallet-groups/[id]/bills]
        GGL[/api/wallet-groups/[id]/goals]
        GRC[/api/wallet-groups/[id]/recurring]
    end
    
    subgraph "Service Layer"
        WGS[WalletGroupService]
        AGG[AggregationService]
        DAS[DashboardAggregationService]
        INS[InsightsAggregationService]
        BUS[BudgetAggregationService]
        RPS[ReportAggregationService]
        BLS[BillAggregationService]
        GLS[GoalAggregationService]
        RCS[RecurringAggregationService]
    end
    
    subgraph "Data Layer"
        DB2[(Database)]
    end
    
    WS --> GA
    GV --> GT
    GV --> GS
    GM --> GA
    DB --> GD
    IN --> GI
    BU --> GB
    RP --> GR
    BL --> GBL
    GL --> GGL
    RC --> GRC
    
    GA --> WGS
    GT --> AGG
    GS --> AGG
    GD --> DAS
    GI --> INS
    GB --> BUS
    GR --> RPS
    GBL --> BLS
    GGL --> GLS
    GRC --> RCS
    
    WGS --> DB2
    AGG --> DB2
    DAS --> DB2
    INS --> DB2
    BUS --> DB2
    RPS --> DB2
    BLS --> DB2
    GLS --> DB2
    RCS --> DB2
```

## Components and Interfaces

### Database Schema

```prisma
model WalletGroup {
  id          String              @id @default(cuid())
  name        String
  description String?
  icon        String?
  color       String?
  userId      String
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallets     WalletGroupMember[]

  @@index([userId])
}

model WalletGroupMember {
  id            String      @id @default(cuid())
  walletGroupId String
  walletId      String
  addedAt       DateTime    @default(now())
  walletGroup   WalletGroup @relation(fields: [walletGroupId], references: [id], onDelete: Cascade)
  wallet        Wallet      @relation(fields: [walletId], references: [id], onDelete: Cascade)

  @@unique([walletGroupId, walletId])
  @@index([walletGroupId])
  @@index([walletId])
}
```

### Service Interfaces

```typescript
// Types
interface WalletGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  wallets: WalletGroupMember[];
}

interface WalletGroupMember {
  id: string;
  walletGroupId: string;
  walletId: string;
  addedAt: Date;
  wallet: Wallet;
}

interface CreateWalletGroupInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  walletIds?: string[];
}

interface UpdateWalletGroupInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface AggregatedSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  walletBreakdown: WalletBreakdown[];
  currencyCode: string;
}

interface WalletBreakdown {
  walletId: string;
  walletName: string;
  balance: number;
  income: number;
  expense: number;
  percentage: number;
}

// WalletGroupService
interface WalletGroupService {
  createGroup(userId: string, input: CreateWalletGroupInput): Promise<WalletGroup>;
  getGroups(userId: string): Promise<WalletGroup[]>;
  getGroupById(groupId: string, userId: string): Promise<WalletGroup | null>;
  updateGroup(groupId: string, userId: string, input: UpdateWalletGroupInput): Promise<WalletGroup>;
  deleteGroup(groupId: string, userId: string): Promise<void>;
  addWalletToGroup(groupId: string, walletId: string, userId: string): Promise<WalletGroupMember>;
  removeWalletFromGroup(groupId: string, walletId: string, userId: string): Promise<void>;
}

// AggregationService
interface AggregationService {
  getAggregatedTransactions(
    groupId: string, 
    userId: string, 
    options?: TransactionQueryOptions
  ): Promise<AggregatedTransaction[]>;
  
  getAggregatedSummary(
    groupId: string, 
    userId: string, 
    dateRange?: DateRange
  ): Promise<AggregatedSummary>;
}

interface AggregatedTransaction {
  id: string;
  amount: number;
  description?: string;
  date: Date;
  type: string;
  categoryId?: string;
  category?: Category;
  walletId: string;
  walletName: string;
  walletColor?: string;
}

interface TransactionQueryOptions {
  startDate?: Date;
  endDate?: Date;
  type?: 'income' | 'expense';
  categoryId?: string;
  limit?: number;
  offset?: number;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallet-groups | List all wallet groups for user |
| POST | /api/wallet-groups | Create new wallet group |
| GET | /api/wallet-groups/[id] | Get wallet group details |
| PATCH | /api/wallet-groups/[id] | Update wallet group |
| DELETE | /api/wallet-groups/[id] | Delete wallet group |
| POST | /api/wallet-groups/[id]/wallets | Add wallet to group |
| DELETE | /api/wallet-groups/[id]/wallets/[walletId] | Remove wallet from group |
| GET | /api/wallet-groups/[id]/transactions | Get aggregated transactions |
| GET | /api/wallet-groups/[id]/summary | Get aggregated summary |
| GET | /api/wallet-groups/[id]/dashboard | Get aggregated dashboard data |
| GET | /api/wallet-groups/[id]/insights | Get aggregated spending insights |
| GET | /api/wallet-groups/[id]/budgets | Get aggregated budget progress |
| GET | /api/wallet-groups/[id]/reports | Get aggregated report data |
| GET | /api/wallet-groups/[id]/bills | Get aggregated bills |
| GET | /api/wallet-groups/[id]/goals | Get aggregated goals |
| GET | /api/wallet-groups/[id]/recurring | Get aggregated recurring transactions |

## Data Models

### WalletGroup Entity

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Group name (required, max 50 chars) |
| description | string? | Optional description |
| icon | string? | Icon identifier |
| color | string? | Color hex code |
| userId | string | Owner user ID |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Validation Rules

- Group name: 1-50 characters, non-empty after trim
- Max 5 groups per user
- Max 10 wallets per group
- Wallet must belong to the same user as the group

### Additional Aggregation Service Interfaces

```typescript
// DashboardAggregationService
interface DashboardAggregationService {
  getAggregatedDashboard(
    groupId: string,
    userId: string,
    dateRange?: DateRange
  ): Promise<AggregatedDashboard>;
}

interface AggregatedDashboard {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  spendingByCategory: CategorySpending[];
  incomeVsExpense: IncomeExpenseComparison;
  financialHealthScore: number;
  walletBreakdown: WalletBreakdown[];
}

interface CategorySpending {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  walletContributions: { walletId: string; walletName: string; amount: number }[];
}

// InsightsAggregationService
interface InsightsAggregationService {
  getAggregatedInsights(
    groupId: string,
    userId: string,
    dateRange?: DateRange
  ): Promise<AggregatedInsights>;
}

interface AggregatedInsights {
  spendingPatterns: SpendingPattern[];
  anomalies: SpendingAnomaly[];
  trends: SpendingTrend[];
  walletComparison: WalletSpendingComparison[];
}

interface WalletSpendingComparison {
  walletId: string;
  walletName: string;
  totalSpending: number;
  topCategories: CategorySpending[];
  percentageOfGroup: number;
}

// BudgetAggregationService
interface BudgetAggregationService {
  getAggregatedBudgets(
    groupId: string,
    userId: string,
    dateRange?: DateRange
  ): Promise<AggregatedBudget[]>;
}

interface AggregatedBudget {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  walletContributions: { walletId: string; walletName: string; spent: number }[];
}

// ReportAggregationService
interface ReportAggregationService {
  getAggregatedReport(
    groupId: string,
    userId: string,
    options: ReportOptions
  ): Promise<AggregatedReport>;
}

interface AggregatedReport {
  dateRange: DateRange;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionsByCategory: CategorySummary[];
  transactionsByWallet: WalletSummary[];
  transactions: AggregatedTransaction[];
}

// BillAggregationService
interface BillAggregationService {
  getAggregatedBills(
    groupId: string,
    userId: string
  ): Promise<AggregatedBills>;
}

interface AggregatedBills {
  bills: AggregatedBill[];
  totalUpcoming: number;
  totalOverdue: number;
  billsByWallet: { walletId: string; walletName: string; bills: Bill[]; total: number }[];
  stats: BillStats;
}

interface AggregatedBill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  status: string;
  walletId: string;
  walletName: string;
}

// GoalAggregationService
interface GoalAggregationService {
  getAggregatedGoals(
    groupId: string,
    userId: string
  ): Promise<AggregatedGoals>;
}

interface AggregatedGoals {
  goals: AggregatedGoal[];
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  combinedSavingsRate: number;
  goalsByWallet: { walletId: string; walletName: string; goals: Goal[]; totalProgress: number }[];
}

interface AggregatedGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  targetDate?: Date;
  walletId: string;
  walletName: string;
}

// RecurringAggregationService
interface RecurringAggregationService {
  getAggregatedRecurring(
    groupId: string,
    userId: string
  ): Promise<AggregatedRecurring>;
}

interface AggregatedRecurring {
  recurring: AggregatedRecurringTransaction[];
  totalRecurringIncome: number;
  totalRecurringExpense: number;
  upcomingTransactions: AggregatedRecurringTransaction[];
  recurringByWallet: { walletId: string; walletName: string; income: number; expense: number; items: RecurringTransaction[] }[];
}

interface AggregatedRecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: string;
  nextDate: Date;
  walletId: string;
  walletName: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system - essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Group Creation
*For any* valid group name (non-empty, non-whitespace, max 50 chars), creating a wallet group SHALL succeed and return a group with the correct name and owner.
**Validates: Requirements 1.1**

### Property 2: Empty Name Rejection
*For any* string composed entirely of whitespace or empty string, creating a wallet group SHALL be rejected with an error.
**Validates: Requirements 1.2**

### Property 3: Max Groups Per User Constraint
*For any* user, the system SHALL NOT allow creation of more than 5 wallet groups. Attempting to create a 6th group SHALL fail.
**Validates: Requirements 1.4**

### Property 4: Wallet Linking Transaction Inclusion
*For any* wallet added to a group, all transactions from that wallet SHALL appear in the aggregated transactions view.
**Validates: Requirements 2.1, 3.4**

### Property 5: Multi-Group Wallet Membership
*For any* wallet, it SHALL be possible to add it to multiple different wallet groups without error.
**Validates: Requirements 2.2**

### Property 6: Wallet Data Preservation on Link
*For any* wallet, linking it to a group SHALL NOT modify the wallet's balance, transactions, or other properties.
**Validates: Requirements 2.3**

### Property 7: Max Wallets Per Group Constraint
*For any* wallet group, the system SHALL NOT allow more than 10 wallets. Attempting to add an 11th wallet SHALL fail.
**Validates: Requirements 2.4**

### Property 8: Aggregated Transactions Completeness and Order
*For any* wallet group with N linked wallets, the aggregated transactions SHALL contain exactly the union of all transactions from all N wallets, sorted by date descending, with each transaction including its source wallet information.
**Validates: Requirements 3.1, 3.2**

### Property 9: Filter Application Across Wallets
*For any* filter applied to aggregated transactions (date range, type, category), the results SHALL include matching transactions from ALL linked wallets, not just one.
**Validates: Requirements 3.3**

### Property 10: Aggregated Balance Correctness
*For any* wallet group, the total balance SHALL equal the sum of all linked wallet balances, and the breakdown percentages SHALL sum to 100%.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 11: Wallet Preservation on Unlink
*For any* wallet removed from a group, the wallet and all its transactions SHALL remain intact and unchanged.
**Validates: Requirements 5.1**

### Property 12: Wallet Preservation on Group Delete
*For any* wallet group that is deleted, all wallets that were members SHALL continue to exist with unchanged data.
**Validates: Requirements 5.3**

### Property 13: Cascade Removal on Wallet Delete
*For any* wallet that is deleted, it SHALL be automatically removed from all wallet groups it belonged to.
**Validates: Requirements 5.4**

### Property 14: Aggregated Dashboard Data Completeness
*For any* wallet group, the aggregated dashboard SHALL include spending data from ALL linked wallets, and category totals SHALL equal the sum of individual wallet contributions.
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 15: Aggregated Insights Cross-Wallet Analysis
*For any* wallet group, spending insights SHALL analyze patterns across ALL linked wallets, and wallet comparison percentages SHALL sum to 100%.
**Validates: Requirements 8.1, 8.3, 8.4**

### Property 16: Aggregated Budget Calculation Correctness
*For any* wallet group with budgets, the spent amount for each budget category SHALL equal the sum of spending from ALL linked wallets in that category.
**Validates: Requirements 9.1, 9.2**

### Property 17: Aggregated Report Completeness
*For any* wallet group report, the transaction list SHALL contain ALL transactions from ALL linked wallets within the date range, with correct wallet attribution.
**Validates: Requirements 10.1, 10.2, 10.3**

### Property 18: Aggregated Bills Completeness
*For any* wallet group, the aggregated bills list SHALL contain ALL bills from ALL linked wallets, with correct wallet attribution and accurate total calculations.
**Validates: Requirements 11.1, 11.2, 11.3**

### Property 19: Aggregated Goals Completeness
*For any* wallet group, the aggregated goals list SHALL contain ALL goals from ALL linked wallets, and overall progress SHALL be calculated correctly from individual goal progress.
**Validates: Requirements 12.1, 12.2, 12.3**

### Property 20: Aggregated Recurring Completeness
*For any* wallet group, the aggregated recurring transactions SHALL contain ALL recurring items from ALL linked wallets, with correct totals for income and expense.
**Validates: Requirements 13.1, 13.2, 13.3**

## Error Handling

| Error Scenario | Error Code | Message |
|----------------|------------|---------|
| Empty group name | INVALID_NAME | "Group name cannot be empty" |
| Group name too long | NAME_TOO_LONG | "Group name must be 50 characters or less" |
| Max groups exceeded | MAX_GROUPS_EXCEEDED | "Maximum of 5 wallet groups allowed" |
| Max wallets exceeded | MAX_WALLETS_EXCEEDED | "Maximum of 10 wallets per group allowed" |
| Group not found | GROUP_NOT_FOUND | "Wallet group not found" |
| Wallet not found | WALLET_NOT_FOUND | "Wallet not found" |
| Unauthorized | UNAUTHORIZED | "You don't have permission to access this group" |
| Wallet already in group | WALLET_ALREADY_IN_GROUP | "Wallet is already in this group" |

## Testing Strategy

### Unit Tests
- WalletGroupService: CRUD operations, validation, constraints
- AggregationService: Transaction aggregation, summary calculation
- Input validation functions

### Property-Based Tests
Using Vitest with fast-check for property-based testing:
- Test group creation with random valid/invalid names
- Test constraint enforcement (max groups, max wallets)
- Test aggregation correctness with random wallet/transaction combinations
- Test data preservation on link/unlink/delete operations

### Integration Tests
- API endpoint testing with real database
- End-to-end wallet group lifecycle
- Concurrent operations handling
