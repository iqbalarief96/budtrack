'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scenario, ScenarioProjection, TimelineGoal } from '@/app/types/goals-timeline'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FiPlus, FiTrash2, FiLayers, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi'

/**
 * ScenarioPlanner - Create and compare scenarios
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

interface ScenarioPlannerProps {
  scenarios: Scenario[]
  goals: TimelineGoal[]
  onCreateScenario?: (name: string, monthlySavingsAdjustment: number) => Promise<void>
  onDeleteScenario?: (scenarioId: string) => Promise<void>
  isLoading?: boolean
}

export function ScenarioPlanner({
  scenarios,
  goals,
  onCreateScenario,
  onDeleteScenario,
  isLoading,
}: ScenarioPlannerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newScenarioName, setNewScenarioName] = useState('')
  const [savingsAdjustment, setSavingsAdjustment] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])

  const handleCreateScenario = async () => {
    if (!onCreateScenario || !newScenarioName.trim()) return

    setIsSubmitting(true)
    try {
      await onCreateScenario(newScenarioName.trim(), savingsAdjustment)
      setNewScenarioName('')
      setSavingsAdjustment(0)
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create scenario:', error)
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleDeleteScenario = async (scenarioId: string) => {
    if (!onDeleteScenario) return
    if (!confirm('Are you sure you want to delete this scenario?')) return

    try {
      await onDeleteScenario(scenarioId)
      setSelectedScenarios((prev) => prev.filter((id) => id !== scenarioId))
    } catch (error) {
      console.error('Failed to delete scenario:', error)
    }
  }

  const toggleScenarioSelection = (scenarioId: string) => {
    setSelectedScenarios((prev) => {
      if (prev.includes(scenarioId)) {
        return prev.filter((id) => id !== scenarioId)
      }
      // Max 3 scenarios for comparison
      if (prev.length >= 3) {
        return [...prev.slice(1), scenarioId]
      }
      return [...prev, scenarioId]
    })
  }

  const selectedScenarioData = scenarios.filter((s) => selectedScenarios.includes(s.id))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiLayers className="h-5 w-5" />
            Scenario Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="h-32 bg-gray-200 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FiLayers className="h-5 w-5" />
            Scenario Planner
          </CardTitle>
          {!isCreating && (
            <Button size="sm" onClick={() => setIsCreating(true)} className="flex items-center gap-2">
              <FiPlus className="h-4 w-4" />
              New Scenario
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Create scenarios to see how changes affect your goal timeline
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Scenario Form */}
        {isCreating && (
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-4">
            <h4 className="font-medium text-blue-900">Create New Scenario</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="scenarioName">Scenario Name</Label>
                <Input
                  id="scenarioName"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g., Increase savings by 20%"
                />
              </div>
              <div>
                <Label htmlFor="savingsAdjustment">Monthly Savings Adjustment</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="savingsAdjustment"
                    type="number"
                    value={savingsAdjustment}
                    onChange={(e) => setSavingsAdjustment(Number(e.target.value))}
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500">IDR/month</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Positive = increase savings, Negative = decrease savings
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateScenario}
                disabled={isSubmitting || !newScenarioName.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Scenario'}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Scenarios List */}
        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiLayers className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No scenarios created yet.</p>
            <p className="text-sm">Create a scenario to see how changes affect your goals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select up to 3 scenarios to compare (click to select)
            </p>
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                goals={goals}
                isSelected={selectedScenarios.includes(scenario.id)}
                onSelect={() => toggleScenarioSelection(scenario.id)}
                onDelete={() => handleDeleteScenario(scenario.id)}
              />
            ))}
          </div>
        )}

        {/* Scenario Comparison */}
        {selectedScenarioData.length > 1 && (
          <ScenarioComparison scenarios={selectedScenarioData} goals={goals} />
        )}
      </CardContent>
    </Card>
  )
}

interface ScenarioCardProps {
  scenario: Scenario
  goals: TimelineGoal[]
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function ScenarioCard({ scenario, goals, isSelected, onSelect, onDelete }: ScenarioCardProps) {
  const totalImpact = scenario.projections.reduce((sum, p) => {
    if (Number.isFinite(p.impactMonths)) return sum + p.impactMonths
    return sum
  }, 0)

  const getImpactIcon = () => {
    if (totalImpact > 0) return <FiTrendingUp className="h-4 w-4 text-green-500" />
    if (totalImpact < 0) return <FiTrendingDown className="h-4 w-4 text-red-500" />
    return <FiMinus className="h-4 w-4 text-gray-500" />
  }

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{scenario.name}</h4>
          {scenario.description && (
            <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className={scenario.monthlySavingsAdjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
              {scenario.monthlySavingsAdjustment >= 0 ? '+' : ''}
              {formatCurrency(scenario.monthlySavingsAdjustment)}/month
            </span>
            <span className="flex items-center gap-1">
              {getImpactIcon()}
              <span className={totalImpact > 0 ? 'text-green-600' : totalImpact < 0 ? 'text-red-600' : 'text-gray-600'}>
                {totalImpact > 0 ? `${totalImpact.toFixed(1)} months saved` : totalImpact < 0 ? `${Math.abs(totalImpact).toFixed(1)} months added` : 'No change'}
              </span>
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <FiTrash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Projections Preview */}
      {isSelected && scenario.projections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Impact on Goals:</p>
          <div className="space-y-2">
            {scenario.projections.slice(0, 3).map((proj) => {
              const goal = goals.find((g) => g.goal.id === proj.goalId)
              if (!goal) return null

              return (
                <div key={proj.goalId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{goal.goal.name}</span>
                  <span className={proj.impactMonths > 0 ? 'text-green-600' : proj.impactMonths < 0 ? 'text-red-600' : 'text-gray-500'}>
                    {proj.impactMonths > 0 ? `-${proj.impactMonths.toFixed(1)}` : proj.impactMonths < 0 ? `+${Math.abs(proj.impactMonths).toFixed(1)}` : '0'} months
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface ScenarioComparisonProps {
  scenarios: Scenario[]
  goals: TimelineGoal[]
}

function ScenarioComparison({ scenarios, goals }: ScenarioComparisonProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-4">Scenario Comparison</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4">Goal</th>
              {scenarios.map((s) => (
                <th key={s.id} className="text-center py-2 px-2">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.goal.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium">{goal.goal.name}</td>
                {scenarios.map((scenario) => {
                  const proj = scenario.projections.find((p) => p.goalId === goal.goal.id)
                  if (!proj) return <td key={scenario.id} className="text-center py-2 px-2">-</td>

                  return (
                    <td key={scenario.id} className="text-center py-2 px-2">
                      <div className="text-xs text-gray-500">
                        {formatDate(new Date(proj.newDate))}
                      </div>
                      <div className={`text-xs font-medium ${
                        proj.impactMonths > 0 ? 'text-green-600' : proj.impactMonths < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {proj.impactMonths > 0 ? `${proj.impactMonths.toFixed(1)} months earlier` : proj.impactMonths < 0 ? `${Math.abs(proj.impactMonths).toFixed(1)} months later` : 'No change'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ScenarioPlanner
