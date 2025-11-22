'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import TransactionItemsList, { TransactionItem } from '@/components/transactions/TransactionItemsList'
import AddTransactionItemDialog from '@/components/transactions/AddTransactionItemDialog'
import { formatCurrency } from '@/lib/utils'

export default function TestTransactionItemsPage() {
  const [transaction, setTransaction] = useState<any>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Use the transaction ID from your test (update this!)
  const TRANSACTION_ID = 'cmi8fzkro00004ro8pt2ih7ae'

  const fetchTransactionData = async () => {
    setIsLoading(true)
    try {
      // Fetch transaction details
      const txResponse = await fetch(`/api/transactions/${TRANSACTION_ID}`)
      if (txResponse.ok) {
        const txData = await txResponse.json()
        setTransaction(txData.transaction)
      }

      // Fetch transaction items
      const itemsResponse = await fetch(`/api/transactions/${TRANSACTION_ID}/items`)
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        setItems(itemsData.items || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactionData()
  }, [])

  const handleItemsChange = () => {
    // Refresh data when items change
    fetchTransactionData()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Transaction Items - UI Test</h1>
        <p className="text-gray-600">
          Testing TransactionItemsList, AddTransactionItemDialog, and EditTransactionItemDialog components
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Transaction ID: {TRANSACTION_ID}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Description:</span>
              <span className="font-medium">{transaction?.description || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount:</span>
              <span className="font-bold text-lg">{formatCurrency(transaction?.amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {transaction?.date ? new Date(transaction.date).toLocaleDateString('id-ID') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Type:</span>
              <span className={`font-medium ${transaction?.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                {transaction?.type || 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transaction Items</CardTitle>
              <CardDescription>
                {items.length > 0 ? `${items.length} items` : 'No items yet'}
              </CardDescription>
            </div>
            <AddTransactionItemDialog
              transactionId={TRANSACTION_ID}
              onItemAdded={handleItemsChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items added yet.</p>
              <p className="text-sm mt-2">Click "Add Item" to add your first item!</p>
            </div>
          ) : (
            <TransactionItemsList
              transactionId={TRANSACTION_ID}
              items={items}
              onItemsChange={handleItemsChange}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">✅ Test Checklist:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Click "Add Item" to add a new item</li>
          <li>✓ Fill in name, quantity, and unit price</li>
          <li>✓ Check if total price auto-calculates</li>
          <li>✓ Click pencil icon to edit an item</li>
          <li>✓ Update quantity/price and verify total updates</li>
          <li>✓ Click trash icon to delete an item</li>
          <li>✓ Verify transaction amount updates automatically</li>
          <li>✓ Expand/collapse items list</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">📝 Note:</h3>
        <p className="text-sm text-yellow-800">
          The transaction amount should automatically update when you add, edit, or delete items.
          Check the "Transaction Details" card above to see the amount change!
        </p>
      </div>
    </div>
  )
}
