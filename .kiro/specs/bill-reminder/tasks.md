# Implementation Plan

## 1. Database Schema & Core Types

- [x] 1.1 Add Bill, BillPayment, and BillReminder models to Prisma schema
  - Add Bill model with all fields (name, amount, dueDate, categoryId, walletId, recurringTransactionId, reminderDays, notes, isRecurring, frequency, isPaid, paidDate)
  - Add BillPayment model for payment history tracking
  - Add BillReminder model for reminder scheduling
  - Add relations to User, Category, Wallet, RecurringTransaction
  - Add necessary indexes for performance
  - Run prisma migrate
  - _Requirements: 2.2, 4.1, 3.1_

- [x] 1.2 Create TypeScript types for Bill feature
  - Create `app/types/bill.ts` with BillInput, Bill, BillPayment, BillReminder, BillStatus, BillFilters, BillStats interfaces
  - _Requirements: 2.2_

## 2. Bill Service Implementation

- [x] 2.1 Implement core BillService
  - Create `lib/bill/bill-service.ts`
  - Implement createBill function
  - Implement updateBill function
  - Implement deleteBill function
  - Implement getBill function
  - Implement getBills with filtering and sorting
  - _Requirements: 1.1, 2.2, 2.4_

- [x] 2.2 Write property test for bill status calculation
  - **Property 1: Bill Status Calculation**
  - **Validates: Requirements 1.3, 1.4**

- [x] 2.3 Implement calculateStatus function
  - Return 'PAID' if isPaid is true
  - Return 'OVERDUE' if due date is past and not paid
  - Return 'DUE_SOON' if due date within 3 days
  - Return 'UPCOMING' otherwise
  - _Requirements: 1.3, 1.4_

- [x] 2.4 Write property test for bills sorting
  - **Property 2: Bills Sorting by Due Date**
  - **Validates: Requirements 1.1, 5.5**

- [x] 2.5 Write property test for bill creation round trip
  - **Property 3: Bill Creation Round Trip**
  - **Validates: Requirements 2.2, 2.4**

- [x] 2.6 Write property test for bill filter correctness
  - **Property 4: Bill Filter Correctness**
  - **Validates: Requirements 1.5**

- [x] 2.7 Implement markAsPaid function
  - Update bill isPaid and paidDate
  - Create BillPayment record with daysEarly calculation
  - Calculate and update next due date for recurring bills
  - _Requirements: 4.1, 4.3_

- [x] 2.8 Write property test for payment recording
  - **Property 8: Payment Recording Correctness**
  - **Validates: Requirements 4.1**

- [x] 2.9 Write property test for next due date calculation
  - **Property 9: Next Due Date Calculation**
  - **Validates: Requirements 2.3, 4.3_

- [x] 2.10 Implement calculateNextDueDate function
  - Handle DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY frequencies
  - _Requirements: 2.3, 4.3_

- [x] 2.11 Implement importFromRecurring function
  - Get unlinked recurring transactions
  - Create bills with default reminder settings
  - Use nextPaymentDate as initial due date
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2.12 Write property test for import candidate filter
  - **Property 15: Import Candidate Filter**
  - **Validates: Requirements 7.1**

- [x] 2.13 Write property test for import due date mapping
  - **Property 16: Import Due Date Mapping**
  - **Validates: Requirements 7.3**

## 3. Checkpoint - Core Service Tests

- [x] 3. Checkpoint - Make sure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## 4. Reminder Service Implementation

- [x] 4.1 Implement ReminderService
  - Create `lib/bill/reminder-service.ts`
  - Implement createReminders function (create reminders based on reminderDays)
  - Implement processReminders function (check pending reminders and create alerts)
  - Implement dismissReminder function
  - Implement snoozeReminder function
  - Implement getActiveReminders function
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 4.2 Write property test for reminder creation dates
  - **Property 5: Reminder Creation at Correct Dates**
  - **Validates: Requirements 3.1, 3.2**

- [x] 4.3 Write property test for notification content
  - **Property 6: Notification Content Completeness**
  - **Validates: Requirements 3.3**

- [x] 4.4 Write property test for snooze duration
  - **Property 7: Snooze Duration Correctness**
  - **Validates: Requirements 3.5**

## 5. Stats Service Implementation

- [x] 5.1 Implement StatsService
  - Create `lib/bill/stats-service.ts`
  - Implement getBillStats function (total amount, count, on-time %, avg days early, by category)
  - Implement getPaymentHistory function
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 4.4_

- [x] 5.2 Write property test for total amount calculation
  - **Property 12: Total Amount Calculation**
  - **Validates: Requirements 5.2, 8.1**

- [x] 5.3 Write property test for payment history completeness
  - **Property 10: Payment History Completeness**
  - **Validates: Requirements 4.4**

- [x] 5.4 Write property test for on-time payment percentage
  - **Property 17: On-Time Payment Percentage**
  - **Validates: Requirements 8.2**

- [x] 5.5 Write property test for average days early calculation
  - **Property 18: Average Days Early Calculation**
  - **Validates: Requirements 8.3**

- [x] 5.6 Write property test for category breakdown
  - **Property 14: Category Breakdown Correctness**
  - **Validates: Requirements 6.3, 8.4**

## 6. Checkpoint - All Services Tests

- [x] 6. Checkpoint - Make sure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## 7. API Routes Implementation

- [x] 7.1 Create bills API routes
  - Create `app/api/bills/route.ts` (GET list, POST create)
  - Create `app/api/bills/[billId]/route.ts` (GET, PUT, DELETE)
  - Create `app/api/bills/[billId]/pay/route.ts` (POST mark as paid)
  - _Requirements: 1.1, 2.2, 2.4, 4.1_

- [x] 7.2 Create bills import API route
  - Create `app/api/bills/import/route.ts` (POST import from recurring)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.3 Create bills stats API route
  - Create `app/api/bills/stats/route.ts` (GET statistics)
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7.4 Create bills reminders API routes
  - Create `app/api/bills/reminders/route.ts` (GET active reminders)
  - Create `app/api/bills/reminders/[reminderId]/dismiss/route.ts` (POST)
  - Create `app/api/bills/reminders/[reminderId]/snooze/route.ts` (POST)
  - _Requirements: 3.4, 3.5_

- [x] 7.5 Create bills widget API route
  - Create `app/api/bills/upcoming/route.ts` (GET bills due within 7 days)
  - _Requirements: 5.1, 5.2_

- [x] 7.6 Write property test for widget date range filter
  - **Property 11: Widget Date Range Filter**
  - **Validates: Requirements 5.1**

- [x] 7.7 Write property test for category filter
  - **Property 13: Category Filter Correctness**
  - **Validates: Requirements 6.2**

## 8. Frontend Components

- [x] 8.1 Create Bills page
  - Create `app/bills/page.tsx`
  - Display list of bills with status indicators
  - Add filter by status (upcoming, due soon, overdue, paid)
  - Add filter by category
  - Add sorting by due date
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.2_

- [x] 8.2 Create BillForm component
  - Create `components/bills/BillForm.tsx`
  - Form fields: name, amount, dueDate, category, wallet, reminderDays, notes, isRecurring, frequency
  - Option to link to existing recurring transaction
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 8.3 Create BillCard component
  - Create `components/bills/BillCard.tsx`
  - Display bill info with status badge
  - Quick actions: mark as paid, edit, delete
  - _Requirements: 1.2, 4.1_

- [x] 8.4 Create BillImportModal component
  - Create `components/bills/BillImportModal.tsx`
  - Display unlinked recurring transactions
  - Multi-select for bulk import
  - Show import summary
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 8.5 Create BillStatsCard component
  - Create `components/bills/BillStatsCard.tsx`
  - Display total monthly amount, on-time %, avg days early
  - Category breakdown chart
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 8.6 Create UpcomingBillsWidget component
  - Create `components/dashboard/UpcomingBillsWidget.tsx`
  - Display bills due within 7 days
  - Show total amount due this week
  - Empty state when no bills due
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 8.7 Create BillReminderList component
  - Create `components/bills/BillReminderList.tsx`
  - Display active reminders
  - Dismiss and snooze actions
  - _Requirements: 3.4, 3.5_

## 9. Navigation & Integration

- [x] 9.1 Add Bills to sidebar navigation
  - Add Bills menu item under Finance group in Sidebar.tsx
  - _Requirements: 1.1_

- [x] 9.2 Add UpcomingBillsWidget to dashboard
  - Integrate widget into dashboard layout
  - _Requirements: 5.1_

- [x] 9.3 Integrate with recurring transaction processing
  - Update recurring-automation.ts to auto-mark linked bills as paid
  - _Requirements: 4.2_

## 10. Final Checkpoint

- [x] 10. Final Checkpoint - Make sure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
