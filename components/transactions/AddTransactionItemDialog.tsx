'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
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

interface AddTransactionItemDialogProps {
  transactionId: string
  onItemAdded: () => void
}

export default function AddTransactionItemDialog({
  transactionId,
  onItemAdded
}: AddTransactionItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unitPrice: 0,
    category: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || formData.unitPrice <= 0) {
      alert('Please fill in item name and unit price')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/transactions/${transactionId}/items`,
        {
          method: 'POST',
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
        setFormData({
          name: '',
          quantity: 1,
          unitPrice: 0,
          category: '',
          notes: ''
        })
        onItemAdded()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add item')
      }
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item')
    } finally {
      setIsLoading(false)
    }
  }

  const totalPrice = formData.quantity * formData.unitPrice

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
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
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
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
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
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
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Groceries, Dairy"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
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
              {isLoading ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
