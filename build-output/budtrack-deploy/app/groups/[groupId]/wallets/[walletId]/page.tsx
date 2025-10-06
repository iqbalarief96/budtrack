'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, CreditCard, MoreHorizontal, Edit, Trash2, Users, Info, Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'

// Function untuk format currency
const formatCurrency = (amount: number, currencyCode = 'IDR') => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(amount);
};

interface Transaction {
  id: string
  amount: number
  type: string
  date: string
  description: string
  category?: {
    id: string
    name: string
    color?: string
    icon?: string
  }
  splits?: Array<{
    id: string
    userId: string
    amount: number
    isPaid: boolean
    user: {
      id: string
      name: string
      image?: string
    }
  }>
}

interface Category {
  id: string
  name: string
  type: string
  icon?: string
  color?: string
}

interface GroupMember {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

interface Wallet {
  id: string
  name: string
  balance: number
  currencyCode: string
  transactions?: Transaction[]
}

export default function GroupWalletPage({ params }: { params: { groupId: string; walletId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(false)
  const [showEditTransactionDialog, setShowEditTransactionDialog] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null)
  const [transactionFormData, setTransactionFormData] = useState({
    amount: '',
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [enableSplit, setEnableSplit] = useState(false)
  const [splits, setSplits] = useState<Array<{userId: string, amount: string, isPaid: boolean}>>([])
  
  // Get active tab from URL or use default
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam && ['transactions', 'members', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', value);
      window.history.pushState({}, '', url);
    }
  };

  useEffect(() => {
    if (session) {
      fetchWalletData()
      fetchTransactions()
      fetchCategories()
      fetchGroupMembers()
    }
  }, [session, params.groupId, params.walletId])

  // When split is enabled, initialize the splits array with all group members
  useEffect(() => {
    if (enableSplit && groupMembers.length > 0 && session?.user?.id) {
      // Calculate equal split amount
      let amount = parseFloat(transactionFormData.amount) || 0
      const splitAmount = amount / groupMembers.length
      const formattedAmount = splitAmount.toFixed(0)
      
      // Create splits for all members
      const newSplits = groupMembers.map(member => ({
        userId: member.id,
        amount: formattedAmount,
        isPaid: member.id === session.user.id // Current user is paid by default
      }))
      
      setSplits(newSplits)
    } else {
      setSplits([])
    }
  }, [enableSplit, groupMembers, transactionFormData.amount, session?.user?.id])
  
  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/groups/${params.groupId}/wallets/${params.walletId}`)
      
      if (response.ok) {
        const data = await response.json()
        setWallet(data)
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to load wallet data',
          variant: 'destructive',
        })
        router.push(`/groups/${params.groupId}`)
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while loading wallet data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/groups/${params.groupId}/wallets/${params.walletId}/transactions`)
      
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      })
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/groups/${params.groupId}/categories`)
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      })
    }
  }

  const fetchGroupMembers = async () => {
    try {
      const response = await fetch(`/api/groups/${params.groupId}/members`)
      
      if (response.ok) {
        const data = await response.json()
        setGroupMembers(data)
      }
    } catch (error) {
      console.error('Error fetching group members:', error)
      toast({
        title: 'Error',
        description: 'Failed to load group members',
        variant: 'destructive',
      })
    }
  }
  
  const updateSplitAmount = (userId: string, amount: string) => {
    // Convert to number for calculation
    const newAmount = parseFloat(amount) || 0;
    const totalAmount = parseFloat(transactionFormData.amount) || 0;
    
    // Calculate how much is left for other members
    const otherMembers = splits.filter(split => split.userId !== userId);
    const remainingAmount = Math.max(0, totalAmount - newAmount);
    
    if (otherMembers.length === 1) {
      // If only one other member, they get all the remaining amount
      const newSplits = splits.map(split => 
        split.userId === userId 
          ? { ...split, amount } 
          : { ...split, amount: remainingAmount.toString() }
      );
      setSplits(newSplits);
    } else if (otherMembers.length > 1) {
      // If multiple other members, distribute equally
      const otherMembersAmount = remainingAmount / otherMembers.length;
      const formattedOtherAmount = otherMembersAmount.toFixed(0);
      
      const newSplits = splits.map(split => 
        split.userId === userId 
          ? { ...split, amount } 
          : { ...split, amount: formattedOtherAmount }
      );
      setSplits(newSplits);
    } else {
      // Only one member total, just update their amount
      const newSplits = splits.map(split => 
        split.userId === userId ? { ...split, amount } : split
      );
      setSplits(newSplits);
    }
  }
  
  const updateSplitPaid = (userId: string, isPaid: boolean) => {
    const newSplits = splits.map(split => 
      split.userId === userId ? { ...split, isPaid } : split
    )
    setSplits(newSplits)
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Prepare data for API
      const payload = {
        ...transactionFormData,
        splits: enableSplit ? splits.map(split => ({
          ...split,
          amount: parseFloat(split.amount)
        })) : undefined
      }
      
      const response = await fetch(`/api/groups/${params.groupId}/wallets/${params.walletId}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        const newTransaction = await response.json()
        
        // Add the new transaction to our state
        setTransactions(prev => [newTransaction, ...prev])
        
        // Update the wallet balance in our state
        if (wallet) {
          const amount = parseFloat(transactionFormData.amount)
          const newBalance = transactionFormData.type === 'INCOME' 
            ? wallet.balance + amount 
            : wallet.balance - amount
          
          setWallet({
            ...wallet,
            balance: newBalance
          })
        }
        
        // Reset form
        setTransactionFormData({
          amount: '',
          type: 'EXPENSE',
          description: '',
          date: new Date().toISOString().split('T')[0],
          categoryId: ''
        })
        setEnableSplit(false)
        setSplits([])
        
        setShowAddTransactionDialog(false)
        toast({
          title: 'Success',
          description: 'Transaction added successfully',
        })
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to add transaction',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while adding the transaction',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleUpdateSplitStatus = async (transaction: Transaction, splitId: string, isPaid: boolean) => {
    try {
      const response = await fetch(
        `/api/groups/${params.groupId}/wallets/${params.walletId}/transactions/${transaction.id}/splits`, 
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            splitId,
            isPaid
          }),
        }
      )
      
      if (response.ok) {
        // Update transactions state locally
        setTransactions(prevTransactions => {
          return prevTransactions.map(tx => {
            if (tx.id === transaction.id && tx.splits) {
              // Update the specific split
              const updatedSplits = tx.splits.map(split => 
                split.id === splitId 
                  ? { ...split, isPaid } 
                  : split
              )
              return { ...tx, splits: updatedSplits }
            }
            return tx
          })
        })
        
        toast({
          title: 'Success',
          description: isPaid ? 'Marked as paid' : 'Marked as unpaid',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update payment status',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating split status:', error)
      toast({
        title: 'Error', 
        description: 'An error occurred while updating payment status',
        variant: 'destructive',
      })
    }
  }
  
  // Handle edit transaction
  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction)
    setTransactionFormData({
      amount: transaction.amount.toString(),
      type: transaction.type as 'EXPENSE' | 'INCOME',
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
      categoryId: transaction.category?.id || ''
    })
    setShowEditTransactionDialog(true)
  }
  
  // Handle update transaction
  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentTransaction) return
    
    try {
      setIsSubmitting(true)
      
      const payload = {
        amount: transactionFormData.amount,
        type: transactionFormData.type,
        description: transactionFormData.description,
        date: transactionFormData.date,
        categoryId: transactionFormData.categoryId || null
      }
      
      const response = await fetch(
        `/api/groups/${params.groupId}/wallets/${params.walletId}/transactions/${currentTransaction.id}`, 
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )
      
      if (response.ok) {
        const updatedTransaction = await response.json()
        
        // Update the transactions array
        setTransactions(prevTransactions => {
          return prevTransactions.map(tx => 
            tx.id === currentTransaction.id ? updatedTransaction : tx
          )
        })
        
        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        })
        
        // Close dialog and refresh wallet data
        setShowEditTransactionDialog(false)
        fetchWalletData()
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to update transaction',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while updating the transaction',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const response = await fetch(
          `/api/groups/${params.groupId}/wallets/${params.walletId}/transactions/${transactionId}`,
          {
            method: 'DELETE',
          }
        )
        
        if (response.ok) {
          // Update transactions list by removing the deleted one
          setTransactions(prevTransactions => 
            prevTransactions.filter(tx => tx.id !== transactionId)
          )
          
          toast({
            title: 'Success',
            description: 'Transaction deleted successfully',
          })
          
          // Refresh wallet data to get updated balance
          fetchWalletData()
        } else {
          const error = await response.json()
          toast({
            title: 'Error',
            description: error.error || 'Failed to delete transaction',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error deleting transaction:', error)
        toast({
          title: 'Error',
          description: 'An error occurred while deleting the transaction',
          variant: 'destructive',
        })
      }
    }
  }
  
  if (!session) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please sign in to access this page
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Loading wallet data...
        </div>
      </div>
    )
  }
  
  if (!wallet) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          Wallet not found or you don't have access
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-6">
      <div className="flex items-center mb-6 space-x-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/groups/${params.groupId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Group
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{wallet.name}</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(wallet.balance, wallet.currencyCode)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="transactions" className="w-full" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="transactions" id="transactions-tab">Transactions</TabsTrigger>
          <TabsTrigger value="members" id="members-tab">Members</TabsTrigger>
          <TabsTrigger value="settings" id="settings-tab">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
            <Button onClick={() => setShowAddTransactionDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
          
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map(transaction => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                          {transaction.category && (
                            <span 
                              className="inline-block px-2 py-0.5 text-xs rounded-full"
                              style={{
                                backgroundColor: transaction.category.color || '#e2e8f0',
                                color: getContrastColor(transaction.category.color || '#e2e8f0')
                              }}
                            >
                              {transaction.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className={`font-semibold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(transaction.amount, wallet.currencyCode)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="cursor-pointer text-red-600 flex items-center"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Show split details if available */}
                    {transaction.splits && transaction.splits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Split Between:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {transaction.splits.map(split => (
                            <div key={split.id} className="flex justify-between text-sm">
                              <span>{split.user.name}</span>
                              <button 
                                className={`${split.isPaid ? 'text-green-600' : 'text-orange-600'} hover:underline`}
                                onClick={() => handleUpdateSplitStatus(transaction, split.id, !split.isPaid)}
                              >
                                {formatCurrency(split.amount, wallet.currencyCode)}
                                {split.isPaid ? ' (Paid)' : ' (Unpaid)'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
              <p className="text-gray-500 mb-4">Start adding transactions to this wallet</p>
              <Button onClick={() => setShowAddTransactionDialog(true)}>
                Add Your First Transaction
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Wallet Members</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupMembers.length > 0 ? (
                groupMembers.map(member => (
                  <Card key={member.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {member.image ? (
                            <img 
                              src={member.image} 
                              alt={member.name || 'User'} 
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base">{member.name || 'Unnamed User'}</CardTitle>
                            <CardDescription className="text-xs">{member.email}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={member.role === 'OWNER' ? "default" : (member.role === 'ADMIN' ? "secondary" : "outline")}>
                          {member.role}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 bg-muted rounded-lg col-span-2">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Members Yet</h3>
                  <p className="text-muted-foreground mb-4">This wallet has no members</p>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="font-medium text-blue-700 mb-1">Member Management</h3>
                  <p className="text-sm text-blue-600">
                    To manage group members, please go to the group page. There you can add, remove, 
                    or change roles of members.
                  </p>
                  <div className="flex space-x-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white" 
                      asChild
                    >
                      <Link href={`/groups/${params.groupId}`}>
                        <Users className="h-4 w-4 mr-2" />
                        Go to Group Page
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => handleTabChange('settings')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Settings Tab
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Settings</CardTitle>
                <CardDescription>Manage wallet preferences and information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Wallet Info</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Name:</div>
                      <div>{wallet.name}</div>
                      
                      <div className="font-medium">Currency:</div>
                      <div>{wallet.currencyCode}</div>
                      
                      <div className="font-medium">Current Balance:</div>
                      <div className="font-semibold">{formatCurrency(wallet.balance, wallet.currencyCode)}</div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Wallet Access</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      All group members have access to this wallet. You can manage group members from the group page.
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                      >
                        <Link href={`/groups/${params.groupId}`}>
                          <Users className="h-4 w-4 mr-2" />
                          Manage Group Members
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTabChange('members')}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Go to Members Tab
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Advanced Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Additional wallet settings will be available in future updates.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      id="settings-go-to-members"
                      onClick={() => handleTabChange('members')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Go to Members Tab
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Transaction Dialog */}
      <Dialog open={showAddTransactionDialog} onOpenChange={setShowAddTransactionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a new transaction to {wallet.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTransaction}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <RadioGroup 
                  value={transactionFormData.type} 
                  onValueChange={(value: 'INCOME' | 'EXPENSE') => 
                    setTransactionFormData({...transactionFormData, type: value})
                  }
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXPENSE" id="expense" />
                    <Label htmlFor="expense" className="cursor-pointer">Expense</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INCOME" id="income" />
                    <Label htmlFor="income" className="cursor-pointer">Income</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">Rp</span>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="1000"
                    className="pl-9"
                    placeholder="0"
                    value={transactionFormData.amount}
                    onChange={e => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this transaction for?"
                  value={transactionFormData.description}
                  onChange={e => setTransactionFormData({...transactionFormData, description: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={transactionFormData.categoryId}
                  onChange={e => setTransactionFormData({...transactionFormData, categoryId: e.target.value})}
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter(category => category.type === transactionFormData.type)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={transactionFormData.date}
                  onChange={e => setTransactionFormData({...transactionFormData, date: e.target.value})}
                  required
                />
              </div>
              
              {transactionFormData.type === 'EXPENSE' && groupMembers.length > 1 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableSplit">Split expense</Label>
                    <input
                      type="checkbox"
                      id="enableSplit"
                      checked={enableSplit}
                      onChange={e => setEnableSplit(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  
                  {enableSplit && (
                    <div className="pt-2 space-y-3 bg-gray-50 p-3 rounded-md">
                      <div className="text-sm font-medium">Split between {groupMembers.length} members:</div>
                      
                      <div className="space-y-2">
                        {splits.map((split, index) => {
                          const member = groupMembers.find(m => m.id === split.userId)
                          return (
                            <div key={split.userId} className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                  {member?.name?.[0] || '?'}
                                </div>
                                <span className="text-sm">{member?.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">Rp</span>
                                  <Input 
                                    className="pl-7 py-1 h-8 text-sm"
                                    value={split.amount}
                                    onChange={e => updateSplitAmount(split.userId, e.target.value)}
                                    type="number"
                                    min="0"
                                  />
                                </div>
                                <label className="inline-flex items-center">
                                  <input 
                                    type="checkbox"
                                    checked={split.isPaid}
                                    onChange={e => updateSplitPaid(split.userId, e.target.checked)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  <span className="ml-1 text-xs">Paid</span>
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowAddTransactionDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Transaction Dialog */}
      <Dialog open={showEditTransactionDialog} onOpenChange={setShowEditTransactionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Edit transaction details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTransaction}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <RadioGroup 
                  value={transactionFormData.type} 
                  onValueChange={(value: 'INCOME' | 'EXPENSE') => 
                    setTransactionFormData({...transactionFormData, type: value})
                  }
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EXPENSE" id="edit-expense" />
                    <Label htmlFor="edit-expense" className="cursor-pointer">Expense</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INCOME" id="edit-income" />
                    <Label htmlFor="edit-income" className="cursor-pointer">Income</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">Rp</span>
                  <Input
                    id="edit-amount"
                    type="number"
                    min="0"
                    step="1000"
                    className="pl-9"
                    placeholder="0"
                    value={transactionFormData.amount}
                    onChange={e => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="What is this transaction for?"
                  value={transactionFormData.description}
                  onChange={e => setTransactionFormData({...transactionFormData, description: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={transactionFormData.categoryId}
                  onChange={e => setTransactionFormData({...transactionFormData, categoryId: e.target.value})}
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter(category => category.type === transactionFormData.type)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={transactionFormData.date}
                  onChange={e => setTransactionFormData({...transactionFormData, date: e.target.value})}
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditTransactionDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper for text color contrast
function getContrastColor(hexColor: string): string {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Parse hex
  const r = parseInt(hexColor.substr(0, 2), 16) || 0;
  const g = parseInt(hexColor.substr(2, 2), 16) || 0;
  const b = parseInt(hexColor.substr(4, 2), 16) || 0;
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
} 