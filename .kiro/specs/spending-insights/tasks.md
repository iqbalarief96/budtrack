# Implementation Plan - Spending Insights & Anomaly Alerts

- [x] 1. Setup database schema dan types





  - [x] 1.1 Add SpendingInsight, SpendingAlert, SpendingStats models to Prisma schema


    - Add models dengan fields sesuai design document
    - Run prisma migrate
    - _Requirements: 2.5, 4.1_

  - [x] 1.2 Create TypeScript types for spending insights feature

    - Create `app/types/spending-insights.ts` dengan interfaces
    - _Requirements: 1.1, 2.1, 4.1_


- [x] 2. Implement PatternAnalysisService




  - [x] 2.1 Create PatternAnalysisService with core analysis logic


    - Create `lib/spending-insights/pattern-service.ts`
    - Implement getSpendingPatterns, calculateTrend, compareMonths
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 Write property test for category average calculation


    - **Property 1: Category Average Calculation**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Write property test for trend detection

    - **Property 2: Trend Detection Accuracy**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test for month comparison

    - **Property 3: Month-over-Month Comparison**
    - **Validates: Requirements 1.3**
  - [x] 2.5 Implement top categories and day-of-week patterns


    - Add getTopCategories, getDayOfWeekPatterns methods
    - _Requirements: 1.4, 1.5_
  - [x] 2.6 Write property test for top categories ordering


    - **Property 4: Top Categories Ordering**
    - **Validates: Requirements 1.4**


- [x] 3. Implement AnomalyDetectionService



  - [x] 3.1 Create AnomalyDetectionService with detection logic


    - Create `lib/spending-insights/anomaly-service.ts`
    - Implement detectAnomalies, calculateBaseline
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Implement spending spike detection
    - Add detectSpendingSpike method (>50% threshold)
    - _Requirements: 2.1_
  - [x] 3.3 Write property test for spike detection


    - **Property 5: Spending Spike Detection**

    - **Validates: Requirements 2.1**
  - [x] 3.4 Implement large transaction detection
    - Add detectLargeTransaction method (>3x average)
    - _Requirements: 2.2_

  - [x] 3.5 Write property test for large transaction detection

    - **Property 6: Large Transaction Detection**
    - **Validates: Requirements 2.2**
  - [x] 3.6 Implement frequency change detection
    - Add detectFrequencyChange method (>40% change)
    - _Requirements: 2.3_

  - [x] 3.7 Write property test for frequency change detection

    - **Property 7: Frequency Change Detection**
    - **Validates: Requirements 2.3**
  - [x] 3.8 Implement severity assignment
    - Add calculateSeverity method
    - _Requirements: 2.4_

  - [x] 3.9 Write property test for severity assignment

    - **Property 8: Severity Assignment Consistency**
    - **Validates: Requirements 2.4**


- [x] 4. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement InsightGeneratorService





  - [x] 5.1 Create InsightGeneratorService


    - Create `lib/spending-insights/insight-service.ts`
    - Implement generateInsights, markAsRead, dismissInsight
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Implement spending increase insight generation

    - Add generateSpendingIncreaseInsight method (>20% increase)
    - _Requirements: 3.1_

  - [x] 5.3 Write property test for spending increase insight

    - **Property 9: Spending Increase Insight Generation**
    - **Validates: Requirements 3.1**
  - [x] 5.4 Implement absence and pattern insights


    - Add generateAbsenceInsight, generateWeekendPatternInsight
    - _Requirements: 3.2, 3.4_



- [x] 6. Implement AlertService




  - [x] 6.1 Create AlertService with CRUD operations


    - Create `lib/spending-insights/alert-service.ts`
    - Implement createAlert, updateAlert, deleteAlert, getAlerts
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 6.2 Implement threshold checking
    - Add checkAlerts, checkThreshold methods
    - _Requirements: 4.2, 4.3_
  - [x] 6.3 Write property test for threshold detection


    - **Property 10: Alert Threshold Detection**
    - **Validates: Requirements 4.2, 4.3**
  - [x] 6.4 Write property test for alert data round-trip


    - **Property 11: Alert Data Round-Trip**
    - **Validates: Requirements 4.1, 4.4, 4.5**

- [x] 7. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create API endpoints




  - [x] 8.1 Create GET /api/insights/spending endpoint


    - Create `app/api/insights/spending/route.ts`
    - Return spending insights for user
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 8.2 Create POST /api/insights/spending/dismiss endpoint

    - Create `app/api/insights/spending/dismiss/route.ts`
    - Mark insight as dismissed
    - _Requirements: 5.4_

  - [x] 8.3 Create GET /api/insights/patterns endpoint

    - Create `app/api/insights/patterns/route.ts`
    - Return spending patterns
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 8.4 Create GET /api/insights/anomalies endpoint

    - Create `app/api/insights/anomalies/route.ts`
    - Return detected anomalies
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 8.5 Create CRUD endpoints for alerts

    - Create `app/api/alerts/spending/route.ts` (GET, POST)
    - Create `app/api/alerts/spending/[alertId]/route.ts` (PUT, DELETE)
    - _Requirements: 4.1, 4.4, 4.5_


- [x] 9. Create UI components





  - [x] 9.1 Create SpendingPatternCard component


    - Create `components/spending-insights/SpendingPatternCard.tsx`
    - Display category patterns with trends
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 9.2 Create SpendingTrendChart component

    - Create `components/spending-insights/SpendingTrendChart.tsx`
    - Display spending trends over time
    - _Requirements: 1.2_

  - [x] 9.3 Create AnomalyAlert component

    - Create `components/spending-insights/AnomalyAlert.tsx`
    - Display anomaly with severity indicator
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 9.4 Create InsightCard component

    - Create `components/spending-insights/InsightCard.tsx`
    - Display insight with dismiss action
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3, 5.4_

  - [x] 9.5 Create SpendingAlertForm component

    - Create `components/spending-insights/SpendingAlertForm.tsx`
    - Form for creating/editing alerts
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 9.6 Create SpendingAlertList component

    - Create `components/spending-insights/SpendingAlertList.tsx`
    - List all alerts with toggle
    - _Requirements: 4.1, 4.5_


- [x] 10. Create Spending Insights page





  - [x] 10.1 Create main spending insights page

    - Create `app/spending-insights/page.tsx`
    - Integrate patterns, anomalies, insights, alerts
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 11. Create Dashboard widget





  - [x] 11.1 Create SpendingInsightsWidget component

    - Create `components/dashboard/SpendingInsightsWidget.tsx`
    - Display top 3 insights with badge
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 12. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
