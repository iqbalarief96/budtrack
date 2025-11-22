'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import EditTransactionItemDialog from './EditTransactionItemDialog'

export interface TransactionItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category?: string | null
  notes?: string | null
  order: number
}

interface TransactionItemsListProps {
  transactionId: string
  items: TransactionItem[]
  onItemsChange: () => void
}

export default function TransactionItemsList({
  transactionId,
  items,
  onItemsChange
}: TransactionItemsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/transactions/${transactionId}/items/${itemId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        onItemsChange()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="mt-2 border-t pt-2">
      <button
        onClick={toggleExpand}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-medium">{items.length} items</span>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 ml-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600">
                  {item.quantity}x @ {formatCurrency(item.unitPrice)}
                </div>
                {item.notes && (
                  <div className="text-xs text-gray-500 mt-1">
                    {item.notes}
                  </div>
                )}
                {item.category && (
                  <div className="text-xs text-blue-600 mt-1">
                    📁 {item.category}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 ml-4">
                <span className="font-semibold text-gray-900">
                  {formatCurrency(item.totalPrice)}
                </span>

                <div className="flex gap-1">
                  <EditTransactionItemDialog
                    transactionId={transactionId}
                    item={item}
                    onItemUpdated={onItemsChange}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isLoading}
                    title="Delete item"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center font-semibold text-gray-900">
              <span>Total:</span>
              <span className="text-lg">
                {formatCurrency(items.reduce((sum, item) => sum + item.totalPrice, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
