# Requirements Document

## Introduction

Financial Goals Timeline adalah fitur untuk memvisualisasikan kapan pengguna dapat mencapai goals finansial mereka berdasarkan saving rate dan progress saat ini. Fitur ini menyediakan proyeksi timeline yang realistis, scenario planning, dan rekomendasi untuk mengoptimalkan pencapaian goals.

## Glossary

- **Financial Goal**: Target finansial yang ingin dicapai pengguna (tabungan, pembelian, investasi)
- **Saving Rate**: Persentase pendapatan yang ditabung oleh pengguna
- **Timeline**: Visualisasi waktu pencapaian goals dalam bentuk grafik
- **Projection**: Perkiraan tanggal pencapaian goal berdasarkan saving rate saat ini
- **Confidence Level**: Tingkat keyakinan proyeksi berdasarkan konsistensi saving rate
- **Scenario**: Simulasi alternatif dengan parameter berbeda untuk melihat dampak pada timeline
- **Milestone**: Titik pencapaian dalam perjalanan menuju goal (25%, 50%, 75%, 100%)
- **Priority**: Urutan kepentingan goals yang mempengaruhi alokasi resources

## Requirements

### Requirement 1

**User Story:** As a user, I want to see when I can achieve my financial goals, so that I can plan my financial future effectively.

#### Acceptance Criteria

1. WHEN a user views the goals timeline, THE Financial Goals Timeline System SHALL display a timeline chart showing all active goals with projected completion dates.
2. WHEN calculating projections, THE Financial Goals Timeline System SHALL use the user's average saving rate from the last 3 months.
3. WHEN displaying goals, THE Financial Goals Timeline System SHALL show current progress percentage and remaining amount for each goal.
4. WHEN a goal is behind schedule, THE Financial Goals Timeline System SHALL highlight the goal with a warning indicator.
5. WHEN displaying projections, THE Financial Goals Timeline System SHALL show a confidence level (low, medium, high) based on saving rate consistency.

### Requirement 2

**User Story:** As a user, I want to understand my current saving rate, so that I can see how it affects my goal timeline.

#### Acceptance Criteria

1. WHEN calculating saving rate, THE Financial Goals Timeline System SHALL compute monthly savings from income minus expenses.
2. WHEN displaying saving rate, THE Financial Goals Timeline System SHALL show average rates for 3-month, 6-month, and 12-month periods.
3. WHEN saving rate changes significantly (more than 10%), THE Financial Goals Timeline System SHALL display the trend direction (improving, declining, stable).
4. WHEN displaying saving rate, THE Financial Goals Timeline System SHALL compare the current rate to the required rate for achieving goals on time.
5. WHEN saving rate is insufficient for any goal, THE Financial Goals Timeline System SHALL display the gap amount needed.

### Requirement 3

**User Story:** As a user, I want to prioritize my financial goals, so that I can focus on what is most important.

#### Acceptance Criteria

1. WHEN a user sets goal priorities, THE Financial Goals Timeline System SHALL store the priority order (1 being highest).
2. WHEN displaying the timeline, THE Financial Goals Timeline System SHALL show goals ordered by priority.
3. WHEN priorities change, THE Financial Goals Timeline System SHALL recalculate projections based on new resource allocation.
4. WHEN displaying priorities, THE Financial Goals Timeline System SHALL show how prioritization affects each goal's timeline.
5. WHEN a user has multiple goals, THE Financial Goals Timeline System SHALL suggest optimal sequencing based on goal amounts and deadlines.

### Requirement 4

**User Story:** As a user, I want to see different scenarios for achieving goals, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN a user creates a scenario, THE Financial Goals Timeline System SHALL allow adjusting monthly savings amount.
2. WHEN a user creates a scenario, THE Financial Goals Timeline System SHALL allow adjusting goal target amounts.
3. WHEN a scenario is created, THE Financial Goals Timeline System SHALL calculate new projected completion dates for all goals.
4. WHEN displaying scenarios, THE Financial Goals Timeline System SHALL allow comparing up to 3 scenarios side by side.
5. WHEN a user selects a scenario, THE Financial Goals Timeline System SHALL show the impact on each goal's timeline.

### Requirement 5

**User Story:** As a user, I want to track my progress towards timeline milestones, so that I can stay motivated and on track.

#### Acceptance Criteria

1. WHEN a goal reaches a milestone (25%, 50%, 75%, 100%), THE Financial Goals Timeline System SHALL record the achievement with timestamp.
2. WHEN displaying progress, THE Financial Goals Timeline System SHALL show actual progress versus projected progress.
3. WHEN actual progress falls behind projected progress by more than 10%, THE Financial Goals Timeline System SHALL generate an alert.
4. WHEN a milestone is achieved, THE Financial Goals Timeline System SHALL display a celebration notification.
5. WHEN progress is behind schedule, THE Financial Goals Timeline System SHALL suggest adjustments to get back on track.

### Requirement 6

**User Story:** As a user, I want to receive recommendations to optimize my timeline, so that I can achieve goals faster or more efficiently.

#### Acceptance Criteria

1. WHEN analyzing goals, THE Financial Goals Timeline System SHALL calculate how much additional monthly savings would accelerate each goal.
2. WHEN multiple goals exist, THE Financial Goals Timeline System SHALL suggest optimal goal ordering to minimize total time.
3. WHEN a goal target appears unrealistic, THE Financial Goals Timeline System SHALL suggest alternative target amounts.
4. WHEN generating recommendations, THE Financial Goals Timeline System SHALL identify spending categories that could be reduced to increase savings.
5. WHEN displaying recommendations, THE Financial Goals Timeline System SHALL show the projected impact of each recommendation on the timeline.
