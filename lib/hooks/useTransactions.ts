import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Transaction {
  id: string
  amount: number
  description?: string
  date: string
  type: string
  walletId: string
  categoryId?: string
  goalId?: string
  createdAt: string
  updatedAt: string
  category?: {
    id: string
    name: string
    type: string
  }
  wallet?: {
    id: string
    name: string
  }
}

export function useTransactions(filters?: {
  walletId?: string
  type?: string
  startDate?: string
  endDate?: string
  limit?: number // Optional limit, defaults to -1 (all)
  page?: number
}) {
  const queryKey = ['transactions', filters]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Transaction[]> => {
      const params = new URLSearchParams()
      if (filters?.walletId) params.append('walletId', filters.walletId)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)

      // Add pagination params - default to limit=-1 (fetch all) for dashboard/summary
      const limit = filters?.limit !== undefined ? filters.limit : -1
      params.append('limit', limit.toString())
      if (filters?.page) params.append('page', filters.page.toString())

      const response = await fetch(`/api/transactions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const json = await response.json()
      // Handle both old format (array) and new paginated format
      return Array.isArray(json) ? json : json.data || []
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on component mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionData: Partial<Transaction>) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      })
      if (!response.ok) throw new Error('Failed to create transaction')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update transaction')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete transaction')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}
