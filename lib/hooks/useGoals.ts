import { useQuery } from '@tanstack/react-query'

export interface Goal {
  id: string
  name: string
  target: number
  current: number
  deadline?: string | null
  category?: string | null
  description?: string | null
  icon?: string | null
  color?: string | null
  status?: string
  isArchived?: boolean
  createdAt: string
  updatedAt: string
}

export function useGoals(walletId?: string) {
  return useQuery({
    queryKey: ['goals', walletId ?? 'all'],
    queryFn: async (): Promise<Goal[]> => {
      const params = new URLSearchParams()
      if (walletId) params.append('walletId', walletId)
      const response = await fetch(`/api/goals?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch goals')
      const json = await response.json()
      return Array.isArray(json) ? json : json.data || []
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
