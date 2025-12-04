'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  GoalsTimelineChart,
  SavingRateCard,
  GoalProjectionCard,
  GoalPriorityList,
  ScenarioPlanner,
  MilestoneTracker,
  RecommendationList,
} from '@/components/goals-timeline'
import {
  TimelineGoal,
  SavingRateAnalysis,
  SavingRateData,
  Scenario,
  Recommendation,
} from '@/app/types/goals-timeline'
import { FiCalendar, FiRefreshCw, FiTarget, FiTrendingUp, FiLayers, FiZap } from 'react-icons/fi'

/**
 * Financial Goals Timeline Page
 * Main page integrating all goals timeline components
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1
 */

export default function GoalsTimelinePage() {
  // State for timeline data
  const [goals, setGoals] = useState<TimelineGoal[]>([])
  const [savingRateAnalysis, setSavingRateAnalysis] = useState<SavingRateAnalysis | null>(null)
  const [savingRateHistory, setSavingRateHistory] = useState<SavingRateData[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  // Loading states
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true)
  const [isLoadingSavingRate, setIsLoadingSavingRate] = useState(true)
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true)
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch timeline data (goals, saving rate, recommendations)
  const fetchTimelineData = useCallback(async () => {
    setIsLoadingTimeline(true)
    try {
      const response = await fetch('/api/goals/timeline')
      if (!response.ok) throw new Error('Failed to fetch timeline')
      const data = await response.json()
      setGoals(data.goals || [])
      setSavingRateAnalysis(data.savingRate || null)
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setIsLoadingTimeline(false)
    }
  }, [])

  // Fetch saving rate history
  const fetchSavingRateHistory = useCallback(async () => {
    setIsLoadingSavingRate(true)
    try {
      const response = await fetch('/api/saving-rate?months=12')
      if (!response.ok) throw new Error('Failed to fetch saving rate')
      const data = await response.json()
      setSavingRateHistory(data.history || [])
      if (data.analysis) {
        setSavingRateAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Error fetching saving rate:', error)
    } finally {
      setIsLoadingSavingRate(false)
    }
  }, [])


  // Fetch scenarios
  const fetchScenarios = useCallback(async () => {
    setIsLoadingScenarios(true)
    try {
      const response = await fetch('/api/goals/scenarios')
      if (!response.ok) throw new Error('Failed to fetch scenarios')
      const data = await response.json()
      setScenarios(data.scenarios || [])
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setIsLoadingScenarios(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchTimelineData()
    fetchSavingRateHistory()
    fetchScenarios()
  }, [fetchTimelineData, fetchSavingRateHistory, fetchScenarios])

  // Recalculate projections
  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      const response = await fetch('/api/goals/projections/recalculate', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to recalculate')
      // Refresh all data after recalculation
      await Promise.all([
        fetchTimelineData(),
        fetchSavingRateHistory(),
        fetchScenarios(),
      ])
    } catch (error) {
      console.error('Error recalculating projections:', error)
    } finally {
      setIsRecalculating(false)
    }
  }

  // Handle priority change
  const handlePriorityChange = async (goalId: string, newPriority: number) => {
    try {
      const response = await fetch('/api/goals/priorities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorities: [{ goalId, priority: newPriority }],
        }),
      })
      if (!response.ok) throw new Error('Failed to update priority')
      // Refresh timeline data
      await fetchTimelineData()
    } catch (error) {
      console.error('Error updating priority:', error)
      throw error
    }
  }

  // Handle scenario creation
  const handleCreateScenario = async (name: string, monthlySavingsAdjustment: number) => {
    try {
      const response = await fetch('/api/goals/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, monthlySavingsAdjustment }),
      })
      if (!response.ok) throw new Error('Failed to create scenario')
      // Refresh scenarios
      await fetchScenarios()
    } catch (error) {
      console.error('Error creating scenario:', error)
      throw error
    }
  }

  // Handle scenario deletion
  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/goals/scenarios/${scenarioId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete scenario')
      // Refresh scenarios
      await fetchScenarios()
    } catch (error) {
      console.error('Error deleting scenario:', error)
      throw error
    }
  }

  // Navigate to goal details
  const handleViewGoalDetails = (goalId: string) => {
    window.location.href = `/goals/${goalId}`
  }

  const isLoading = isLoadingTimeline || isLoadingSavingRate

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FiCalendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Financial Goals Timeline</h1>
              <p className="text-indigo-100">
                Track when you'll achieve your financial goals
              </p>
            </div>
          </div>
          <Button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="bg-white text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculating...' : 'Recalculate'}
          </Button>
        </div>
      </div>


      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FiTarget className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="saving-rate" className="flex items-center gap-2">
            <FiTrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Saving Rate</span>
          </TabsTrigger>
          <TabsTrigger value="priorities" className="flex items-center gap-2">
            <FiTarget className="h-4 w-4" />
            <span className="hidden sm:inline">Priorities</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <FiLayers className="h-4 w-4" />
            <span className="hidden sm:inline">Scenarios</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <FiZap className="h-4 w-4" />
            <span className="hidden sm:inline">Tips</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Timeline Chart */}
          <GoalsTimelineChart goals={goals} isLoading={isLoadingTimeline} />

          {/* Goal Projections Grid */}
          {goals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Goal Projections</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {goals.map((goal) => (
                  <GoalProjectionCard
                    key={goal.goal.id}
                    goal={goal}
                    onViewDetails={handleViewGoalDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Milestone Tracker */}
          <MilestoneTracker goals={goals} isLoading={isLoadingTimeline} />
        </TabsContent>

        {/* Saving Rate Tab */}
        <TabsContent value="saving-rate" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SavingRateCard
              analysis={savingRateAnalysis}
              history={savingRateHistory}
              isLoading={isLoadingSavingRate}
            />
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <QuickStatCard
                  title="Active Goals"
                  value={goals.length.toString()}
                  icon={<FiTarget className="h-5 w-5 text-blue-500" />}
                  isLoading={isLoading}
                />
                <QuickStatCard
                  title="On Track"
                  value={goals.filter((g) => g.projection.isOnTrack).length.toString()}
                  icon={<FiTrendingUp className="h-5 w-5 text-green-500" />}
                  isLoading={isLoading}
                />
              </div>
              {/* Recommendations Preview */}
              {recommendations.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-900 mb-2">
                    💡 {recommendations.length} Recommendation{recommendations.length > 1 ? 's' : ''} Available
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    {recommendations[0].title}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('recommendations')}
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                  >
                    View All Tips
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Priorities Tab */}
        <TabsContent value="priorities" className="space-y-6">
          <GoalPriorityList
            goals={goals}
            onPriorityChange={handlePriorityChange}
            isLoading={isLoadingTimeline}
          />
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <ScenarioPlanner
            scenarios={scenarios}
            goals={goals}
            onCreateScenario={handleCreateScenario}
            onDeleteScenario={handleDeleteScenario}
            isLoading={isLoadingScenarios}
          />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationList
            recommendations={recommendations}
            isLoading={isLoadingTimeline}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Quick Stat Card Component
interface QuickStatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  isLoading?: boolean
}

function QuickStatCard({ title, value, icon, isLoading }: QuickStatCardProps) {
  if (isLoading) {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-12" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-gray-600">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
