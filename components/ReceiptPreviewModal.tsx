'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash2, Plus, Calendar, Store, Wallet } from 'lucide-react'
import { ReceiptData } from '@/lib/receipt-scanner'

interface ReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ReceiptData, walletId: string, categoryId?: string) => void
  data: ReceiptData | null
  wallets: any[]
  categories: any[]
}

export function ReceiptPreviewModal({
  isOpen,
  onClose,
  onSave,
  data,
  wallets,
  categories,
}: ReceiptPreviewModalProps) {
  const [transaction, setTransaction] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  useEffect(() => {
    if (data) {
      setTransaction(data.transaction)
      setItems(data.items)

      // Set default wallet
      if (wallets.length > 0) {
        const defaultWallet = wallets.find(w => w.isDefault) || wallets[0]
        setSelectedWalletId(defaultWallet.id)
      }

      // Set default category (find "Belanja")
      if (categories.length > 0) {
        const belanjaCategory = categories.find(
          c => c.name === 'Belanja' && c.type === 'EXPENSE'
        )
        setSelectedCategoryId(belanjaCategory?.id || categories[0].id)
      }
    }
  }, [data, wallets, categories])

  const handleTransactionChange = (field: string, value: any) => {
    setTransaction({ ...transaction, [field]: value })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalculate total_price if quantity or unit_price changed
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? value : newItems[index].quantity
      const price = field === 'unit_price' ? value : newItems[index].unit_price
      newItems[index].total_price = qty * price
    }

    setItems(newItems)
    updateTotalAmount(newItems)
  }

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    updateTotalAmount(newItems)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        notes: '',
      },
    ])
  }

  const updateTotalAmount = (updatedItems: any[]) => {
    const total = updatedItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
    setTransaction({ ...transaction, total_amount: total })
  }

  const handleSave = () => {
    const finalData: ReceiptData = {
      transaction,
      items,
    }
    onSave(finalData, selectedWalletId, selectedCategoryId)
    onClose()
  }

  if (!data || !transaction) return null

  const totalItems = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const difference = Math.abs(totalItems - (transaction.total_amount || 0))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Preview Hasil Scan Struk
          </DialogTitle>
          <DialogDescription>
            Review and edit transaction details before saving
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Transaction Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-blue-900 mb-3">Informasi Transaksi</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="store_name" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Nama Toko
                </Label>
                <Input
                  id="store_name"
                  value={transaction.store_name || ''}
                  onChange={e => handleTransactionChange('store_name', e.target.value)}
                  placeholder="Nama toko"
                />
              </div>

              <div>
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Tanggal
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={transaction.date || ''}
                  onChange={e => handleTransactionChange('date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="wallet" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Dompet
                </Label>
                <select
                  id="wallet"
                  className="w-full p-2 border rounded-md"
                  value={selectedWalletId}
                  onChange={e => setSelectedWalletId(e.target.value)}
                >
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-md"
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                >
                  {categories
                    .filter(c => c.type === 'EXPENSE')
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={transaction.description || ''}
                onChange={e => handleTransactionChange('description', e.target.value)}
                placeholder="Deskripsi transaksi"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Item Belanja ({items.length})</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <Label className="text-xs">Nama Item</Label>
                    <Input
                      value={item.name || ''}
                      onChange={e => handleItemChange(index, 'name', e.target.value)}
                      placeholder="Nama item"
                      className="font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity || 0}
                      onChange={e =>
                        handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-xs">Harga Satuan</Label>
                    <Input
                      type="number"
                      step="100"
                      min="0"
                      value={item.unit_price || 0}
                      onChange={e =>
                        handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-xs">Total</Label>
                    <div className="font-bold text-blue-600 pt-2">
                      {formatCurrency(item.total_price || 0)}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {item.notes && (
                  <div className="mt-2">
                    <Label className="text-xs">Catatan</Label>
                    <Textarea
                      value={item.notes || ''}
                      onChange={e => handleItemChange(index, 'notes', e.target.value)}
                      placeholder="Catatan tambahan"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-green-900">Total Items:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalItems)}
              </span>
            </div>

            {difference > 1 && (
              <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                ⚠️ Selisih: {formatCurrency(difference)} - Akan disesuaikan otomatis
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={items.length === 0 || !selectedWalletId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Simpan Transaksi ({items.length} items)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
