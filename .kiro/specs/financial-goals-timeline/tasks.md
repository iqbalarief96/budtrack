# Implementation Plan - Financial Goals Timeline

- [x] 1. Setup database schema dan types





  - [x] 1.1 Add GoalProjection, GoalPriority, TimelineScenario, SavingRateHistory models to Prisma schema


    - Add models dengan fields sesuai design document
    - Run prisma migrate
    - _Requirements: 1.1, 3.1, 4.1_

  - [x] 1.2 Create TypeScript types for financial goals timeline feature

    - Create `app/types/goals-timeline.ts` dengan interfaces
    - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Implement SavingRateService





  - [x] 2.1 Create SavingRateService with core calculation logic


    - Create `lib/goals-timeline/saving-rate-service.ts`
    - Implement calculateMonthlySavingRate, getSavingRateHistory
    - _Requirements: 2.1_
  - [x] 2.2 Write property test for saving rate calculation


    - **Property 1: Saving Rate Calculation**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Implement period average calculation

    - Add analyzeSavingRate, calculateAverage methods
    - _Requirements: 2.2_

  - [x] 2.4 Write property test for period average

    - **Property 2: Period Average Calculation**
    - **Validates: Requirements 2.2**

  - [x] 2.5 Implement trend detection and consistency

    - Add calculateTrend, calculateConsistency methods
    - _Requirements: 2.3_

  - [x] 2.6 Write property test for trend detection

    - **Property 3: Trend Detection**
    - **Validates: Requirements 2.3**


- [x] 3. Implement ProjectionService





  - [x] 3.1 Create ProjectionService with projection logic


    - Create `lib/goals-timeline/projection-service.ts`
    - Implement calculateProjection, calculateProjectedDate
    - _Requirements: 1.2_

  - [x] 3.2 Write property test for projected date calculation

    - **Property 4: Projected Date Calculation**
    - **Validates: Requirements 1.2**
  - [x] 3.3 Implement progress calculation

    - Add calculateProgress method
    - _Requirements: 1.3_

  - [x] 3.4 Write property test for progress calculation
    - **Property 5: Progress Calculation**
    - **Validates: Requirements 1.3**
  - [x] 3.5 Implement behind schedule detection
    - Add isGoalOnTrack method
    - _Requirements: 1.4_
  - [x] 3.6 Write property test for behind schedule detection
    - **Property 6: Behind Schedule Detection**
    - **Validates: Requirements 1.4**
  - [x] 3.7 Implement confidence level and required rate
    - Add calculateConfidenceLevel, calculateRequiredSavingRate, calculateGap
    - _Requirements: 1.5, 2.4, 2.5_
  - [x] 3.8 Write property tests for confidence and required rate
    - **Property 7: Confidence Level Assignment**
    - **Property 8: Required Saving Rate Calculation**
    - **Validates: Requirements 1.5, 2.4, 2.5**

- [x] 4. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement TimelineService





  - [x] 5.1 Create TimelineService with timeline management


    - Create `lib/goals-timeline/timeline-service.ts`
    - Implement getTimeline, setGoalPriority, getGoalsByPriority
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Write property test for priority ordering

    - **Property 9: Priority Ordering**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 5.3 Implement milestone detection and recording

    - Add detectMilestone, recordMilestoneAchievement methods
    - _Requirements: 5.1_

  - [x] 5.4 Write property test for milestone detection

    - **Property 10: Milestone Detection**
    - **Validates: Requirements 5.1**
  - [x] 5.5 Implement behind schedule alert and adjustments


    - Add checkBehindSchedule, suggestAdjustments methods
    - _Requirements: 5.3, 5.5_

  - [x] 5.6 Write property test for behind schedule alert

    - **Property 11: Behind Schedule Alert**
    - **Validates: Requirements 5.3**



- [x] 6. Implement ScenarioService




  - [x] 6.1 Create ScenarioService with scenario management


    - Create `lib/goals-timeline/scenario-service.ts`
    - Implement createScenario, calculateScenarioImpact, compareScenarios
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.2 Write property test for scenario impact calculation

    - **Property 12: Scenario Impact Calculation**
    - **Validates: Requirements 4.3, 4.5**


- [x] 7. Implement RecommendationService





  - [x] 7.1 Create RecommendationService

    - Create `lib/goals-timeline/recommendation-service.ts`
    - Implement generateRecommendations, calculateAccelerationSavings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 Write property test for acceleration savings

    - **Property 13: Acceleration Savings Calculation**
    - **Validates: Requirements 6.1**

- [x] 8. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.


- [x] 9. Create API endpoints





  - [x] 9.1 Create GET /api/goals/timeline endpoint

    - Create `app/api/goals/timeline/route.ts`
    - Return goals timeline with projections
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 9.2 Create GET /api/goals/projections endpoint

    - Create `app/api/goals/projections/route.ts`
    - Return goal projections
    - _Requirements: 1.2, 1.5_

  - [x] 9.3 Create POST /api/goals/projections/recalculate endpoint

    - Create `app/api/goals/projections/recalculate/route.ts`
    - Trigger projection recalculation
    - _Requirements: 3.3_

  - [x] 9.4 Create CRUD endpoints for priorities

    - Create `app/api/goals/priorities/route.ts` (GET, PUT)
    - _Requirements: 3.1, 3.2_
  - [x] 9.5 Create GET /api/saving-rate endpoint


    - Create `app/api/saving-rate/route.ts`
    - Return saving rate analysis
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 9.6 Create CRUD endpoints for scenarios

    - Create `app/api/goals/scenarios/route.ts` (GET, POST)
    - Create `app/api/goals/scenarios/[scenarioId]/route.ts` (DELETE)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 9.7 Create GET /api/goals/recommendations endpoint

    - Create `app/api/goals/recommendations/route.ts`
    - Return recommendations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_



- [x] 10. Create UI components




  - [x] 10.1 Create GoalsTimelineChart component


    - Create `components/goals-timeline/GoalsTimelineChart.tsx`
    - Display timeline with projected dates
    - _Requirements: 1.1, 1.4_

  - [x] 10.2 Create SavingRateCard component

    - Create `components/goals-timeline/SavingRateCard.tsx`
    - Display saving rate with trend
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 10.3 Create GoalProjectionCard component

    - Create `components/goals-timeline/GoalProjectionCard.tsx`
    - Display goal with projection and confidence
    - _Requirements: 1.2, 1.3, 1.5_
  - [x] 10.4 Create GoalPriorityList component


    - Create `components/goals-timeline/GoalPriorityList.tsx`
    - Drag-and-drop priority ordering
    - _Requirements: 3.1, 3.2, 3.4_
  - [x] 10.5 Create ScenarioPlanner component


    - Create `components/goals-timeline/ScenarioPlanner.tsx`
    - Create and compare scenarios
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 10.6 Create MilestoneTracker component

    - Create `components/goals-timeline/MilestoneTracker.tsx`
    - Display milestones with achievements
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 10.7 Create RecommendationList component

    - Create `components/goals-timeline/RecommendationList.tsx`
    - Display recommendations with impact
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 11. Create Financial Goals Timeline page





  - [x] 11.1 Create main goals timeline page

    - Create `app/goals-timeline/page.tsx`
    - Integrate all components
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_


- [x] 12. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
