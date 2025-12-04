# Spending Insights & Anomaly Alerts - Design Document

## Overview

Spending Insights adalah sistem untuk menganalisis pola pengeluaran pengguna, mendeteksi anomali, dan memberikan insights yang actionable. Sistem ini menggunakan data transaksi historis untuk membangun baseline, mendeteksi penyimpangan, dan menghasilkan rekomendasi personalisasi.

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        SIP[Spending Insights Page]
        SIW[Dashboard Widget]
        ALP[Alerts Config Page]
    end
    
    subgraph "API Layer"
        SIAPI[/api/insights/spending]
        PAAPI[/api/insights/patterns]
        ANAPI[/api/insights/anomalies]
        ALAPI[/api/alerts/spending]
    end
    
    subgraph "Service Layer"
        PAS[PatternAnalysisService]
        ADS[AnomalyDetectionService]
        IGS[InsightGeneratorService]
        ALS[AlertService]
    end
    
    subgraph "Data Layer"
        Trans[(Transaction)]
        Insight[(SpendingInsight)]
        Alert[(SpendingAlert)]
        Stats[(SpendingStats)]
    end
    
    SIP --> SIAPI
    SIP --> PAAPI
    SIP --> ANAPI
    SIW --> SIAPI
    ALP --> ALAPI
    
    SIAPI --> IGS
    PAAPI --> PAS
    ANAPI --> ADS
    ALAPI --> ALS
    
    PAS --> Trans
    PAS --> Stats
    ADS --> Trans
    ADS --> Stats
    IGS --> Insight
    ALS --> Alert
```

## Components and Interfaces

### 1. PatternAnalysisService

Komponen untuk menganalisis pola pengeluaran.

```typescript
interface SpendingPattern {
  categoryId: string
  categoryName: string
  averageAmount: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercentage: number
  monthlyData: MonthlySpending[]
}

interface MonthlySpending {
  month: Date
  amount: number
  transactionCount: number
}

interface DayOfWeekPattern {
  dayOfWeek: number // 0-6
  averageAmount: number
  transactionCount: number
}

interface PatternAnalysisService {
  getSpendingPatterns(userId: string, months: number): Promise<SpendingPattern[]>
  getTopCategories(userId: string, limit: number): Promise<SpendingPattern[]>
  getDayOfWeekPatterns(userId: string): Promise<DayOfWeekPattern[]>
  calculateTrend(monthlyData: MonthlySpending[]): TrendResult
  compareMonths(current: number, previous: number): ComparisonResult
}

interface TrendResult {
  direction: 'increasing' | 'decreasing' | 'stable'
  percentage: number
}

interface ComparisonResult {
  difference: number
  percentageChange: number
}
```

### 2. AnomalyDetectionService

Komponen untuk mendeteksi anomali pengeluaran.

```typescript
interface Anomaly {
  id: string
  type: 'spike' | 'large_transaction' | 'frequency_change'
  categoryId: string | null
  severity: 'low' | 'medium' | 'high'
  deviation: number
  currentValue: number
  baselineValue: number
  detectedAt: Date
  transactionId?: string
}

interface AnomalyDetectionConfig {
  spikeThreshold: number      // default: 0.5 (50%)
  largeTransactionMultiplier: number  // default: 3
  frequencyChangeThreshold: number    // default: 0.4 (40%)
}

interface AnomalyDetectionService {
  detectAnomalies(userId: string): Promise<Anomaly[]>
  detectSpendingSpike(current: number, baseline: number, threshold: number): boolean
  detectLargeTransaction(amount: number, categoryAverage: number, multiplier: number): boolean
  detectFrequencyChange(current: number, baseline: number, threshold: number): boolean
  calculateSeverity(deviation: number): 'low' | 'medium' | 'high'
  calculateBaseline(transactions: Transaction[], months: number): BaselineData
}

interface BaselineData {
  categoryAverages: Map<string, number>
  transactionSizeAverages: Map<string, number>
  frequencyByCategory: Map<string, number>
}
```

### 3. InsightGeneratorService

Komponen untuk menghasilkan insights personalisasi.

```typescript
interface SpendingInsight {
  id: string
  userId: string
  type: 'spending_increase' | 'spending_decrease' | 'absence' | 'transaction_size' | 'weekend_pattern'
  categoryId: string | null
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  data: object
  isRead: boolean
  isDismissed: boolean
  createdAt: Date
}

interface InsightGeneratorService {
  generateInsights(userId: string): Promise<SpendingInsight[]>
  generateSpendingIncreaseInsight(category: string, increase: number): SpendingInsight
  generateAbsenceInsight(category: string, daysSinceLastSpend: number): SpendingInsight
  generateTransactionSizeInsight(category: string, change: number): SpendingInsight
  generateWeekendPatternInsight(weekendAvg: number, weekdayAvg: number): SpendingInsight
  markAsRead(insightId: string): Promise<void>
  dismissInsight(insightId: string): Promise<void>
}
```

### 4. AlertService

Komponen untuk mengelola spending alerts.

```typescript
interface SpendingAlert {
  id: string
  userId: string
  type: 'category_limit' | 'daily_limit' | 'anomaly'
  categoryId: string | null
  threshold: number
  isActive: boolean
  createdAt: Date
}

interface AlertNotification {
  alertId: string
  type: 'warning' | 'exceeded'
  currentAmount: number
  threshold: number
  percentage: number
}

interface AlertService {
  createAlert(userId: string, data: CreateAlertInput): Promise<SpendingAlert>
  updateAlert(alertId: string, data: UpdateAlertInput): Promise<SpendingAlert>
  deleteAlert(alertId: string): Promise<void>
  getAlerts(userId: string): Promise<SpendingAlert[]>
  checkAlerts(userId: string): Promise<AlertNotification[]>
  checkThreshold(current: number, threshold: number): ThresholdStatus
}

type ThresholdStatus = 'normal' | 'warning' | 'exceeded'
```

## Data Models

### Database Schema (Prisma)

```prisma
model SpendingInsight {
  id          String   @id @default(cuid())
  userId      String
  type        String
  categoryId  String?
  title       String
  description String
  severity    String
  data        Json
  isRead      Boolean  @default(false)
  isDismissed Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])
  
  @@map("spending_insights")
}

model SpendingAlert {
  id         String   @id @default(cuid())
  userId     String
  type       String
  categoryId String?
  threshold  Decimal  @db.Decimal(15, 2)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])
  
  @@map("spending_alerts")
}

model SpendingStats {
  id         String   @id @default(cuid())
  userId     String
  categoryId String?
  period     String
  date       DateTime
  amount     Decimal  @db.Decimal(15, 2)
  count      Int
  avgAmount  Decimal  @db.Decimal(15, 2)
  createdAt  DateTime @default(now())
  
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])
  
  @@unique([userId, categoryId, period, date])
  @@map("spending_stats")
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Category Average Calculation
*For any* set of transactions in a category over N months, the average spending SHALL equal the sum of all transaction amounts divided by N.
**Validates: Requirements 1.1**

### Property 2: Trend Detection Accuracy
*For any* sequence of monthly spending values, trend detection SHALL correctly identify increasing (last > first by >10%), decreasing (last < first by >10%), or stable patterns.
**Validates: Requirements 1.2**

### Property 3: Month-over-Month Comparison
*For any* two monthly totals, the percentage difference SHALL equal ((current - previous) / |previous|) * 100.
**Validates: Requirements 1.3**

### Property 4: Top Categories Ordering
*For any* set of category totals, the top N categories SHALL be returned in descending order by amount.
**Validates: Requirements 1.4**

### Property 5: Spending Spike Detection
*For any* current spending and baseline, a spike anomaly SHALL be generated if and only if current > baseline * 1.5.
**Validates: Requirements 2.1**

### Property 6: Large Transaction Detection
*For any* transaction amount and category average, a large transaction anomaly SHALL be generated if and only if amount > categoryAverage * 3.
**Validates: Requirements 2.2**

### Property 7: Frequency Change Detection
*For any* current and baseline frequency values, a frequency change anomaly SHALL be generated if and only if |current - baseline| / baseline > 0.4.
**Validates: Requirements 2.3**

### Property 8: Severity Assignment Consistency
*For any* deviation percentage, severity SHALL be assigned as: low (10-30%), medium (30-60%), high (>60%).
**Validates: Requirements 2.4**

### Property 9: Spending Increase Insight Generation
*For any* category with spending increase, an insight SHALL be generated if and only if increase > 20%.
**Validates: Requirements 3.1**

### Property 10: Alert Threshold Detection
*For any* spending amount and alert threshold, warning status SHALL be returned at 80% and exceeded status at 100%.
**Validates: Requirements 4.2, 4.3**

### Property 11: Alert Data Round-Trip
*For any* valid alert data, creating an alert and then retrieving it SHALL return equivalent values.
**Validates: Requirements 4.1, 4.4, 4.5**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| No transactions found | Return empty patterns with message |
| Insufficient data (<3 months) | Return partial analysis with warning |
| Invalid threshold value | Return validation error |
| Category not found | Return 404 error |
| Database error | Return 500 with retry suggestion |

## Testing Strategy

### Unit Testing
- Test PatternAnalysisService calculations
- Test AnomalyDetectionService threshold logic
- Test InsightGeneratorService message generation
- Test AlertService threshold checking

### Property-Based Testing
Library: **fast-check**

Setiap property test harus:
- Menjalankan minimum 100 iterasi
- Di-tag dengan format: `**Feature: spending-insights, Property {number}: {property_text}**`
- Menggunakan generator untuk amounts (positive decimals), dates, dan categories

### Integration Testing
- Test API endpoints dengan database
- Test insight generation pipeline
- Test alert notification flow
