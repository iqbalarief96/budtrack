'use client'

import { FiEdit2, FiTrash2, FiCheck, FiCalendar, FiRepeat } from 'react-icons/fi'
import { Bill, BILL_STATUS_CONFIG } from '@/app/types/bill'

interface BillCardProps {
  bill: Bill
  onEdit: () => void
  onDelete: () => void
  onMarkAsPaid: () => void
}

export default function BillCard({ bill, onEdit, onDelete, onMarkAsPaid }: BillCardProps) {
  const status = bill.status || 'UPCOMING'
  const statusConfig = BILL_STATUS_CONFIG[status]
  
  const dueDate = new Date(bill.dueDate)
  const now = new Date()
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const getDaysText = () => {
    if (status === 'PAID') return 'Paid'
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 truncate">{bill.name}</h3>
            {bill.category && (
              <span className="text-xs text-gray-500">{bill.category.name}</span>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Amount */}
        <div className="text-2xl font-bold text-gray-900 mb-3">
          Rp {bill.amount.toLocaleString('id-ID')}
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <FiCalendar size={14} />
          <span>{dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span className={`ml-auto ${status === 'OVERDUE' ? 'text-red-600 font-medium' : ''}`}>
            {getDaysText()}
          </span>
        </div>

        {/* Recurring Badge */}
        {bill.isRecurring && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-3">
            <FiRepeat size={12} />
            <span>{bill.frequency}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {status !== 'PAID' && (
            <button
              onClick={onMarkAsPaid}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
            >
              <FiCheck size={14} />
              Mark Paid
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Edit"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Delete"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
