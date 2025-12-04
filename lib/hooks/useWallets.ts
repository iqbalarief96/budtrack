import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Wallet {
  id: string
  name: string
  balance: number
  currencyCode: string
  icon?: string
  color?: string
  isDefault: boolean
  type: string
  createdAt: string
  updatedAt: string
}

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async (): Promise<Wallet[]> => {
      const response = await fetch('/api/wallets')
      if (!response.ok) throw new Error('Failed to fetch wallets')
      const json = await response.json()
      // Handle both old format (array) and new paginated format
      return Array.isArray(json) ? json : json.data || []
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on component mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

export function useCreateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (walletData: Partial<Wallet>) => {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletData),
      })
      if (!response.ok) throw new Error('Failed to create wallet')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Wallet> & { id: string }) => {
      const response = await fetch(`/api/wallets?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update wallet')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}

export function useDeleteWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wallets?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete wallet')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
    },
  })
}
