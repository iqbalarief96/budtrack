# Requirements Document

## Introduction

Spending Insights & Anomaly Alerts adalah fitur untuk menganalisis pola pengeluaran pengguna dan memberikan alert ketika ada anomali atau perubahan signifikan dalam kebiasaan spending. Fitur ini membantu pengguna memahami kebiasaan finansial mereka dan mengambil keputusan yang lebih baik.

## Glossary

- **Spending Pattern**: Pola pengeluaran pengguna berdasarkan kategori, waktu, dan frekuensi
- **Anomaly**: Pengeluaran yang menyimpang signifikan dari pola normal pengguna
- **Baseline**: Nilai rata-rata pengeluaran yang digunakan sebagai referensi untuk deteksi anomali
- **Insight**: Informasi atau rekomendasi yang dihasilkan dari analisis pola pengeluaran
- **Spending Alert**: Notifikasi yang dikirim ketika pengeluaran mencapai threshold tertentu
- **Deviation**: Persentase penyimpangan dari nilai baseline
- **Category**: Kategori transaksi pengeluaran (Food, Transport, Entertainment, dll)

## Requirements

### Requirement 1

**User Story:** As a user, I want to see analysis of my spending patterns, so that I can understand my financial habits.

#### Acceptance Criteria

1. WHEN a user views spending insights, THE Spending Insights System SHALL display average spending by category over the last 3 months.
2. WHEN displaying patterns, THE Spending Insights System SHALL show spending trends (increasing, decreasing, stable) for each category.
3. WHEN displaying patterns, THE Spending Insights System SHALL compare current month spending versus previous month with percentage difference.
4. WHEN analyzing patterns, THE Spending Insights System SHALL identify and display the top 5 spending categories.
5. WHEN sufficient data exists (minimum 3 months), THE Spending Insights System SHALL display day-of-week spending patterns.

### Requirement 2

**User Story:** As a user, I want to be notified when my spending is unusual, so that I can stay aware of my financial behavior.

#### Acceptance Criteria

1. WHEN spending in a category exceeds 50% above the 3-month average, THE Spending Insights System SHALL generate a spending spike anomaly.
2. WHEN a single transaction exceeds 3 times the average transaction size for that category, THE Spending Insights System SHALL flag the transaction as a large transaction anomaly.
3. WHEN transaction frequency in a category changes by more than 40% from the baseline, THE Spending Insights System SHALL generate a frequency change anomaly.
4. WHEN generating an anomaly, THE Spending Insights System SHALL assign a severity level (low, medium, high) based on the deviation percentage.
5. WHEN an anomaly is detected, THE Spending Insights System SHALL store the anomaly with category, deviation percentage, and timestamp.

### Requirement 3

**User Story:** As a user, I want to receive personalized spending insights, so that I can make better financial decisions.

#### Acceptance Criteria

1. WHEN spending in a category increases by more than 20%, THE Spending Insights System SHALL generate an insight message describing the increase.
2. WHEN a user has not spent in a regular category for 2 weeks, THE Spending Insights System SHALL generate an insight noting the absence.
3. WHEN average transaction size changes by more than 25%, THE Spending Insights System SHALL generate an insight about transaction size changes.
4. WHEN weekend spending differs significantly from weekday spending (more than 30%), THE Spending Insights System SHALL generate a weekend spending insight.
5. WHEN generating insights, THE Spending Insights System SHALL include actionable recommendations where applicable.

### Requirement 4

**User Story:** As a user, I want to set custom spending alerts, so that I can control my expenses proactively.

#### Acceptance Criteria

1. WHEN a user creates a spending alert, THE Spending Insights System SHALL store the alert type, category, and threshold amount.
2. WHEN spending reaches 80% of a category limit, THE Spending Insights System SHALL generate a warning notification.
3. WHEN spending reaches 100% of a category limit, THE Spending Insights System SHALL generate an exceeded notification.
4. WHEN a user wants to modify an alert, THE Spending Insights System SHALL allow updating the threshold and category.
5. WHEN a user wants to disable an alert, THE Spending Insights System SHALL allow toggling the alert active status.

### Requirement 5

**User Story:** As a user, I want to see spending insights on dashboard, so that I can quickly understand my spending behavior.

#### Acceptance Criteria

1. WHEN displaying the dashboard, THE Spending Insights System SHALL show a widget with the most recent unread insights.
2. WHEN displaying the widget, THE Spending Insights System SHALL show a maximum of 3 insights sorted by severity.
3. WHEN a user clicks an insight, THE Spending Insights System SHALL mark the insight as read.
4. WHEN a user dismisses an insight, THE Spending Insights System SHALL hide the insight from the widget.
5. WHEN new anomalies are detected, THE Spending Insights System SHALL display a notification badge on the widget.
