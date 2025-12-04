# Net Worth Tracker - Design Document

## Overview

Net Worth Tracker adalah fitur untuk menghitung dan melacak kekayaan bersih pengguna (total aset - total liabilitas) dari waktu ke waktu. Sistem ini mengintegrasikan data dari wallet dan debt yang sudah ada, menyimpan snapshot historis, dan menyediakan visualisasi trend serta goal tracking.

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        NWP[Net Worth Page]
        NWW[Dashboard Widget]
        NWC[Net Worth Charts]
    end
    
    subgraph "API Layer"
        NWAPI[/api/net-worth]
        NHAPI[/api/net-worth/history]
        NGAPI[/api/net-worth/goals]
    end
    
    subgraph "Service Layer"
        NWS[NetWorthService]
        NWCalc[NetWorthCalculator]
        SnapS[SnapshotService]
    end
    
    subgraph "Data Layer"
        Wallet[(Wallet)]
        Debt[(Debt)]
        Snapshot[(NetWorthSnapshot)]
        Goal[(NetWorthGoal)]
    end
    
    NWP --> NWAPI
    NWP --> NHAPI
    NWP --> NGAPI
    NWW --> NWAPI
    
    NWAPI --> NWS
    NHAPI --> SnapS
    NGAPI --> NWS
    
    NWS --> NWCalc
    NWCalc --> Wallet
    NWCalc --> Debt
    SnapS --> Snapshot
    NWS --> Goal
```

## Components and Interfaces

### 1. NetWorthCalculator

Komponen untuk menghitung net worth dari data wallet dan debt.

```typescript
interface NetWorthCalculation {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  assetBreakdown: CategoryBreakdown[]
  liabilityBreakdown: CategoryBreakdown[]
  calculatedAt: Date
}

interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  items: BreakdownItem[]
}

interface BreakdownItem {
  id: string
  name: string
  amount: number
}

interface NetWorthCalculator {
  calculate(userId: string): Promise<NetWorthCalculation>
  calculateAssets(wallets: Wallet[]): number
  calculateLiabilities(debts: Debt[]): number
  groupByCategory<T>(items: T[], categoryField: string): CategoryBreakdown[]
}
```

### 2. SnapshotService

Komponen untuk mengelola snapshot historis net worth.

```typescript
interface NetWorthSnapshot {
  id: string
  userId: string
  date: Date
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  breakdown: object
}

interface SnapshotService {
  createSnapshot(userId: string): Promise<NetWorthSnapshot>
  getHistory(userId: string, filter: TimeFilter): Promise<NetWorthSnapshot[]>
  getLatestSnapshot(userId: string): Promise<NetWorthSnapshot | null>
  calculateChange(current: number, previous: number): PercentageChange
}

interface TimeFilter {
  period: '3M' | '6M' | '1Y' | 'ALL'
  startDate?: Date
  endDate?: Date
}

interface PercentageChange {
  value: number
  direction: 'up' | 'down' | 'stable'
}
```

### 3. NetWorthGoalService

Komponen untuk mengelola goal net worth.

```typescript
interface NetWorthGoal {
  id: string
  userId: string
  targetAmount: number
  targetDate: Date
  isActive: boolean
  createdAt: Date
}

interface GoalProgress {
  currentNetWorth: number
  targetAmount: number
  progressPercentage: number
  remainingAmount: number
  requiredMonthlyGrowth: number
  monthsRemaining: number
  isOnTrack: boolean
}

interface NetWorthGoalService {
  createGoal(userId: string, data: CreateGoalInput): Promise<NetWorthGoal>
  updateGoal(goalId: string, data: UpdateGoalInput): Promise<NetWorthGoal>
  deleteGoal(goalId: string): Promise<void>
  getGoals(userId: string): Promise<NetWorthGoal[]>
  calculateProgress(goal: NetWorthGoal, currentNetWorth: number): GoalProgress
  checkMilestone(progress: number): Milestone | null
}

type Milestone = 25 | 50 | 75 | 100
```

## Data Models

### Database Schema (Prisma)

```prisma
model NetWorthSnapshot {
  id               String   @id @default(cuid())
  userId           String
  date             DateTime
  totalAssets      Decimal  @db.Decimal(15, 2)
  totalLiabilities Decimal  @db.Decimal(15, 2)
  netWorth         Decimal  @db.Decimal(15, 2)
  breakdown        Json
  createdAt        DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, date])
  @@map("net_worth_snapshots")
}

model NetWorthGoal {
  id           String   @id @default(cuid())
  userId       String
  targetAmount Decimal  @db.Decimal(15, 2)
  targetDate   DateTime
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("net_worth_goals")
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Net Worth Calculation Accuracy
*For any* set of wallets and debts, the calculated net worth SHALL equal the sum of all wallet balances minus the sum of all active debt amounts.
**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: Asset Breakdown Sum Consistency
*For any* set of wallets grouped by type, the sum of all category amounts SHALL equal the total assets value.
**Validates: Requirements 1.2, 3.1**

### Property 3: Liability Breakdown Sum Consistency
*For any* set of debts grouped by type, the sum of all category amounts SHALL equal the total liabilities value.
**Validates: Requirements 1.2, 3.2**

### Property 4: Percentage Change Calculation
*For any* two net worth values (current and previous), the percentage change SHALL equal ((current - previous) / |previous|) * 100, with appropriate handling for zero previous value.
**Validates: Requirements 1.5, 3.5**

### Property 5: Time Filter Accuracy
*For any* set of snapshots and time filter, the returned snapshots SHALL only include records within the specified date range.
**Validates: Requirements 2.2**

### Property 6: Goal Progress Calculation
*For any* goal with target amount and current net worth, progress percentage SHALL equal (currentNetWorth / targetAmount) * 100, capped at 100%.
**Validates: Requirements 4.2**

### Property 7: Required Monthly Growth Rate
*For any* goal with target amount, current net worth, and months remaining, the required monthly growth rate SHALL be calculated as (targetAmount - currentNetWorth) / monthsRemaining.
**Validates: Requirements 4.3**

### Property 8: Milestone Detection
*For any* progress percentage, milestone detection SHALL correctly identify when progress crosses 25%, 50%, 75%, or 100% thresholds.
**Validates: Requirements 4.4**

### Property 9: Goal Data Round-Trip
*For any* valid goal data, creating a goal and then retrieving it SHALL return equivalent values for target amount and target date.
**Validates: Requirements 4.1, 4.5**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| No wallets found | Return net worth with 0 assets |
| No debts found | Return net worth with 0 liabilities |
| Invalid goal target | Return validation error with message |
| Target date in past | Return validation error |
| Database connection error | Return 500 with retry suggestion |
| Snapshot creation fails | Log error, continue without snapshot |

## Testing Strategy

### Unit Testing
- Test NetWorthCalculator with various wallet/debt combinations
- Test SnapshotService filtering logic
- Test GoalProgress calculations
- Test milestone detection edge cases

### Property-Based Testing
Library: **fast-check** (sudah ada di project)

Setiap property test harus:
- Menjalankan minimum 100 iterasi
- Di-tag dengan format: `**Feature: net-worth-tracker, Property {number}: {property_text}**`
- Menggunakan generator yang menghasilkan data valid (positive amounts, valid dates)

### Integration Testing
- Test API endpoints dengan database
- Test snapshot creation on month change
- Test goal CRUD operations
