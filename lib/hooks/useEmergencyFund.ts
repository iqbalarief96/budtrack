import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface EmergencyFundData {
  targetAmount: number
  currentAmount: number
  monthlyContribution: number
  isActive: boolean
  totalSavings: number
  savingsByType: Record<string, number>
}

export function useEmergencyFund(walletId?: string) {
  const queryKey = walletId ? ['emergency-fund', walletId] : ['emergency-fund']

  return useQuery({
    queryKey,
    queryFn: async (): Promise<EmergencyFundData> => {
      const url = walletId ? `/api/emergency-fund?walletId=${walletId}` : '/api/emergency-fund'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch emergency fund')
      return response.json()
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on component mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

export function useUpdateEmergencyFund() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<EmergencyFundData>) => {
      const response = await fetch('/api/emergency-fund', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update emergency fund')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-fund'] })
    },
  })
}
