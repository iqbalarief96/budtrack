import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FiEye, FiEdit, FiTrash2, FiTarget } from 'react-icons/fi'
import { useToast } from '@/components/ui/use-toast'
import dynamic from 'next/dynamic'

// Lazy load modals
const TransactionModal = dynamic(() => import('@/app/components/TransactionModal'), { ssr: false })
const DeleteConfirmModal = dynamic(() => import('@/app/components/DeleteConfirmModal'), { ssr: false })
const LinkGoalModal = dynamic(() => import('@/app/components/LinkGoalModal'), { ssr: false })

export default function TransactionTable({ transactions, onRefresh }) {
  const { toast } = useToast()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isLinkGoalModalOpen, setIsLinkGoalModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  const handleEditClick = (transaction) => {
    setSelectedTransaction(transaction)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (transaction) => {
    setSelectedTransaction(transaction)
    setIsDeleteModalOpen(true)
  }
  
  const handleLinkGoalClick = (transaction) => {
    setSelectedTransaction(transaction)
    setIsLinkGoalModalOpen(true)
  }

  const handleSaveTransaction = async () => {
    onRefresh()
    setIsEditModalOpen(false)
    toast({
      title: 'Transaction Updated',
      description: 'Your transaction has been successfully updated.',
    })
  }

  const handleDeleteTransaction = async () => {
    try {
      const response = await fetch(`/api/transactions?id=${selectedTransaction.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete transaction')
      }

      onRefresh()
      setIsDeleteModalOpen(false)
      toast({
        title: 'Transaction Deleted',
        description: 'Your transaction has been successfully deleted.',
      })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete transaction. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wallet
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b hover:bg-gray-50">
                <td className="py-4 px-4 text-sm text-gray-900">
                  {formatDate(transaction.date)}
                </td>
                <td className="py-4 px-4 text-sm text-gray-900">
                  {transaction.description || '-'}
                </td>
                <td className="py-4 px-4 text-sm text-gray-900">
                  {transaction.category?.name || 'Uncategorized'}
                </td>
                <td className={`py-4 px-4 text-sm font-medium ${
                  transaction.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {transaction.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(transaction.amount)}
                </td>
                <td className="py-4 px-4 text-sm text-gray-900">
                  {transaction.wallet?.name || '-'}
                </td>
                <td className="py-4 px-4 text-sm font-medium flex gap-2">
                  <button
                    onClick={() => handleEditClick(transaction)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Edit"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(transaction)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                  <button
                    onClick={() => handleLinkGoalClick(transaction)}
                    className="text-purple-600 hover:text-purple-900"
                    title="Link to Goal"
                  >
                    <FiTarget />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedTransaction && (
        <>
          <TransactionModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveTransaction}
            initialData={selectedTransaction}
          />
          
          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteTransaction}
            title="Delete Transaction"
            message="Are you sure you want to delete this transaction? This action cannot be undone."
          />
          
          <LinkGoalModal
            isOpen={isLinkGoalModalOpen}
            onClose={() => setIsLinkGoalModalOpen(false)}
            transaction={selectedTransaction}
          />
        </>
      )}
    </div>
  )
} 