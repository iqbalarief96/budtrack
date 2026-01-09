# Requirements Document

## Introduction

Fitur Wallet Linking memungkinkan user untuk menghubungkan beberapa wallet menjadi satu grup, sehingga transaksi dari semua wallet yang terhubung dapat dilihat dalam satu tampilan gabungan. Fitur ini sangat berguna untuk pasangan yang baru menikah atau keluarga yang ingin mengelola keuangan bersama sambil tetap mempertahankan wallet pribadi masing-masing.

## Glossary

- **Wallet_Group**: Kumpulan wallet yang di-link bersama untuk melihat data gabungan
- **Linked_Wallet**: Wallet individual yang menjadi bagian dari Wallet_Group
- **Group_Owner**: User yang membuat dan mengelola Wallet_Group
- **Aggregated_View**: Tampilan gabungan yang menampilkan data dari semua Linked_Wallet
- **System**: Aplikasi BudTrack yang mengelola wallet dan transaksi

## Requirements

### Requirement 1: Create Wallet Group

**User Story:** As a user, I want to create a wallet group, so that I can link multiple wallets together for combined financial tracking.

#### Acceptance Criteria

1. WHEN a user creates a new wallet group with a valid name, THE System SHALL create the group and set the user as Group_Owner
2. WHEN a user attempts to create a wallet group with an empty name, THE System SHALL reject the creation and display an error message
3. WHEN a wallet group is created, THE System SHALL allow the Group_Owner to add their own wallets to the group
4. THE System SHALL limit each user to a maximum of 5 wallet groups

### Requirement 2: Link Wallets to Group

**User Story:** As a group owner, I want to add wallets to my wallet group, so that their transactions appear in the combined view.

#### Acceptance Criteria

1. WHEN a Group_Owner adds a wallet to a group, THE System SHALL link the wallet and include its transactions in the Aggregated_View
2. WHEN a Group_Owner attempts to add a wallet that is already in another group, THE System SHALL allow it (wallets can belong to multiple groups)
3. WHEN a wallet is linked to a group, THE System SHALL preserve all existing wallet data and functionality
4. THE System SHALL allow a maximum of 10 wallets per Wallet_Group

### Requirement 3: View Aggregated Transactions

**User Story:** As a user, I want to view transactions from all linked wallets in one place, so that I can see the complete financial picture.

#### Acceptance Criteria

1. WHEN a user selects a Wallet_Group, THE System SHALL display all transactions from all Linked_Wallets sorted by date
2. WHEN displaying aggregated transactions, THE System SHALL indicate which wallet each transaction belongs to
3. WHEN filtering transactions in Aggregated_View, THE System SHALL apply filters across all Linked_Wallets
4. WHEN a new transaction is added to any Linked_Wallet, THE System SHALL automatically include it in the Aggregated_View

### Requirement 4: View Aggregated Balance and Summary

**User Story:** As a user, I want to see the combined balance and financial summary of all linked wallets, so that I can understand our total financial position.

#### Acceptance Criteria

1. WHEN viewing a Wallet_Group, THE System SHALL display the total combined balance of all Linked_Wallets
2. WHEN viewing a Wallet_Group summary, THE System SHALL show aggregated income and expense totals
3. WHEN viewing a Wallet_Group, THE System SHALL display a breakdown showing each Linked_Wallet's contribution to the total
4. WHILE different Linked_Wallets have different currencies, THE System SHALL convert and display amounts in the Group_Owner's default currency

### Requirement 5: Manage Wallet Group

**User Story:** As a group owner, I want to manage my wallet group, so that I can update, remove wallets, or delete the group as needed.

#### Acceptance Criteria

1. WHEN a Group_Owner removes a wallet from a group, THE System SHALL unlink the wallet while preserving all wallet data
2. WHEN a Group_Owner updates the group name, THE System SHALL save the new name immediately
3. WHEN a Group_Owner deletes a wallet group, THE System SHALL remove the group without affecting the individual wallets
4. IF a Linked_Wallet is deleted by its owner, THEN THE System SHALL automatically remove it from all Wallet_Groups

### Requirement 6: Wallet Group Selection in UI

**User Story:** As a user, I want to easily switch between individual wallets and wallet groups, so that I can view data at different levels.

#### Acceptance Criteria

1. WHEN viewing the wallet selector, THE System SHALL display both individual wallets and Wallet_Groups as selectable options
2. WHEN a Wallet_Group is selected, THE System SHALL update all dashboard widgets to show aggregated data
3. WHEN switching from Wallet_Group to individual wallet, THE System SHALL display only that wallet's data
4. THE System SHALL visually distinguish Wallet_Groups from individual wallets in the selector

### Requirement 7: Aggregated Dashboard

**User Story:** As a user, I want to see aggregated dashboard data when viewing a wallet group, so that I can understand the combined financial health.

#### Acceptance Criteria

1. WHEN a Wallet_Group is selected, THE System SHALL display aggregated spending charts from all Linked_Wallets
2. WHEN a Wallet_Group is selected, THE System SHALL display combined income vs expense comparison
3. WHEN a Wallet_Group is selected, THE System SHALL display top spending categories across all Linked_Wallets
4. WHEN a Wallet_Group is selected, THE System SHALL display financial health score based on combined data

### Requirement 8: Aggregated Spending Insights

**User Story:** As a user, I want to see spending insights and patterns from all linked wallets, so that I can identify combined spending behaviors.

#### Acceptance Criteria

1. WHEN a Wallet_Group is selected, THE System SHALL analyze spending patterns across all Linked_Wallets
2. WHEN a Wallet_Group is selected, THE System SHALL detect anomalies in combined spending data
3. WHEN a Wallet_Group is selected, THE System SHALL show spending trends aggregated from all Linked_Wallets
4. WHEN a Wallet_Group is selected, THE System SHALL provide insights comparing spending between Linked_Wallets

### Requirement 9: Aggregated Budget Tracking

**User Story:** As a user, I want to track budgets across all linked wallets, so that I can manage combined spending limits.

#### Acceptance Criteria

1. WHEN a Wallet_Group is selected, THE System SHALL display budget progress based on spending from all Linked_Wallets
2. WHEN a Wallet_Group is selected, THE System SHALL calculate budget utilization from combined transactions
3. WHEN budget alerts are triggered, THE System SHALL consider spending from all Linked_Wallets in the group
4. THE System SHALL allow creating budgets that apply to a Wallet_Group scope

### Requirement 10: Aggregated Reports

**User Story:** As a user, I want to generate reports from all linked wallets, so that I can analyze combined financial data.

#### Acceptance Criteria

1. WHEN generating a report for a Wallet_Group, THE System SHALL include transactions from all Linked_Wallets
2. WHEN generating a report for a Wallet_Group, THE System SHALL show per-wallet breakdown within the report
3. WHEN exporting report data, THE System SHALL indicate which wallet each transaction belongs to
4. THE System SHALL support date range filtering for aggregated reports

### Requirement 11: Aggregated Bills View

**User Story:** As a user, I want to see all bills from linked wallets in one place, so that I can track combined payment obligations.

#### Acceptance Criteria

1. WHEN a Wallet_Group is selected, THE System SHALL display bills from all Linked_Wallets
2. WHEN displaying aggregated bills, THE System SHALL indicate which wallet each bill is associated with
3. WHEN a Wallet_Group is selected, THE System SHALL show total upcoming bill amounts across all Linked_Wallets
4. WHEN a Wallet_Group is selected, THE System SHALL display bill payment statistics from combined data

### Requirement 12: Aggregated Goals View

**User Story:** As a user, I want to see all savings goals from linked wallets, so that I can track combined progress toward financial goals.

#### Acceptance Criteria

1. WHEN a Wallet_Group is selected, THE System SHALL display goals from all Linked_Wallets
2. WHEN displaying aggregated goals, THE System SHALL indicate which wallet each goal is linked to
3. WHEN a Wallet_Group is selected, THE System SHALL show total goal progress across all Linked_Wallets
4. WHEN a Wallet_Group is selected, THE System SHALL display combined savings rate from all Linked_Wallets

### Requirement 13: Aggregated Recurring Transactions

**User Story:** As a user, I want to see all recurring transactions from linked wallets, so that I can understand combined regular income and expenses.

#### Acceptance Criteria

1. WHEN a Wallet_Group is selected, THE System SHALL display recurring transactions from all Linked_Wallets
2. WHEN displaying aggregated recurring transactions, THE System SHALL indicate which wallet each belongs to
3. WHEN a Wallet_Group is selected, THE System SHALL show total recurring income and expense amounts
4. WHEN a Wallet_Group is selected, THE System SHALL display upcoming recurring transactions from all Linked_Wallets
