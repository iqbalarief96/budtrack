'use client'

import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { TransactionItem } from './TransactionItemsList'

interface EditTransactionItemDialogProps {
  transactionId: string
  item: TransactionItem
  onItemUpdated: () => void
}

export default function EditTransactionItemDialog({
  transactionId,
  item,
  onItemUpdated
}: EditTransactionItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    category: item.category || '',
    notes: item.notes || ''
  })

  // Reset form when item changes or dialog opens
  useEffect(() => {
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      category: item.category || '',
      notes: item.notes || ''
    })
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || formData.unitPrice <= 0) {
      alert('Please fill in item name and unit price')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/transactions/${transactionId}/items/${item.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            quantity: formData.quantity,
            unitPrice: formData.unitPrice,
            category: formData.category || null,
            notes: formData.notes || null
          })
        }
      )

      if (response.ok) {
        setOpen(false)
        onItemUpdated()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update item')
      }
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Failed to update item')
    } finally {
      setIsLoading(false)
    }
  }

  const totalPrice = formData.quantity * formData.unitPrice

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="Edit item"
        >
          <Pencil className="h-4 w-4 text-blue-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Item Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Susu Ultra 1L"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-quantity">Quantity *</Label>
              <Input
                id="edit-quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseFloat(e.target.value) || 1
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-unitPrice">Unit Price *</Label>
              <Input
                id="edit-unitPrice"
                type="number"
                step="100"
                min="0"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: parseFloat(e.target.value) || 0
                  })
                }
                placeholder="0"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-category">Category (optional)</Label>
            <Input
              id="edit-category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Groceries, Dairy"
            />
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Total: <strong className="text-lg text-gray-900">{formatCurrency(totalPrice)}</strong>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
