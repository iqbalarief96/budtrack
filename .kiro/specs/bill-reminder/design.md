# Design Document: Bill Reminder & Due Date Tracker

## Overview

Bill Reminder & Due Date Tracker adalah fitur yang membantu user mengelola tagihan dan pembayaran yang akan jatuh tempo. Fitur ini terintegrasi dengan sistem Recurring Transaction yang sudah ada, menambahkan layer reminder dan tracking di atasnya.

Fitur ini terdiri dari:
1. **Bill Management** - CRUD untuk bill reminders
2. **Reminder Engine** - Logic untuk trigger notifications
3. **Dashboard Widget** - Quick view bills due this week
4. **Analytics** - Payment statistics dan insights

## Architecture

```mermaid
graph TB
    subgraph Frontend
        BP[Bills Page]
        DW[Dashboard Widget]
        BF[Bill Form]
    end
    
    subgraph API Layer
        BA[/api/bills]
        BR[/api/bills/reminders]
        BS[/api/bills/stats]
        BI[/api/bills/import]
    end
    
    subgraph Services
        BillService[Bill Service]
        ReminderService[Reminder Service]
        StatsService[Stats Service]
    end
    
    subgraph Database
        Bill[(Bill)]
        BillPayment[(BillPayment)]
        BillReminder[(BillReminder)]
        RT[(RecurringTransaction)]
        Alert[(Alert)]
    end
    
    BP --> BA
    DW --> BA
    BF --> BA
    BP --> BR
    BP --> BS
    BP --> BI
    
    BA --> BillService
    BR --> ReminderService
    BS --> StatsService
    BI --> BillService
    
    BillService --> Bill
    BillService --> BillPayment
    BillService --> RT
    ReminderService --> BillReminder
    ReminderService --> Alert
    StatsService --> Bill
    StatsService --> BillPayment
```

## Components and Interfaces

### 1. Bill Service

```typescript
interface BillInput {
  name: string
  amount: number
  dueDate: Date
  categoryId?: string
  walletId: string
  recurringTransactionId?: string
  reminderDays: number[] // e.g., [1, 3, 7]
  notes?: string
  isRecurring: boolean
  frequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
}

interface Bill {
  id: string
  userId: string
  name: string
  amount: number
  dueDate: Date
  categoryId?: string
  walletId: string
  recurringTransactionId?: string
  reminderDays: number[]
  notes?: string
  isRecurring: boolean
  frequency?: string
  status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'PAID'
  isPaid: boolean
  paidDate?: Date
  createdAt: Date
  updatedAt: Date
}

interface BillService {
  createBill(userId: string, input: BillInput): Promise<Bill>
  updateBill(billId: string, userId: string, input: Partial<BillInput>): Promise<Bill>
  deleteBill(billId: string, userId: string): Promise<void>
  getBill(billId: string, userId: string): Promise<Bill>
  getBills(userId: string, filters?: BillFilters): Promise<Bill[]>
  markAsPaid(billId: string, userId: string, paidDate?: Date): Promise<Bill>
  importFromRecurring(userId: string, recurringIds: string[]): Promise<Bill[]>
  calculateStatus(bill: Bill): BillStatus
  calculateNextDueDate(bill: Bill): Date
}
```

### 2. Reminder Service

```typescript
interface BillReminder {
  id: string
  billId: string
  userId: string
  reminderDate: Date
  daysBefore: number
  status: 'PENDING' | 'SENT' | 'DISMISSED' | 'SNOOZED'
  snoozedUntil?: Date
  createdAt: Date
}

interface ReminderService {
  createReminders(bill: Bill): Promise<BillReminder[]>
  processReminders(): Promise<ProcessResult>
  dismissReminder(reminderId: string, userId: string): Promise<void>
  snoozeReminder(reminderId: string, userId: string, hours: number): Promise<BillReminder>
  getActiveReminders(userId: string): Promise<BillReminder[]>
}
```

### 3. Stats Service

```typescript
interface BillStats {
  totalMonthlyAmount: number
  totalBillsCount: number
  paidOnTimePercentage: number
  averageDaysBeforeDue: number
  byCategory: Array<{
    categoryId: string
    categoryName: string
    totalAmount: number
    count: number
  }>
  upcomingTotal: number
  overdueTotal: number
}

interface StatsService {
  getBillStats(userId: string, period?: number): Promise<BillStats>
  getPaymentHistory(billId: string, userId: string): Promise<BillPayment[]>
}
```

## Data Models

### Prisma Schema Additions

```prisma
model Bill {
  id                     String        @id @default(cuid())
  userId                 String
  name                   String
  amount                 Float
  dueDate                DateTime
  categoryId             String?
  walletId               String
  recurringTransactionId String?
  reminderDays           String        // JSON array: "[1, 3, 7]"
  notes                  String?
  isRecurring            Boolean       @default(false)
  frequency              String?       // DAILY, WEEKLY, MONTHLY, etc.
  isPaid                 Boolean       @default(false)
  paidDate               DateTime?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt
  
  user                   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category               Category?     @relation(fields: [categoryId], references: [id])
  wallet                 Wallet        @relation(fields: [walletId], references: [id], onDelete: Cascade)
  recurringTransaction   RecurringTransaction? @relation(fields: [recurringTransactionId], references: [id])
  payments               BillPayment[]
  reminders              BillReminder[]

  @@index([userId])
  @@index([dueDate])
  @@index([isPaid])
  @@index([recurringTransactionId])
}

model BillPayment {
  id        String   @id @default(cuid())
  billId    String
  amount    Float
  paidDate  DateTime
  dueDate   DateTime // Original due date for this payment
  daysEarly Int      // Positive = early, negative = late
  notes     String?
  createdAt DateTime @default(now())
  
  bill      Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)

  @@index([billId])
  @@index([paidDate])
}

model BillReminder {
  id           String   @id @default(cuid())
  billId       String
  userId       String
  reminderDate DateTime
  daysBefore   Int
  status       String   @default("PENDING") // PENDING, SENT, DISMISSED, SNOOZED
  snoozedUntil DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  bill         Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([billId])
  @@index([userId])
  @@index([reminderDate])
  @@index([status])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Bill Status Calculation
*For any* bill with a due date, the calculated status SHALL be:
- 'PAID' if isPaid is true
- 'OVERDUE' if due date is in the past and not paid
- 'DUE_SOON' if due date is within 3 days and not paid
- 'UPCOMING' otherwise
**Validates: Requirements 1.3, 1.4**

### Property 2: Bills Sorting by Due Date
*For any* list of bills returned by getBills, the bills SHALL be sorted by due date in ascending order (earliest first)
**Validates: Requirements 1.1, 5.5**

### Property 3: Bill Creation Round Trip
*For any* valid bill input, creating a bill and then retrieving it SHALL return a bill with all the same field values
**Validates: Requirements 2.2, 2.4**

### Property 4: Bill Filter Correctness
*For any* set of bills and a status filter, filtering bills SHALL return only bills whose calculated status matches the filter
**Validates: Requirements 1.5**

### Property 5: Reminder Creation at Correct Dates
*For any* bill with reminderDays [d1, d2, d3], creating reminders SHALL produce reminders with dates exactly d1, d2, d3 days before the due date
**Validates: Requirements 3.1, 3.2**

### Property 6: Notification Content Completeness
*For any* triggered reminder, the generated notification SHALL contain the bill name, amount, and days until due
**Validates: Requirements 3.3**

### Property 7: Snooze Duration Correctness
*For any* reminder snoozed for N hours, the new snoozedUntil date SHALL be exactly N hours after the current time
**Validates: Requirements 3.5**

### Property 8: Payment Recording Correctness
*For any* bill marked as paid, the bill SHALL have isPaid=true, a valid paidDate, and a corresponding BillPayment record
**Validates: Requirements 4.1**

### Property 9: Next Due Date Calculation
*For any* recurring bill marked as paid, the next due date SHALL be calculated correctly based on the frequency:
- MONTHLY: +1 month
- WEEKLY: +7 days
- BIWEEKLY: +14 days
- QUARTERLY: +3 months
- YEARLY: +1 year
**Validates: Requirements 2.3, 4.3**

### Property 10: Payment History Completeness
*For any* bill with N payments, getPaymentHistory SHALL return exactly N payment records
**Validates: Requirements 4.4**

### Property 11: Widget Date Range Filter
*For any* set of bills, the dashboard widget SHALL display only bills with due dates within the next 7 days from today
**Validates: Requirements 5.1**

### Property 12: Total Amount Calculation
*For any* set of bills in a period, the total amount SHALL equal the sum of all individual bill amounts
**Validates: Requirements 5.2, 8.1**

### Property 13: Category Filter Correctness
*For any* set of bills and a category filter, filtering SHALL return only bills with matching categoryId (or null categoryId for "Uncategorized")
**Validates: Requirements 6.2**

### Property 14: Category Breakdown Correctness
*For any* set of bills, the category breakdown totals SHALL sum to the overall total
**Validates: Requirements 6.3, 8.4**

### Property 15: Import Candidate Filter
*For any* set of recurring transactions and existing bills, import candidates SHALL include only recurring transactions not already linked to a bill
**Validates: Requirements 7.1**

### Property 16: Import Due Date Mapping
*For any* recurring transaction imported as a bill, the bill's initial due date SHALL equal the recurring transaction's nextPaymentDate
**Validates: Requirements 7.3**

### Property 17: On-Time Payment Percentage
*For any* set of bill payments, the on-time percentage SHALL equal (payments with daysEarly >= 0) / (total payments) * 100
**Validates: Requirements 8.2**

### Property 18: Average Days Early Calculation
*For any* set of bill payments, the average days early SHALL equal the mean of all daysEarly values
**Validates: Requirements 8.3**

## Error Handling

| Error Case | Response |
|------------|----------|
| Bill not found | 404 Not Found with message |
| Invalid due date (past date for new bill) | 400 Bad Request |
| Invalid reminder days (negative or > 30) | 400 Bad Request |
| Recurring transaction not found | 404 Not Found |
| Unauthorized access to bill | 403 Forbidden |
| Invalid frequency for recurring bill | 400 Bad Request |

## Testing Strategy

### Unit Testing
- Test BillService methods with mocked database
- Test status calculation logic
- Test next due date calculation for all frequencies
- Test reminder date calculation

### Property-Based Testing
Using `fast-check` library for property-based tests:

1. **Status Calculation Property** - Generate random bills with various due dates and verify status is correctly determined
2. **Sorting Property** - Generate random bills and verify sorting order
3. **Round Trip Property** - Generate random bill inputs and verify create/read consistency
4. **Filter Property** - Generate bills with various statuses and verify filtering
5. **Reminder Dates Property** - Generate bills with various reminder days and verify reminder dates
6. **Next Due Date Property** - Generate recurring bills and verify next due date calculation
7. **Total Calculation Property** - Generate bills and verify sum calculations
8. **Percentage Calculation Property** - Generate payments and verify percentage calculations

Each property-based test will:
- Run minimum 100 iterations
- Use smart generators that constrain to valid input space
- Be tagged with the correctness property it implements
