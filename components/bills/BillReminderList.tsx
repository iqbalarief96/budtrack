'use client'

import { useState, useEffect } from 'react'
import { FiBell, FiClock, FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import { BillReminder } from '@/app/types/bill'

interface BillReminderListProps {
  onDismiss?: (reminderId: string) => void
  onSnooze?: (reminderId: string, hours: number) => void
}

export default function BillReminderList({ onDismiss, onSnooze }: BillReminderListProps) {
  const [reminders, setReminders] = useState<BillReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/bills/reminders')
      const data = await response.json()
      if (response.ok) {
        setReminders(data.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/bills/reminders/${reminderId}/dismiss`, {
        method: 'POST',
      })
      if (response.ok) {
        setReminders(prev => prev.filter(r => r.id !== reminderId))
        onDismiss?.(reminderId)
      }
    } catch (error) {
      console.error('Error dismissing reminder:', error)
    }
  }

  const handleSnooze = async (reminderId: string, hours: number) => {
    try {
      const response = await fetch(`/api/bills/reminders/${reminderId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })
      if (response.ok) {
        // Update the reminder in the list
        const updatedReminder = await response.json()
        setReminders(prev => prev.map(r => 
          r.id === reminderId ? { ...r, status: 'SNOOZED', snoozedUntil: updatedReminder.snoozedUntil } : r
        ))
        setSnoozeMenuOpen(null)
        onSnooze?.(reminderId, hours)
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error)
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysUntilDue = (dueDate: string | Date) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <FiBell className="mx-auto text-gray-400 mb-2" size={32} />
        <p className="text-gray-600">No active reminders</p>
        <p className="text-sm text-gray-400 mt-1">
          Reminders will appear here when bills are due
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
        <FiBell className="text-blue-600" size={20} />
        <h3 className="font-semibold text-gray-900">Active Reminders</h3>
        <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
          {reminders.length}
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {reminders.map((reminder) => {
          const daysUntilDue = getDaysUntilDue(reminder.bill?.dueDate || new Date())
          const isUrgent = daysUntilDue <= 1
          const isSnoozed = reminder.status === 'SNOOZED'

          return (
            <div
              key={reminder.id}
              className={`p-4 ${isUrgent ? 'bg-red-50' : isSnoozed ? 'bg-yellow-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {isUrgent ? (
                    <FiAlertTriangle className="text-red-500 mt-1" size={18} />
                  ) : isSnoozed ? (
                    <FiClock className="text-yellow-500 mt-1" size={18} />
                  ) : (
                    <FiBell className="text-blue-500 mt-1" size={18} />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {reminder.bill?.name || 'Unknown Bill'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Due: {formatDate(reminder.bill?.dueDate || new Date())}
                      {daysUntilDue < 0 && (
                        <span className="text-red-600 ml-2">
                          ({Math.abs(daysUntilDue)} days overdue)
                        </span>
                      )}
                      {daysUntilDue === 0 && (
                        <span className="text-red-600 ml-2">(Due today!)</span>
                      )}
                      {daysUntilDue === 1 && (
                        <span className="text-orange-600 ml-2">(Due tomorrow)</span>
                      )}
                      {daysUntilDue > 1 && (
                        <span className="text-gray-500 ml-2">
                          ({daysUntilDue} days left)
                        </span>
                      )}
                    </div>
                    {reminder.bill?.amount && (
                      <div className="text-sm font-medium text-gray-700 mt-1">
                        Rp {reminder.bill.amount.toLocaleString('id-ID')}
                      </div>
                    )}
                    {isSnoozed && reminder.snoozedUntil && (
                      <div className="text-xs text-yellow-600 mt-1">
                        Snoozed until {formatTime(reminder.snoozedUntil)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Snooze Button */}
                  <div className="relative">
                    <button
                      onClick={() => setSnoozeMenuOpen(snoozeMenuOpen === reminder.id ? null : reminder.id)}
                      className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Snooze"
                    >
                      <FiClock size={18} />
                    </button>
                    
                    {snoozeMenuOpen === reminder.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button
                          onClick={() => handleSnooze(reminder.id, 1)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          1 hour
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder.id, 3)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          3 hours
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder.id, 6)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          6 hours
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder.id, 24)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          1 day
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dismiss Button */}
                  <button
                    onClick={() => handleDismiss(reminder.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
