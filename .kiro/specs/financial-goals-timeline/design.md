# Financial Goals Timeline - Design Document

## Overview

Financial Goals Timeline adalah sistem untuk memvisualisasikan dan memproyeksikan kapan pengguna dapat mencapai goals finansial mereka. Sistem ini menganalisis saving rate, menghitung proyeksi, dan menyediakan scenario planning untuk membantu pengguna membuat keputusan finansial yang lebih baik.

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        TLP[Timeline Page]
        SCP[Scenario Planner]
        REC[Recommendations]
    end
    
    subgraph "API Layer"
        TLAPI[/api/goals/timeline]
        PRAPI[/api/goals/projections]
        SCAPI[/api/goals/scenarios]
        SRAPI[/api/saving-rate]
    end
    
    subgraph "Service Layer"
        TLS[TimelineService]
        PRS[ProjectionService]
        SRS[SavingRateService]
        RCS[RecommendationService]
    end
    
    subgraph "Data Layer"
        Goal[(Goal)]
        Proj[(GoalProjection)]
        Scen[(TimelineScenario)]
        SRH[(SavingRateHistory)]
    end
    
    TLP --> TLAPI
    TLP --> PRAPI
    SCP --> SCAPI
    
    TLAPI --> TLS
    PRAPI --> PRS
    SCAPI --> TLS
    SRAPI --> SRS
    
    TLS --> Goal
    PRS --> Proj
    SRS --> SRH
```


## Components and Interfaces

### 1. SavingRateService

Komponen untuk menghitung dan melacak saving rate pengguna.

```typescript
interface SavingRateData {
  month: Date
  income: number
  expenses: number
  savings: number
  savingRate: number // percentage
}

interface SavingRateAnalysis {
  current: number
  average3Month: number
  average6Month: number
  average12Month: number
  trend: 'improving' | 'declining' | 'stable'
  trendPercentage: number
  consistency: number // 0-1 score
}

interface SavingRateService {
  calculateMonthlySavingRate(userId: string, month: Date): Promise<SavingRateData>
  getSavingRateHistory(userId: string, months: number): Promise<SavingRateData[]>
  analyzeSavingRate(history: SavingRateData[]): SavingRateAnalysis
  calculateAverage(rates: number[]): number
  calculateTrend(rates: number[]): TrendResult
  calculateConsistency(rates: number[]): number
}
```

### 2. ProjectionService

Komponen untuk menghitung proyeksi pencapaian goals.

```typescript
interface GoalProjection {
  goalId: string
  projectedDate: Date
  confidenceLevel: 'low' | 'medium' | 'high'
  requiredSavingRate: number
  currentProgress: number
  monthsRemaining: number
  isOnTrack: boolean
}

interface ProjectionService {
  calculateProjection(goal: Goal, savingRate: SavingRateAnalysis): GoalProjection
  calculateProjectedDate(currentAmount: number, targetAmount: number, monthlySavings: number): Date
  calculateRequiredSavingRate(goal: Goal, monthsRemaining: number): number
  calculateConfidenceLevel(consistency: number): 'low' | 'medium' | 'high'
  isGoalOnTrack(projectedDate: Date, targetDate: Date): boolean
  calculateGap(currentRate: number, requiredRate: number): number
}
```


### 3. TimelineService

Komponen untuk mengelola timeline dan prioritas goals.

```typescript
interface TimelineGoal {
  goal: Goal
  projection: GoalProjection
  priority: number
  milestones: Milestone[]
}

interface Milestone {
  percentage: number // 25, 50, 75, 100
  targetDate: Date
  achievedDate?: Date
  isAchieved: boolean
}

interface TimelineService {
  getTimeline(userId: string): Promise<TimelineGoal[]>
  setGoalPriority(goalId: string, priority: number): Promise<void>
  getGoalsByPriority(userId: string): Promise<TimelineGoal[]>
  recalculateProjections(userId: string): Promise<void>
  detectMilestone(progress: number): number | null
  recordMilestoneAchievement(goalId: string, milestone: number): Promise<void>
  checkBehindSchedule(actual: number, projected: number): boolean
  suggestAdjustments(goal: TimelineGoal): Adjustment[]
}

interface Adjustment {
  type: 'increase_savings' | 'extend_deadline' | 'reduce_target'
  description: string
  impact: string
  newProjectedDate?: Date
}
```

### 4. ScenarioService

Komponen untuk scenario planning.

```typescript
interface Scenario {
  id: string
  name: string
  monthlySavingsAdjustment: number
  goalAdjustments: GoalAdjustment[]
  projections: ScenarioProjection[]
}

interface GoalAdjustment {
  goalId: string
  newTargetAmount?: number
  newTargetDate?: Date
}

interface ScenarioProjection {
  goalId: string
  originalDate: Date
  newDate: Date
  impactMonths: number
}

interface ScenarioService {
  createScenario(userId: string, params: ScenarioParams): Promise<Scenario>
  calculateScenarioImpact(scenario: Scenario): ScenarioProjection[]
  compareScenarios(scenarios: Scenario[]): ScenarioComparison
  getScenarios(userId: string): Promise<Scenario[]>
  deleteScenario(scenarioId: string): Promise<void>
}
```


### 5. RecommendationService

Komponen untuk menghasilkan rekomendasi optimasi.

```typescript
interface Recommendation {
  type: 'increase_savings' | 'reorder_goals' | 'adjust_target' | 'reduce_spending'
  title: string
  description: string
  impact: RecommendationImpact
  category?: string
}

interface RecommendationImpact {
  affectedGoals: string[]
  timelineSavings: number // months saved
  additionalSavingsNeeded?: number
}

interface RecommendationService {
  generateRecommendations(userId: string): Promise<Recommendation[]>
  calculateAccelerationSavings(goal: Goal, monthsToSave: number): number
  suggestOptimalOrdering(goals: Goal[]): Goal[]
  identifyReducibleCategories(userId: string): CategoryReduction[]
  calculateRecommendationImpact(rec: Recommendation, goals: Goal[]): RecommendationImpact
}

interface CategoryReduction {
  categoryId: string
  categoryName: string
  currentSpending: number
  suggestedReduction: number
  potentialSavings: number
}
```

## Data Models

### Database Schema (Prisma)

```prisma
model GoalProjection {
  id                 String   @id @default(cuid())
  goalId             String
  userId             String
  projectedDate      DateTime
  confidenceLevel    String
  requiredSavingRate Decimal  @db.Decimal(5, 2)
  currentProgress    Decimal  @db.Decimal(5, 2)
  assumptions        Json
  createdAt          DateTime @default(now())
  
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("goal_projections")
}

model GoalPriority {
  id        String   @id @default(cuid())
  userId    String
  goalId    String
  priority  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  @@unique([userId, goalId])
  @@map("goal_priorities")
}


model TimelineScenario {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  assumptions Json
  projections Json
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("timeline_scenarios")
}

model SavingRateHistory {
  id         String   @id @default(cuid())
  userId     String
  month      DateTime
  income     Decimal  @db.Decimal(15, 2)
  expenses   Decimal  @db.Decimal(15, 2)
  savings    Decimal  @db.Decimal(15, 2)
  savingRate Decimal  @db.Decimal(5, 2)
  createdAt  DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, month])
  @@map("saving_rate_history")
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Saving Rate Calculation
*For any* income and expense values, saving rate SHALL equal ((income - expenses) / income) * 100, with appropriate handling for zero income.
**Validates: Requirements 2.1**

### Property 2: Period Average Calculation
*For any* set of monthly saving rates, the N-month average SHALL equal the sum of rates divided by N.
**Validates: Requirements 2.2**

### Property 3: Trend Detection
*For any* sequence of saving rates, trend SHALL be 'improving' if last > first by >10%, 'declining' if last < first by >10%, otherwise 'stable'.
**Validates: Requirements 2.3**

### Property 4: Projected Date Calculation
*For any* goal with current amount, target amount, and monthly savings, projected date SHALL be calculated as current date plus (targetAmount - currentAmount) / monthlySavings months.
**Validates: Requirements 1.2**


### Property 5: Progress Calculation
*For any* goal with current amount and target amount, progress percentage SHALL equal (currentAmount / targetAmount) * 100.
**Validates: Requirements 1.3**

### Property 6: Behind Schedule Detection
*For any* projected date and target date, a goal SHALL be marked behind schedule if and only if projectedDate > targetDate.
**Validates: Requirements 1.4**

### Property 7: Confidence Level Assignment
*For any* saving rate consistency score, confidence SHALL be 'high' if consistency > 0.8, 'medium' if > 0.5, otherwise 'low'.
**Validates: Requirements 1.5**

### Property 8: Required Saving Rate Calculation
*For any* goal with remaining amount and months remaining, required saving rate SHALL equal remainingAmount / monthsRemaining.
**Validates: Requirements 2.4, 2.5**

### Property 9: Priority Ordering
*For any* set of goals with priorities, goals SHALL be returned in ascending priority order (1 = highest).
**Validates: Requirements 3.1, 3.2**

### Property 10: Milestone Detection
*For any* progress percentage, milestone detection SHALL correctly identify when progress crosses 25%, 50%, 75%, or 100% thresholds.
**Validates: Requirements 5.1**

### Property 11: Behind Schedule Alert
*For any* actual and projected progress values, an alert SHALL be generated if and only if (projected - actual) / projected > 0.1.
**Validates: Requirements 5.3**

### Property 12: Scenario Impact Calculation
*For any* scenario with adjusted monthly savings, new projected dates SHALL be recalculated using the adjusted values.
**Validates: Requirements 4.3, 4.5**

### Property 13: Acceleration Savings Calculation
*For any* goal and desired months to save, additional monthly savings SHALL equal (remainingAmount / newMonths) - currentMonthlySavings.
**Validates: Requirements 6.1**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| No income data | Return error suggesting to add income transactions |
| Zero monthly savings | Return projection with "never" date and warning |
| Goal already achieved | Return 100% progress with celebration |
| Invalid priority value | Return validation error |
| Scenario limit exceeded | Return error (max 10 scenarios) |


## Testing Strategy

### Unit Testing
- Test SavingRateService calculations
- Test ProjectionService date calculations
- Test TimelineService priority ordering
- Test ScenarioService impact calculations
- Test RecommendationService suggestions

### Property-Based Testing
Library: **fast-check**

Setiap property test harus:
- Menjalankan minimum 100 iterasi
- Di-tag dengan format: `**Feature: financial-goals-timeline, Property {number}: {property_text}**`
- Menggunakan generator untuk amounts (positive decimals), dates, dan percentages

### Integration Testing
- Test API endpoints dengan database
- Test projection recalculation on data change
- Test scenario comparison
- Test milestone achievement recording
