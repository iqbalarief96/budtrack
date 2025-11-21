# BudTrack Mobile App - React Native Implementation Guide

Complete guide to building a mobile application for BudTrack using React Native that connects to the existing Next.js backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Project Structure](#project-structure)
5. [Core Features Implementation](#core-features-implementation)
6. [State Management](#state-management)
7. [Navigation](#navigation)
8. [API Integration](#api-integration)
9. [Offline Support](#offline-support)
10. [Push Notifications](#push-notifications)
11. [Testing](#testing)
12. [Deployment](#deployment)

---

## Overview

### Goals
- Native iOS and Android apps from a single codebase
- Full feature parity with web version
- Offline-first architecture
- Push notifications for budget alerts
- Biometric authentication
- Camera integration for receipt scanning (future)

### Tech Stack
- **React Native 0.73** - Mobile framework
- **Expo 50** - Development platform (recommended) or bare React Native
- **TypeScript** - Type safety
- **React Navigation 6** - Navigation
- **React Query (TanStack Query)** - Server state management
- **Zustand** - Local state management
- **React Native Reanimated** - Animations
- **React Native Paper** - UI components
- **Axios** - HTTP client
- **AsyncStorage** - Local storage
- **React Native Voice** - Voice input
- **React Native Biometrics** - Fingerprint/Face ID
- **React Native Push Notifications** - FCM/APNs

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Mobile App (React Native)          │
├─────────────────────────────────────────────────────┤
│  Presentation Layer                                 │
│  ├── Screens (Transactions, Budgets, etc.)         │
│  ├── Components (Buttons, Cards, Forms)            │
│  └── Navigation (Stack, Tab, Drawer)               │
├─────────────────────────────────────────────────────┤
│  State Management                                   │
│  ├── React Query (Server state)                    │
│  ├── Zustand (Local state)                         │
│  └── Context API (Theme, Auth)                     │
├─────────────────────────────────────────────────────┤
│  Business Logic Layer                              │
│  ├── Hooks (useTransactions, useBudgets)           │
│  ├── Services (TransactionService, etc.)           │
│  └── Utils (Calculations, Formatters)              │
├─────────────────────────────────────────────────────┤
│  Data Layer                                         │
│  ├── API Client (Axios)                            │
│  ├── Local Storage (AsyncStorage)                  │
│  └── Offline Queue (WatermelonDB optional)         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Next.js Backend API (Existing)            │
│  - Authentication (NextAuth)                        │
│  - REST API Endpoints                               │
│  - Database (Prisma + SQLite/PostgreSQL)           │
└─────────────────────────────────────────────────────┘
```

---

## Setup & Installation

### Option 1: Expo (Recommended for Beginners)

**Advantages:**
- Easier setup and development
- Built-in libraries
- Over-the-air updates
- Expo Go app for testing

```bash
# Install Expo CLI
npm install -g expo-cli

# Create new Expo project with TypeScript
npx create-expo-app budtrack-mobile --template expo-template-blank-typescript

cd budtrack-mobile

# Install dependencies
npx expo install react-native-paper react-native-safe-area-context
npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs @react-navigation/drawer
npx expo install @tanstack/react-query
npx expo install axios
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
npx expo install react-native-reanimated
npx expo install react-native-gesture-handler
npx expo install expo-local-authentication
npx expo install expo-notifications
npx expo install expo-voice
npx expo install expo-camera
npx expo install react-native-chart-kit
npx expo install react-native-svg
npx expo install zustand
npx expo install date-fns
npx expo install react-hook-form
npx expo install zod

# Development
npx expo start
```

### Option 2: Bare React Native

**Advantages:**
- More control and flexibility
- Better for custom native modules
- Smaller app size

```bash
# Create React Native project with TypeScript
npx react-native init BudtrackMobile --template react-native-template-typescript

cd BudtrackMobile

# Install dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs @react-navigation/drawer
npm install react-native-screens react-native-safe-area-context
npm install @tanstack/react-query
npm install axios
npm install @react-native-async-storage/async-storage
npm install react-native-keychain
npm install react-native-reanimated
npm install react-native-gesture-handler
npm install react-native-paper
npm install react-native-vector-icons
npm install @react-native-voice/voice
npm install react-native-biometrics
npm install @notifee/react-native
npm install react-native-chart-kit
npm install react-native-svg
npm install zustand
npm install date-fns
npm install react-hook-form
npm install zod

# iOS setup
cd ios && pod install && cd ..

# Run
npx react-native run-ios
npx react-native run-android
```

---

## Project Structure

```
budtrack-mobile/
├── App.tsx                         # Root component
├── app.json                        # App configuration
├── babel.config.js
├── tsconfig.json
├── package.json
├── src/
│   ├── api/                        # API integration
│   │   ├── client.ts               # Axios instance
│   │   ├── endpoints/
│   │   │   ├── auth.ts
│   │   │   ├── transactions.ts
│   │   │   ├── budgets.ts
│   │   │   ├── wallets.ts
│   │   │   ├── categories.ts
│   │   │   ├── goals.ts
│   │   │   └── wedding.ts
│   │   └── types.ts                # API types
│   ├── components/                 # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionCard.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   └── VoiceInput.tsx
│   │   ├── budgets/
│   │   │   ├── BudgetCard.tsx
│   │   │   ├── BudgetProgress.tsx
│   │   │   └── BudgetAlert.tsx
│   │   ├── wallets/
│   │   │   ├── WalletCard.tsx
│   │   │   └── WalletSelector.tsx
│   │   ├── charts/
│   │   │   ├── LineChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   └── BarChart.tsx
│   │   └── wedding/
│   │       ├── GuestList.tsx
│   │       ├── VendorCard.tsx
│   │       └── Timeline.tsx
│   ├── navigation/                 # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   ├── TabNavigator.tsx
│   │   └── types.ts
│   ├── screens/                    # App screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── BiometricSetupScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── transactions/
│   │   │   ├── TransactionsScreen.tsx
│   │   │   ├── TransactionDetailScreen.tsx
│   │   │   └── AddTransactionScreen.tsx
│   │   ├── budgets/
│   │   │   ├── BudgetsScreen.tsx
│   │   │   ├── BudgetDetailScreen.tsx
│   │   │   └── CreateBudgetScreen.tsx
│   │   ├── wallets/
│   │   │   ├── WalletsScreen.tsx
│   │   │   └── WalletDetailScreen.tsx
│   │   ├── categories/
│   │   │   └── CategoriesScreen.tsx
│   │   ├── goals/
│   │   │   ├── GoalsScreen.tsx
│   │   │   └── GoalDetailScreen.tsx
│   │   ├── insights/
│   │   │   └── InsightsScreen.tsx
│   │   ├── reports/
│   │   │   └── ReportsScreen.tsx
│   │   ├── groups/
│   │   │   ├── GroupsScreen.tsx
│   │   │   └── GroupDetailScreen.tsx
│   │   ├── wedding/
│   │   │   ├── WeddingDashboard.tsx
│   │   │   ├── GuestsScreen.tsx
│   │   │   ├── VendorsScreen.tsx
│   │   │   └── TimelineScreen.tsx
│   │   ├── settings/
│   │   │   └── SettingsScreen.tsx
│   │   └── profile/
│   │       └── ProfileScreen.tsx
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts
│   │   ├── useBudgets.ts
│   │   ├── useWallets.ts
│   │   ├── useCategories.ts
│   │   ├── useGoals.ts
│   │   ├── useVoiceInput.ts
│   │   ├── useBiometrics.ts
│   │   └── useNotifications.ts
│   ├── services/                   # Business logic
│   │   ├── AuthService.ts
│   │   ├── StorageService.ts
│   │   ├── NotificationService.ts
│   │   ├── BiometricService.ts
│   │   ├── VoiceService.ts
│   │   └── OfflineService.ts
│   ├── store/                      # State management
│   │   ├── authStore.ts            # Zustand stores
│   │   ├── settingsStore.ts
│   │   └── offlineStore.ts
│   ├── utils/                      # Utilities
│   │   ├── calculations/
│   │   │   ├── budget.ts
│   │   │   └── analytics.ts
│   │   ├── formatters/
│   │   │   ├── currency.ts
│   │   │   ├── date.ts
│   │   │   └── number.ts
│   │   ├── validators/
│   │   │   └── schemas.ts
│   │   └── constants.ts
│   ├── theme/                      # Theming
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── theme.ts
│   └── types/                      # TypeScript types
│       ├── models.ts
│       ├── api.ts
│       └── navigation.ts
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
└── __tests__/
    ├── components/
    ├── screens/
    └── utils/
```

---

## Core Features Implementation

### 1. Authentication

**src/api/endpoints/auth.ts**
```typescript
import { apiClient } from '../client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    name: string
    email: string
    currency: string
  }
  token: string
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/signin', credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/signup', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/signout')
  },

  validateToken: async (token: string): Promise<boolean> => {
    try {
      const response = await apiClient.get('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data.valid
    } catch {
      return false
    }
  }
}
```

**src/hooks/useAuth.ts**
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, LoginCredentials, RegisterData } from '@/api/endpoints/auth'
import { useAuthStore } from '@/store/authStore'
import { StorageService } from '@/services/StorageService'
import { BiometricService } from '@/services/BiometricService'

export function useAuth() {
  const queryClient = useQueryClient()
  const { setUser, setToken, clearAuth, user, token } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      setUser(data.user)
      setToken(data.token)
      await StorageService.setToken(data.token)
      await StorageService.setUser(data.user)
    }
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data) => {
      setUser(data.user)
      setToken(data.token)
      await StorageService.setToken(data.token)
      await StorageService.setUser(data.user)
    }
  })

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      await StorageService.clearAll()
      queryClient.clear()
    }
  }

  const loginWithBiometric = async () => {
    const credentials = await BiometricService.getStoredCredentials()
    if (credentials) {
      return loginMutation.mutateAsync(credentials)
    }
    throw new Error('No stored credentials')
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    loginWithBiometric,
    isLoading: loginMutation.isPending || registerMutation.isPending
  }
}
```

**src/store/authStore.ts**
```typescript
import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  currency: string
}

interface AuthState {
  user: User | null
  token: string | null
  setUser: (user: User) => void
  setToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  clearAuth: () => set({ user: null, token: null })
}))
```

**src/services/BiometricService.ts**
```typescript
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

export class BiometricService {
  static async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return compatible && enrolled
  }

  static async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access BudTrack',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false
    })
    return result.success
  }

  static async storeCredentials(email: string, password: string) {
    await SecureStore.setItemAsync('credentials', JSON.stringify({ email, password }))
  }

  static async getStoredCredentials(): Promise<{ email: string; password: string } | null> {
    const credentials = await SecureStore.getItemAsync('credentials')
    return credentials ? JSON.parse(credentials) : null
  }

  static async clearCredentials() {
    await SecureStore.deleteItemAsync('credentials')
  }
}
```

### 2. Transactions

**src/hooks/useTransactions.ts**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '@/api/endpoints/transactions'
import type { Transaction, TransactionFilters, CreateTransactionInput } from '@/types'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.getAll(filters),
    staleTime: 30000
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    }
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      transactionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction', id] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    }
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    }
  })
}
```

**src/components/transactions/TransactionCard.tsx**
```typescript
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Card, IconButton } from 'react-native-paper'
import { format } from 'date-fns'
import { formatCurrency } from '@/utils/formatters/currency'
import type { Transaction } from '@/types'

interface TransactionCardProps {
  transaction: Transaction
  onPress: () => void
  onDelete: () => void
}

export function TransactionCard({ transaction, onPress, onDelete }: TransactionCardProps) {
  const isIncome = transaction.type === 'INCOME'

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.left}>
          <View style={[styles.icon, { backgroundColor: transaction.category.color }]}>
            <Text style={styles.iconText}>{transaction.category.icon}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.description}>{transaction.description}</Text>
            <Text style={styles.category}>{transaction.category.name}</Text>
            <Text style={styles.date}>{format(new Date(transaction.date), 'MMM dd, yyyy')}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, transaction.wallet.currency)}
          </Text>
          <Text style={styles.wallet}>{transaction.wallet.name}</Text>
        </View>

        <IconButton
          icon="delete"
          size={20}
          onPress={onDelete}
          style={styles.deleteButton}
        />
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  iconText: {
    fontSize: 24
  },
  info: {
    flex: 1
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  date: {
    fontSize: 12,
    color: '#999'
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 12
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2
  },
  income: {
    color: '#10B981'
  },
  expense: {
    color: '#EF4444'
  },
  wallet: {
    fontSize: 12,
    color: '#666'
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0
  }
})
```

**src/screens/transactions/TransactionsScreen.tsx**
```typescript
import React, { useState } from 'react'
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { FAB, Searchbar, Chip } from 'react-native-paper'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions'
import { TransactionCard } from '@/components/transactions/TransactionCard'
import { Loading } from '@/components/common/Loading'
import { EmptyState } from '@/components/common/EmptyState'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

type Props = NativeStackScreenProps<any, 'Transactions'>

export function TransactionsScreen({ navigation }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')

  const filters = {
    search: search || undefined,
    type: filter !== 'ALL' ? filter : undefined
  }

  const { data, isLoading, refetch, isRefetching } = useTransactions(filters)
  const deleteMutation = useDeleteTransaction()

  const handleDelete = async (id: string) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        }
      ]
    )
  }

  if (isLoading) return <Loading />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search transactions..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
        />

        <View style={styles.filters}>
          <Chip
            selected={filter === 'ALL'}
            onPress={() => setFilter('ALL')}
            style={styles.chip}
          >
            All
          </Chip>
          <Chip
            selected={filter === 'INCOME'}
            onPress={() => setFilter('INCOME')}
            style={styles.chip}
          >
            Income
          </Chip>
          <Chip
            selected={filter === 'EXPENSE'}
            onPress={() => setFilter('EXPENSE')}
            style={styles.chip}
          >
            Expense
          </Chip>
        </View>
      </View>

      <FlatList
        data={data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title="No transactions yet"
            description="Start tracking your finances by adding a transaction"
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={styles.list}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 0,
    backgroundColor: '#f5f5f5'
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8
  },
  chip: {
    marginRight: 8
  },
  list: {
    paddingVertical: 8
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16
  }
})
```

### 3. Voice Input

**src/services/VoiceService.ts**
```typescript
import Voice from '@react-native-voice/voice'

export class VoiceService {
  private static isListening = false
  private static onResult: ((text: string) => void) | null = null
  private static onError: ((error: string) => void) | null = null

  static async init() {
    Voice.onSpeechStart = () => {
      this.isListening = true
    }

    Voice.onSpeechEnd = () => {
      this.isListening = false
    }

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0] && this.onResult) {
        this.onResult(e.value[0])
      }
    }

    Voice.onSpeechError = (e) => {
      if (this.onError) {
        this.onError(e.error?.message || 'Voice recognition error')
      }
    }
  }

  static async start(
    onResult: (text: string) => void,
    onError: (error: string) => void
  ) {
    this.onResult = onResult
    this.onError = onError

    try {
      await Voice.start('en-US')
    } catch (error) {
      onError('Failed to start voice recognition')
    }
  }

  static async stop() {
    try {
      await Voice.stop()
    } catch (error) {
      console.error('Failed to stop voice recognition:', error)
    }
  }

  static async destroy() {
    try {
      await Voice.destroy()
      this.onResult = null
      this.onError = null
    } catch (error) {
      console.error('Failed to destroy voice recognition:', error)
    }
  }

  static parseTransactionFromSpeech(text: string): {
    amount?: number
    type?: 'INCOME' | 'EXPENSE'
    description?: string
    category?: string
  } {
    // Parse natural language like "spent 50 dollars on groceries"
    const result: any = {}

    // Extract amount
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/g)
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[0])
    }

    // Determine type
    if (text.toLowerCase().includes('spent') || text.toLowerCase().includes('paid')) {
      result.type = 'EXPENSE'
    } else if (text.toLowerCase().includes('earned') || text.toLowerCase().includes('received')) {
      result.type = 'INCOME'
    }

    // Extract category keywords
    const categoryKeywords = ['groceries', 'food', 'transport', 'entertainment', 'salary']
    for (const keyword of categoryKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        result.category = keyword
        break
      }
    }

    // Use remaining text as description
    result.description = text

    return result
  }
}
```

**src/components/transactions/VoiceInput.tsx**
```typescript
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { IconButton } from 'react-native-paper'
import { VoiceService } from '@/services/VoiceService'

interface VoiceInputProps {
  onResult: (parsed: any) => void
}

export function VoiceInput({ onResult }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const pulseAnim = new Animated.Value(1)

  useEffect(() => {
    VoiceService.init()
    return () => {
      VoiceService.destroy()
    }
  }, [])

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isListening])

  const startListening = async () => {
    setIsListening(true)
    setTranscript('')

    await VoiceService.start(
      (text) => {
        setTranscript(text)
        const parsed = VoiceService.parseTransactionFromSpeech(text)
        onResult(parsed)
        setIsListening(false)
      },
      (error) => {
        console.error(error)
        setIsListening(false)
      }
    )
  }

  const stopListening = async () => {
    await VoiceService.stop()
    setIsListening(false)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={isListening ? stopListening : startListening}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.button,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: isListening ? '#EF4444' : '#3B82F6'
            }
          ]}
        >
          <IconButton
            icon={isListening ? 'stop' : 'microphone'}
            iconColor="white"
            size={32}
          />
        </Animated.View>
      </TouchableOpacity>

      {transcript && (
        <Text style={styles.transcript}>{transcript}</Text>
      )}

      <Text style={styles.hint}>
        {isListening
          ? 'Listening... Speak now'
          : 'Tap to speak (e.g., "Spent 50 dollars on groceries")'
        }
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  transcript: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#333'
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  }
})
```

### 4. Dashboard

**src/screens/dashboard/DashboardScreen.tsx**
```typescript
import React from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/endpoints/dashboard'
import { formatCurrency } from '@/utils/formatters/currency'
import { IncomeExpenseChart } from '@/components/charts/IncomeExpenseChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { TransactionCard } from '@/components/transactions/TransactionCard'

export function DashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getSummary
  })

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <Text style={[styles.summaryValue, styles.balance]}>
              {formatCurrency(data?.balance || 0)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.income]}>
              {formatCurrency(data?.income || 0)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, styles.expense]}>
              {formatCurrency(data?.expenses || 0)}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Income vs Expense Chart */}
      <Card style={styles.card}>
        <Card.Title title="Income vs Expenses" />
        <Card.Content>
          <IncomeExpenseChart data={data?.chartData} />
        </Card.Content>
      </Card>

      {/* Category Breakdown */}
      <Card style={styles.card}>
        <Card.Title title="Spending by Category" />
        <Card.Content>
          <CategoryPieChart data={data?.categoryBreakdown} />
        </Card.Content>
      </Card>

      {/* Active Budgets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Budgets</Text>
        {data?.budgets?.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} />
        ))}
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {data?.recentTransactions?.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onPress={() => {}}
            onDelete={() => {}}
          />
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  summaryCard: {
    flex: 1,
    elevation: 2
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  balance: {
    color: '#333'
  },
  income: {
    color: '#10B981'
  },
  expense: {
    color: '#EF4444'
  },
  card: {
    margin: 16,
    elevation: 2
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  }
})
```

---

## State Management

### Zustand Stores

**src/store/settingsStore.ts**
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  currency: string
  language: string
  biometricsEnabled: boolean
  notificationsEnabled: boolean
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setCurrency: (currency: string) => void
  setLanguage: (language: string) => void
  setBiometrics: (enabled: boolean) => void
  setNotifications: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      currency: 'USD',
      language: 'en',
      biometricsEnabled: false,
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
      setBiometrics: (enabled) => set({ biometricsEnabled: enabled }),
      setNotifications: (enabled) => set({ notificationsEnabled: enabled })
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
)
```

**src/store/offlineStore.ts**
```typescript
import { create } from 'zustand'

interface OfflineAction {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  resource: 'transaction' | 'budget' | 'wallet'
  data: any
  timestamp: number
}

interface OfflineState {
  isOffline: boolean
  queue: OfflineAction[]
  setOffline: (offline: boolean) => void
  addToQueue: (action: OfflineAction) => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  queue: [],
  setOffline: (offline) => set({ isOffline: offline }),
  addToQueue: (action) =>
    set((state) => ({ queue: [...state.queue, action] })),
  removeFromQueue: (id) =>
    set((state) => ({ queue: state.queue.filter((a) => a.id !== id) })),
  clearQueue: () => set({ queue: [] })
}))
```

---

## Navigation

**src/navigation/RootNavigator.tsx**
```typescript
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '@/hooks/useAuth'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const { isAuthenticated } = useAuth()

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

**src/navigation/TabNavigator.tsx**
```typescript
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { IconButton } from 'react-native-paper'
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen'
import { TransactionsScreen } from '@/screens/transactions/TransactionsScreen'
import { BudgetsScreen } from '@/screens/budgets/BudgetsScreen'
import { WalletsScreen } from '@/screens/wallets/WalletsScreen'
import { SettingsScreen } from '@/screens/settings/SettingsScreen'

const Tab = createBottomTabNavigator()

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#666'
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="view-dashboard" iconColor={color} size={size} />
          )
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="receipt" iconColor={color} size={size} />
          )
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="wallet" iconColor={color} size={size} />
          )
        }}
      />
      <Tab.Screen
        name="Wallets"
        component={WalletsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="bank" iconColor={color} size={size} />
          )
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="cog" iconColor={color} size={size} />
          )
        }}
      />
    </Tab.Navigator>
  )
}
```

---

## API Integration

**src/api/client.ts**
```typescript
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { useOfflineStore } from '@/store/offlineStore'

const API_URL = __DEV__
  ? 'http://localhost:3000' // Use your computer's IP for physical devices
  : 'https://your-production-api.com'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network errors (offline)
    if (!error.response) {
      useOfflineStore.getState().setOffline(true)
      // Queue the request for later
      // ... implement offline queue logic
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
    }

    return Promise.reject(error)
  }
)
```

---

## Offline Support

**src/services/OfflineService.ts**
```typescript
import NetInfo from '@react-native-community/netinfo'
import { useOfflineStore } from '@/store/offlineStore'
import { apiClient } from '@/api/client'

export class OfflineService {
  static async init() {
    // Monitor network state
    NetInfo.addEventListener((state) => {
      useOfflineStore.getState().setOffline(!state.isConnected)

      // If back online, sync queue
      if (state.isConnected) {
        this.syncQueue()
      }
    })
  }

  static async syncQueue() {
    const queue = useOfflineStore.getState().queue

    for (const action of queue) {
      try {
        await this.executeAction(action)
        useOfflineStore.getState().removeFromQueue(action.id)
      } catch (error) {
        console.error('Failed to sync action:', action, error)
      }
    }
  }

  private static async executeAction(action: any) {
    const { type, resource, data } = action

    switch (type) {
      case 'CREATE':
        return apiClient.post(`/api/${resource}`, data)
      case 'UPDATE':
        return apiClient.put(`/api/${resource}/${data.id}`, data)
      case 'DELETE':
        return apiClient.delete(`/api/${resource}/${data.id}`)
    }
  }
}
```

---

## Push Notifications

**src/services/NotificationService.ts**
```typescript
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
})

export class NotificationService {
  static async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices')
      return
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      throw new Error('Failed to get push notification permissions')
    }

    const token = await Notifications.getExpoPushTokenAsync()

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      })
    }

    return token.data
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data
      },
      trigger: null // null means immediate
    })
  }

  static async scheduleBudgetAlert(budgetName: string, percentage: number) {
    const title = `Budget Alert: ${budgetName}`
    const body = `You've spent ${percentage}% of your budget`

    await this.scheduleLocalNotification(title, body, {
      type: 'budget_alert',
      budgetName,
      percentage
    })
  }
}
```

---

## Testing

**__tests__/components/TransactionCard.test.tsx**
```typescript
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TransactionCard } from '@/components/transactions/TransactionCard'

const mockTransaction = {
  id: '1',
  amount: 100,
  type: 'EXPENSE',
  description: 'Groceries',
  date: new Date(),
  category: {
    id: '1',
    name: 'Food',
    icon: '🍔',
    color: '#F59E0B'
  },
  wallet: {
    id: '1',
    name: 'Cash',
    currency: 'USD'
  }
}

describe('TransactionCard', () => {
  it('renders transaction details correctly', () => {
    const { getByText } = render(
      <TransactionCard
        transaction={mockTransaction}
        onPress={() => {}}
        onDelete={() => {}}
      />
    )

    expect(getByText('Groceries')).toBeTruthy()
    expect(getByText('Food')).toBeTruthy()
    expect(getByText('-$100.00')).toBeTruthy()
  })

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <TransactionCard
        transaction={mockTransaction}
        onPress={onPress}
        onDelete={() => {}}
      />
    )

    fireEvent.press(getByText('Groceries'))
    expect(onPress).toHaveBeenCalled()
  })

  it('shows income with positive sign', () => {
    const incomeTransaction = { ...mockTransaction, type: 'INCOME' }
    const { getByText } = render(
      <TransactionCard
        transaction={incomeTransaction}
        onPress={() => {}}
        onDelete={() => {}}
      />
    )

    expect(getByText('+$100.00')).toBeTruthy()
  })
})
```

---

## Deployment

### iOS Deployment

**1. Configure App**
```json
// app.json
{
  "expo": {
    "name": "BudTrack",
    "slug": "budtrack",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.budtrack.app",
      "buildNumber": "1.0.0",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "BudTrack needs access to your camera to scan receipts",
        "NSMicrophoneUsageDescription": "BudTrack needs access to your microphone for voice input",
        "NSFaceIDUsageDescription": "BudTrack uses Face ID for secure authentication"
      }
    }
  }
}
```

**2. Build**
```bash
# Using EAS (Expo Application Services)
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
```

**3. Submit to App Store**
```bash
eas submit --platform ios
```

### Android Deployment

**1. Configure App**
```json
// app.json
{
  "expo": {
    "android": {
      "package": "com.budtrack.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    }
  }
}
```

**2. Build**
```bash
eas build --platform android
```

**3. Submit to Play Store**
```bash
eas submit --platform android
```

---

## Backend Configuration

Update your Next.js backend to support mobile app:

**1. Enable CORS**
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Allow mobile app origins
  const origin = request.headers.get('origin')
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return response
}

export const config = {
  matcher: '/api/:path*'
}
```

**2. Token-Based Authentication**
```typescript
// app/api/auth/mobile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sign } from 'jsonwebtoken'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user || !user.password) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  // Verify password
  const isValid = await compare(password, user.password)
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }

  // Generate JWT
  const token = sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  )

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency
    },
    token
  })
}
```

---

## App.tsx

**Complete App Setup**
```typescript
import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as PaperProvider } from 'react-native-paper'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { RootNavigator } from './src/navigation/RootNavigator'
import { VoiceService } from './src/services/VoiceService'
import { NotificationService } from './src/services/NotificationService'
import { OfflineService } from './src/services/OfflineService'
import { theme } from './src/theme/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      cacheTime: 300000
    }
  }
})

export default function App() {
  useEffect(() => {
    // Initialize services
    VoiceService.init()
    OfflineService.init()
    NotificationService.registerForPushNotifications()
      .then((token) => console.log('Push token:', token))
      .catch((error) => console.error('Push notification error:', error))
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </SafeAreaProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
```

---

## Next Steps

### Phase 1: Setup (Week 1-2)
- [ ] Create Expo/React Native project
- [ ] Install all dependencies
- [ ] Set up project structure
- [ ] Configure navigation
- [ ] Set up state management

### Phase 2: Core Features (Week 3-6)
- [ ] Implement authentication
- [ ] Build transaction screens
- [ ] Build budget screens
- [ ] Build wallet screens
- [ ] Implement API integration

### Phase 3: Advanced Features (Week 7-9)
- [ ] Voice input
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] Offline support
- [ ] Charts and analytics

### Phase 4: Polish (Week 10-11)
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Testing
- [ ] Bug fixes

### Phase 5: Deployment (Week 12)
- [ ] iOS build
- [ ] Android build
- [ ] App Store submission
- [ ] Play Store submission

---

## Resources

- **React Native Docs:** https://reactnative.dev/docs/getting-started
- **Expo Docs:** https://docs.expo.dev/
- **React Navigation:** https://reactnavigation.org/
- **React Query:** https://tanstack.com/query/latest
- **React Native Paper:** https://callstack.github.io/react-native-paper/

---

**Good luck building your BudTrack mobile app! 🚀📱**
