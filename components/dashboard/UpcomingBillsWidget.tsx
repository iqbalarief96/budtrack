'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FiCalendar, FiAlertTriangle, FiCheckCircle, FiChevronRight } from 'react-icons/fi'
import { Bill, BILL_STATUS_CONFIG } from '@/app/types/bill'

export default function UpcomingBillsWidget() {
  const [bills, setBills] = useState<Bill[]>([])
  const [overdue, setOverdue] = useState<Bill[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [overdueAmount, setOverdueAmount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingBills()
  }, [])

  const fetchUpcomingBills = async () => {
    try {
      const response = await fetch('/api/bills/upcoming?days=7&includeOverdue=true')
      const data = await response.json()
      if (response.ok) {
        setBills(data.upcoming || [])
        setOverdue(data.overdue || [])
        setTotalAmount(data.totalAmount || 0)
        setOverdueAmount(data.overdueAmount || 0)
      }
    } catch (error) {
      console.error('Error fetching upcoming bills:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const allBills = [...overdue, ...bills]
  const hasNoBills = allBills.length === 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-blue-600" size={20} />
          <h3 className="font-semibold text-gray-900">Bills Due This Week</h3>
        </div>
        <Link
          href="/bills"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          View All <FiChevronRight size={14} />
        </Link>
      </div>

      {/* Summary */}
      {!hasNoBills && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b">
          <div>
            <div className="text-sm text-gray-600">Due This Week</div>
            <div className="text-lg font-bold text-gray-900">
              Rp {totalAmount.toLocaleString('id-ID')}
            </div>
          </div>
          {overdueAmount > 0 && (
            <div>
              <div className="text-sm text-red-600">Overdue</div>
              <div className="text-lg font-bold text-red-600">
                Rp {overdueAmount.toLocaleString('id-ID')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bills List */}
      <div className="p-4">
        {hasNoBills ? (
          <div className="text-center py-6">
            <FiCheckCircle className="mx-auto text-green-500 mb-2" size={32} />
            <p className="text-gray-600">No bills due this week! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allBills.slice(0, 5).map((bill) => {
              const status = bill.status || 'UPCOMING'
              const statusConfig = BILL_STATUS_CONFIG[status]
              const dueDate = new Date(bill.dueDate)
              const now = new Date()
              const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {status === 'OVERDUE' && (
                      <FiAlertTriangle className="text-red-500" size={18} />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{bill.name}</div>
                      <div className="text-sm text-gray-500">
                        {diffDays < 0
                          ? `${Math.abs(diffDays)} days overdue`
                          : diffDays === 0
                          ? 'Due today'
                          : diffDays === 1
                          ? 'Due tomorrow'
                          : `Due in ${diffDays} days`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      Rp {bill.amount.toLocaleString('id-ID')}
                    </div>
                    <span className={`text-xs ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              )
            })}

            {allBills.length > 5 && (
              <Link
                href="/bills"
                className="block text-center text-sm text-blue-600 hover:underline py-2"
              >
                +{allBills.length - 5} more bills
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
