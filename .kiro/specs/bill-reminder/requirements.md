# Requirements Document

## Introduction

Bill Reminder & Due Date Tracker adalah fitur untuk membantu user mengelola tagihan dan pembayaran yang akan jatuh tempo. Fitur ini terintegrasi dengan sistem Recurring Transaction yang sudah ada, menambahkan kemampuan reminder, notifikasi, dan dashboard widget untuk memastikan user tidak melewatkan pembayaran penting.

## Glossary

- **Bill**: Tagihan atau pembayaran yang memiliki tanggal jatuh tempo (due date)
- **Reminder**: Notifikasi yang dikirim sebelum tanggal jatuh tempo
- **Due Date**: Tanggal jatuh tempo pembayaran
- **Recurring Transaction**: Transaksi berulang yang sudah ada di sistem
- **Bill Reminder System**: Sistem yang mengelola reminder untuk tagihan
- **Notification**: Pesan yang ditampilkan kepada user tentang tagihan yang akan jatuh tempo
- **Snooze**: Menunda reminder untuk waktu tertentu

## Requirements

### Requirement 1

**User Story:** As a user, I want to see all my upcoming bills in one place, so that I can plan my payments and avoid missing due dates.

#### Acceptance Criteria

1. WHEN a user navigates to the bills page THEN the Bill Reminder System SHALL display a list of all upcoming bills sorted by due date
2. WHEN displaying a bill THEN the Bill Reminder System SHALL show the bill name, amount, due date, category, and days until due
3. WHEN a bill is due within 3 days THEN the Bill Reminder System SHALL highlight the bill with a warning indicator
4. WHEN a bill is overdue THEN the Bill Reminder System SHALL highlight the bill with a critical indicator
5. WHEN a user filters bills by status THEN the Bill Reminder System SHALL display only bills matching the selected status (upcoming, due soon, overdue, paid)

### Requirement 2

**User Story:** As a user, I want to create bill reminders from my recurring transactions, so that I can track when my regular payments are due.

#### Acceptance Criteria

1. WHEN a user creates a bill reminder THEN the Bill Reminder System SHALL allow linking to an existing recurring transaction
2. WHEN a user creates a standalone bill THEN the Bill Reminder System SHALL store the bill name, amount, due date, category, and reminder preferences
3. WHEN a recurring transaction is linked to a bill THEN the Bill Reminder System SHALL automatically update the next due date after each payment
4. WHEN a user edits a bill reminder THEN the Bill Reminder System SHALL persist the changes immediately

### Requirement 3

**User Story:** As a user, I want to receive reminders before my bills are due, so that I have time to prepare the payment.

#### Acceptance Criteria

1. WHEN a user configures reminder preferences THEN the Bill Reminder System SHALL allow setting reminder days (1, 3, 7 days before due date)
2. WHEN a bill reaches the reminder threshold THEN the Bill Reminder System SHALL create a notification for the user
3. WHEN a reminder is triggered THEN the Bill Reminder System SHALL display the bill name, amount, and days until due in the notification
4. WHEN a user dismisses a reminder THEN the Bill Reminder System SHALL mark the reminder as read
5. WHEN a user snoozes a reminder THEN the Bill Reminder System SHALL reschedule the reminder for the specified duration

### Requirement 4

**User Story:** As a user, I want to mark bills as paid, so that I can track which payments I have completed.

#### Acceptance Criteria

1. WHEN a user marks a bill as paid THEN the Bill Reminder System SHALL record the payment date and update the bill status
2. WHEN a linked recurring transaction is processed THEN the Bill Reminder System SHALL automatically mark the corresponding bill as paid
3. WHEN a bill is marked as paid THEN the Bill Reminder System SHALL calculate and display the next due date for recurring bills
4. WHEN viewing payment history THEN the Bill Reminder System SHALL display all past payments for a bill with dates and amounts

### Requirement 5

**User Story:** As a user, I want to see a dashboard widget showing bills due this week, so that I can quickly see what payments are coming up.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the Bill Reminder System SHALL display a widget showing bills due within the next 7 days
2. WHEN displaying the widget THEN the Bill Reminder System SHALL show the total amount due this week
3. WHEN a bill in the widget is clicked THEN the Bill Reminder System SHALL navigate to the bill details
4. WHEN no bills are due this week THEN the Bill Reminder System SHALL display a success message indicating no upcoming payments
5. WHEN the widget displays bills THEN the Bill Reminder System SHALL sort them by due date ascending

### Requirement 6

**User Story:** As a user, I want to categorize my bills, so that I can organize and analyze my recurring expenses.

#### Acceptance Criteria

1. WHEN creating a bill THEN the Bill Reminder System SHALL allow selecting a category from existing categories
2. WHEN viewing bills THEN the Bill Reminder System SHALL allow filtering by category
3. WHEN viewing bill analytics THEN the Bill Reminder System SHALL display total monthly bills by category
4. WHEN a bill has no category THEN the Bill Reminder System SHALL display it under "Uncategorized"

### Requirement 7

**User Story:** As a user, I want to import bills from my recurring transactions, so that I can quickly set up reminders for existing payments.

#### Acceptance Criteria

1. WHEN a user initiates bill import THEN the Bill Reminder System SHALL display all recurring transactions not yet linked to bills
2. WHEN a user selects recurring transactions to import THEN the Bill Reminder System SHALL create bill reminders with default reminder settings
3. WHEN importing a recurring transaction THEN the Bill Reminder System SHALL use the next payment date as the initial due date
4. WHEN import is complete THEN the Bill Reminder System SHALL display a summary of imported bills

### Requirement 8

**User Story:** As a user, I want to see bill payment statistics, so that I can understand my payment patterns.

#### Acceptance Criteria

1. WHEN viewing bill statistics THEN the Bill Reminder System SHALL display total monthly bill amount
2. WHEN viewing bill statistics THEN the Bill Reminder System SHALL display on-time payment percentage
3. WHEN viewing bill statistics THEN the Bill Reminder System SHALL display average days before due date when paid
4. WHEN viewing bill statistics THEN the Bill Reminder System SHALL display bills by category breakdown
