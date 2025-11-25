import { useQuery } from '@tanstack/react-query'

export interface SavingsData {
  totalSavings: number
  savingsByCategory: Record<string, number>
  transactions: number
}

export function useSavings(walletId: string, timeRange: string = 'all_time') {
  return useQuery({
    queryKey: ['savings', walletId, timeRange],
    queryFn: async (): Promise<SavingsData> => {
      const response = await fetch(`/api/savings?walletId=${walletId}&timeRange=${timeRange}`)
      if (!response.ok) throw new Error('Failed to fetch savings')
      return response.json()
    },
    enabled: !!walletId, // Only run if walletId exists
  })
}
