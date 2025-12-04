'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  NetWorthCard,
  NetWorthBreakdown,
  NetWorthChart,
  NetWorthGoalCard,
  NetWorthGoalForm,
} from '@/components/net-worth'
import type {
  NetWorthCalculation,
  NetWorthSnapshot,
  NetWorthGoal,
  NetWorthGoalResponse,
  PercentageChange,
  TimePeriod,
  CreateGoalInput,
  UpdateGoalInput,
} from '@/app/types/net-worth'
import { FiDollarSign, FiRefreshCw, FiPlus, FiCamera } from 'react-icons/fi'

/**
 * Net Worth Tracker Page
 * Main page integrating all net worth components
 * Requirements: 1.1, 2.1, 3.1, 4.1
 */

export default function NetWorthPage() {
  // State for net worth data
  const [calculation, setCalculation] = useState<NetWorthCalculation | null>(null)
  const [change, setChange] = useState<PercentageChange | null>(null)
  const [previousNetWorth, setPreviousNetWorth] = useState<number | null>(null)
  
  // State for history
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>('6M')
  
  // State for goals
  const [goalsData, setGoalsData] = useState<NetWorthGoalResponse[]>([])
  
  // Loading states
  const [isLoadingNetWorth, setIsLoadingNetWorth] = useState(true)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false)
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  
  // Modal states
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<NetWorthGoal | null>(null)

  // Fetch current net worth
  const fetchNetWorth = useCallback(async () => {
    setIsLoadingNetWorth(true)
    try {
      const response = await fetch('/api/net-worth')
      if (!response.ok) throw new Error('Failed to fetch net worth')
      const data = await response.json()
      setCalculation(data.calculation)
      setChange(data.change)
      setPreviousNetWorth(data.previousNetWorth)
    } catch (error) {
      console.error('Error fetching net worth:', error)
    } finally {
      setIsLoadingNetWorth(false)
    }
  }, [])


  // Fetch history with period filter
  const fetchHistory = useCallback(async (period: TimePeriod) => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/net-worth/history?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch history')
      const data = await response.json()
      setSnapshots(data.snapshots || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  // Fetch goals
  const fetchGoals = useCallback(async () => {
    setIsLoadingGoals(true)
    try {
      const response = await fetch('/api/net-worth/goals')
      if (!response.ok) throw new Error('Failed to fetch goals')
      const data = await response.json()
      setGoalsData(data.goals || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setIsLoadingGoals(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchNetWorth()
    fetchHistory(currentPeriod)
    fetchGoals()
  }, [fetchNetWorth, fetchHistory, fetchGoals, currentPeriod])

  // Handle period change
  const handlePeriodChange = (period: TimePeriod) => {
    setCurrentPeriod(period)
    fetchHistory(period)
  }

  // Create manual snapshot
  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true)
    try {
      const response = await fetch('/api/net-worth/snapshot', {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to create snapshot')
      // Refresh data after snapshot creation
      await Promise.all([fetchNetWorth(), fetchHistory(currentPeriod)])
    } catch (error) {
      console.error('Error creating snapshot:', error)
    } finally {
      setIsCreatingSnapshot(false)
    }
  }

  // Handle goal form submit
  const handleGoalSubmit = async (data: CreateGoalInput | UpdateGoalInput) => {
    setIsSavingGoal(true)
    try {
      if (editingGoal) {
        // Update existing goal
        const response = await fetch(`/api/net-worth/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to update goal')
      } else {
        // Create new goal
        const response = await fetch('/api/net-worth/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error('Failed to create goal')
      }
      // Refresh goals
      await fetchGoals()
      setIsGoalFormOpen(false)
      setEditingGoal(null)
    } catch (error) {
      console.error('Error saving goal:', error)
      throw error
    } finally {
      setIsSavingGoal(false)
    }
  }

  // Handle goal delete
  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus target ini?')) return
    
    try {
      const response = await fetch(`/api/net-worth/goals/${goalId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete goal')
      await fetchGoals()
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  // Open edit goal form
  const handleEditGoal = (goal: NetWorthGoal) => {
    setEditingGoal(goal)
    setIsGoalFormOpen(true)
  }

  // Open create goal form
  const handleCreateGoal = () => {
    setEditingGoal(null)
    setIsGoalFormOpen(true)
  }

  const isLoading = isLoadingNetWorth || isLoadingHistory || isLoadingGoals


  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FiDollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Net Worth Tracker</h1>
              <p className="text-emerald-100">
                Lacak kekayaan bersih Anda dari waktu ke waktu
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreateSnapshot}
              disabled={isCreatingSnapshot}
              variant="secondary"
              className="bg-white/20 text-white hover:bg-white/30 flex items-center gap-2"
            >
              <FiCamera className={`h-4 w-4 ${isCreatingSnapshot ? 'animate-pulse' : ''}`} />
              {isCreatingSnapshot ? 'Menyimpan...' : 'Snapshot'}
            </Button>
            <Button
              onClick={() => {
                fetchNetWorth()
                fetchHistory(currentPeriod)
                fetchGoals()
              }}
              disabled={isLoading}
              className="bg-white text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
            >
              <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Net Worth Card & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Net Worth Card */}
          <NetWorthCard
            calculation={calculation}
            change={change}
            previousNetWorth={previousNetWorth}
            isLoading={isLoadingNetWorth}
          />

          {/* History Chart */}
          <NetWorthChart
            snapshots={snapshots}
            currentPeriod={currentPeriod}
            onPeriodChange={handlePeriodChange}
            isLoading={isLoadingHistory}
          />

          {/* Breakdown */}
          <NetWorthBreakdown
            assetBreakdown={calculation?.assetBreakdown || []}
            liabilityBreakdown={calculation?.liabilityBreakdown || []}
            isLoading={isLoadingNetWorth}
          />
        </div>

        {/* Right Column - Goals */}
        <div className="space-y-6">
          {/* Goals Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Target Net Worth</CardTitle>
                  <CardDescription>Tetapkan dan lacak target kekayaan Anda</CardDescription>
                </div>
                <Button
                  onClick={handleCreateGoal}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <FiPlus className="h-4 w-4" />
                  Buat Target
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Goals List */}
          {isLoadingGoals ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ) : goalsData.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-muted-foreground mb-4">
                  Belum ada target net worth
                </div>
                <Button onClick={handleCreateGoal} variant="outline">
                  <FiPlus className="h-4 w-4 mr-2" />
                  Buat Target Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            goalsData.map(({ goal, progress, milestone }) => (
              <NetWorthGoalCard
                key={goal.id}
                goal={goal}
                progress={progress}
                milestone={milestone}
                onEdit={() => handleEditGoal(goal)}
                onDelete={() => handleDeleteGoal(goal.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Goal Form Modal */}
      <NetWorthGoalForm
        isOpen={isGoalFormOpen}
        onClose={() => {
          setIsGoalFormOpen(false)
          setEditingGoal(null)
        }}
        onSubmit={handleGoalSubmit}
        existingGoal={editingGoal}
        currentNetWorth={calculation?.netWorth || 0}
        isLoading={isSavingGoal}
      />
    </div>
  )
}
