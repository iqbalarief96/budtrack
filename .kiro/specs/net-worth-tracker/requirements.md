# Requirements Document

## Introduction

Net Worth Tracker adalah fitur untuk melacak total kekayaan bersih pengguna (total aset dikurangi total liabilitas) dari waktu ke waktu. Fitur ini menyediakan visualisasi grafik pertumbuhan net worth, breakdown aset dan liabilitas, serta kemampuan untuk menetapkan target net worth.

## Glossary

- **Net Worth**: Total kekayaan bersih yang dihitung dari total aset dikurangi total liabilitas
- **Asset**: Sumber daya finansial yang dimiliki pengguna (saldo wallet, tabungan, investasi)
- **Liability**: Kewajiban finansial pengguna (hutang, pinjaman, kartu kredit)
- **Snapshot**: Rekaman nilai net worth pada titik waktu tertentu
- **Net Worth Goal**: Target nilai net worth yang ingin dicapai pengguna
- **Wallet**: Akun keuangan pengguna dalam sistem (cash, bank, e-wallet, savings)
- **Debt**: Catatan hutang pengguna dalam sistem

## Requirements

### Requirement 1

**User Story:** As a user, I want to see my current net worth, so that I can understand my overall financial position.

#### Acceptance Criteria

1. WHEN a user opens the net worth page, THE Net Worth Tracker SHALL display the current net worth value calculated from total assets minus total liabilities.
2. WHEN displaying net worth, THE Net Worth Tracker SHALL show a breakdown of total assets and total liabilities separately.
3. WHEN calculating assets, THE Net Worth Tracker SHALL include all wallet balances from the user's wallets.
4. WHEN calculating liabilities, THE Net Worth Tracker SHALL include all active debt amounts from the user's debt records.
5. WHEN the net worth changes from the previous period, THE Net Worth Tracker SHALL display the percentage change with appropriate color coding (green for positive, red for negative).

### Requirement 2

**User Story:** As a user, I want to see my net worth history over time, so that I can track my financial progress.

#### Acceptance Criteria

1. WHEN a user views net worth history, THE Net Worth Tracker SHALL display a line chart showing net worth values over time.
2. WHEN displaying history, THE Net Worth Tracker SHALL allow filtering by time period (3 months, 6 months, 1 year, all time).
3. WHEN a new month begins, THE Net Worth Tracker SHALL automatically create a snapshot of the current net worth.
4. WHEN displaying the chart, THE Net Worth Tracker SHALL highlight positive trends in green and negative trends in red.
5. WHEN a user hovers over a data point, THE Net Worth Tracker SHALL display the exact net worth value and date.

### Requirement 3

**User Story:** As a user, I want to see detailed breakdown of my assets and liabilities, so that I can understand what contributes to my net worth.

#### Acceptance Criteria

1. WHEN displaying asset breakdown, THE Net Worth Tracker SHALL categorize assets by wallet type (Cash, Bank, E-Wallet, Savings).
2. WHEN displaying liability breakdown, THE Net Worth Tracker SHALL categorize liabilities by debt type.
3. WHEN displaying breakdown, THE Net Worth Tracker SHALL show pie charts for visual representation of asset and liability distribution.
4. WHEN a user clicks on a category, THE Net Worth Tracker SHALL display detailed items within that category.
5. WHEN displaying categories, THE Net Worth Tracker SHALL show growth or decline percentage for each category compared to previous period.

### Requirement 4

**User Story:** As a user, I want to set net worth targets, so that I can work towards specific financial milestones.

#### Acceptance Criteria

1. WHEN a user creates a net worth goal, THE Net Worth Tracker SHALL store the target amount and target date.
2. WHEN displaying a goal, THE Net Worth Tracker SHALL show progress percentage towards the target.
3. WHEN a goal exists, THE Net Worth Tracker SHALL calculate and display the required monthly growth rate to achieve the goal.
4. WHEN a user reaches a milestone (25%, 50%, 75%, 100%), THE Net Worth Tracker SHALL record the achievement.
5. WHEN a user wants to modify a goal, THE Net Worth Tracker SHALL allow updating the target amount and date.

### Requirement 5

**User Story:** As a user, I want to see net worth summary on dashboard, so that I can quickly check my financial position.

#### Acceptance Criteria

1. WHEN displaying the dashboard, THE Net Worth Tracker SHALL show a widget with current net worth value.
2. WHEN displaying the widget, THE Net Worth Tracker SHALL show a mini trend chart for the last 6 months.
3. WHEN a user clicks the widget, THE Net Worth Tracker SHALL navigate to the full net worth page.
4. WHEN wallet balances or debts change, THE Net Worth Tracker SHALL update the displayed net worth value.
5. WHEN displaying the widget, THE Net Worth Tracker SHALL show the trend indicator (up/down arrow with percentage).
