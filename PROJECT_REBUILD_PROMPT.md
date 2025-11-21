# BudTrack - Project Rebuild Prompt

## Context

You are tasked with rebuilding an existing Next.js financial management application called "BudTrack". The current application is functional but needs to be rebuilt with modern best practices, improved architecture, and enhanced features while maintaining all existing functionality.

---

## Current State Analysis

### Existing Tech Stack
- **Framework:** Next.js 14.2.0 with App Router
- **Language:** TypeScript 5
- **Database:** SQLite with Prisma 5.22.0 ORM
- **Styling:** Tailwind CSS 3.3 with Radix UI components
- **Authentication:** NextAuth.js 4.24.5
- **Charts:** Chart.js 4.4.8 and Recharts 2.15
- **AI:** OpenAI 4.26 integration
- **Other:** React Hot Toast, Sonner, React DatePicker, @dnd-kit, XLSX, jsPDF

### Current Features
1. ✅ Multi-wallet financial tracking
2. ✅ Income and expense management
3. ✅ Smart categorization with AI
4. ✅ Budget management with alerts
5. ✅ Savings goals tracking
6. ✅ Investment portfolio
7. ✅ Recurring transactions
8. ✅ Group expense splitting
9. ✅ Voice transaction input
10. ✅ AI-powered chatbot
11. ✅ Financial insights and analytics
12. ✅ Wedding planning module
13. ✅ Data export/import (CSV, Excel, PDF)
14. ✅ Dark mode support
15. ✅ Email notifications

### Database Schema Overview
- **Core Models:** User, Wallet, Transaction, Category, Budget, Goal
- **Advanced:** RecurringTransaction, Investment, Group, GroupMember, ExpenseSplit
- **AI Features:** ChatMessage, FinancialAdvice, CategoryRule
- **Alerts:** BudgetAlert, BudgetHistory
- **Wedding:** Wedding, Vendor, Guest, Venue, Document, Rundown, Souvenir, Gift, Playlist, Moodboard
- **Emergency Fund:** EmergencyFund, WalletEmergencyFund

---

## Rebuild Objectives

### 1. Code Quality Improvements
- [ ] Implement consistent code structure
- [ ] Add comprehensive error handling
- [ ] Improve type safety across the application
- [ ] Add JSDoc comments for complex functions
- [ ] Remove code duplication
- [ ] Implement proper separation of concerns

### 2. Performance Optimizations
- [ ] Implement proper caching strategies
- [ ] Optimize database queries
- [ ] Add database indexes
- [ ] Implement pagination everywhere
- [ ] Optimize bundle size
- [ ] Add loading states and skeleton screens
- [ ] Implement incremental static regeneration where applicable

### 3. Architecture Improvements
- [ ] Implement proper layered architecture
- [ ] Create repository pattern for database access
- [ ] Implement service layer for business logic
- [ ] Add proper API middleware
- [ ] Implement proper error boundaries
- [ ] Create reusable hooks and utilities

### 4. Testing Infrastructure
- [ ] Add unit tests for utilities and services
- [ ] Add integration tests for API routes
- [ ] Add component tests with React Testing Library
- [ ] Add E2E tests for critical flows
- [ ] Set up CI/CD for automated testing

### 5. Security Enhancements
- [ ] Implement proper rate limiting
- [ ] Add input sanitization
- [ ] Implement CSRF protection
- [ ] Add security headers
- [ ] Implement proper API authorization
- [ ] Add audit logging for sensitive operations

### 6. Developer Experience
- [ ] Add development documentation
- [ ] Create component storybook
- [ ] Add debug utilities
- [ ] Improve error messages
- [ ] Add development scripts
- [ ] Implement proper logging

---

## Rebuild Strategy

### Phase 1: Preparation & Analysis (Week 1)

#### 1.1 Code Audit
```bash
# Tasks:
- Review all existing code
- Identify technical debt
- Document current architecture
- List all features and their status
- Identify breaking changes needed
- Create migration plan
```

#### 1.2 Dependency Audit
```bash
# Review and update:
- Update Next.js to latest stable
- Update Prisma to latest
- Update all dependencies
- Remove unused dependencies
- Check for security vulnerabilities
```

#### 1.3 Database Analysis
```bash
# Tasks:
- Review current schema
- Identify missing indexes
- Plan schema improvements
- Document relationships
- Plan data migration strategy
```

### Phase 2: Foundation (Week 2-3)

#### 2.1 Project Structure Reorganization

**New Directory Structure:**
```
budtrack/
├── src/
│   ├── app/                      # Next.js App Router (routes only)
│   │   ├── (auth)/               # Auth route group
│   │   │   ├── signin/
│   │   │   └── signup/
│   │   ├── (dashboard)/          # Protected route group
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── wallets/
│   │   │   ├── categories/
│   │   │   ├── goals/
│   │   │   ├── investments/
│   │   │   ├── recurring/
│   │   │   ├── groups/
│   │   │   ├── insights/
│   │   │   ├── reports/
│   │   │   ├── alerts/
│   │   │   ├── settings/
│   │   │   ├── risk-assessment/
│   │   │   ├── wedding-planner/
│   │   │   └── chatbot/
│   │   ├── api/                  # API routes
│   │   │   └── v1/               # Versioned API
│   │   │       ├── auth/
│   │   │       ├── transactions/
│   │   │       ├── budgets/
│   │   │       ├── wallets/
│   │   │       ├── categories/
│   │   │       ├── goals/
│   │   │       ├── investments/
│   │   │       ├── recurring/
│   │   │       ├── groups/
│   │   │       ├── insights/
│   │   │       ├── reports/
│   │   │       ├── chat/
│   │   │       └── wedding/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/               # React components
│   │   ├── ui/                   # Base UI components (Radix)
│   │   ├── features/             # Feature-specific components
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── wallets/
│   │   │   ├── goals/
│   │   │   ├── groups/
│   │   │   ├── wedding/
│   │   │   └── charts/
│   │   ├── layouts/              # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── shared/               # Shared components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorMessage.tsx
│   │       └── EmptyState.tsx
│   ├── lib/                      # Core utilities
│   │   ├── db/                   # Database layer
│   │   │   ├── prisma.ts
│   │   │   └── repositories/     # Repository pattern
│   │   │       ├── user.repository.ts
│   │   │       ├── wallet.repository.ts
│   │   │       ├── transaction.repository.ts
│   │   │       ├── budget.repository.ts
│   │   │       ├── category.repository.ts
│   │   │       ├── goal.repository.ts
│   │   │       └── ...
│   │   ├── services/             # Business logic
│   │   │   ├── transaction.service.ts
│   │   │   ├── budget.service.ts
│   │   │   ├── wallet.service.ts
│   │   │   ├── category.service.ts
│   │   │   ├── goal.service.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── ...
│   │   ├── utils/                # Utility functions
│   │   │   ├── calculations/
│   │   │   │   ├── budget.ts
│   │   │   │   ├── emergency-fund.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── formatters/
│   │   │   │   ├── currency.ts
│   │   │   │   ├── date.ts
│   │   │   │   └── number.ts
│   │   │   ├── validators/
│   │   │   │   └── schemas.ts
│   │   │   └── helpers.ts
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useTransactions.ts
│   │   │   ├── useBudgets.ts
│   │   │   ├── useWallets.ts
│   │   │   ├── useCategories.ts
│   │   │   ├── useGoals.ts
│   │   │   ├── useVoiceInput.ts
│   │   │   └── ...
│   │   ├── api/                  # API utilities
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── rate-limit.ts
│   │   │   │   └── validator.ts
│   │   │   ├── client.ts         # API client
│   │   │   └── response.ts       # Response helpers
│   │   ├── config/               # Configuration
│   │   │   ├── constants.ts
│   │   │   ├── env.ts
│   │   │   └── features.ts
│   │   └── auth.ts               # NextAuth config
│   ├── types/                    # TypeScript types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   ├── components.ts
│   │   └── index.ts
│   ├── styles/                   # Global styles
│   │   └── globals.css
│   └── providers/                # Context providers
│       ├── ThemeProvider.tsx
│       ├── SessionProvider.tsx
│       └── QueryProvider.tsx
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seeds/
│       ├── index.ts
│       ├── categories.seed.ts
│       ├── wallets.seed.ts
│       └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── backup.ps1
│   ├── restore.ps1
│   └── migrate.ts
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   └── CONTRIBUTING.md
└── public/
```

#### 2.2 Implement Repository Pattern

**Example: Transaction Repository**
```typescript
// src/lib/db/repositories/transaction.repository.ts
import { prisma } from '../prisma'
import type { Transaction, Prisma } from '@prisma/client'

export class TransactionRepository {
  /**
   * Find transactions with filters and pagination
   */
  async findMany(params: {
    where?: Prisma.TransactionWhereInput
    skip?: number
    take?: number
    orderBy?: Prisma.TransactionOrderByWithRelationInput
    include?: Prisma.TransactionInclude
  }) {
    const { where, skip = 0, take = 50, orderBy, include } = params

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy,
        include,
      }),
      prisma.transaction.count({ where }),
    ])

    return {
      data: transactions,
      pagination: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take),
      },
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string, include?: Prisma.TransactionInclude) {
    return prisma.transaction.findUnique({
      where: { id },
      include,
    })
  }

  /**
   * Create transaction
   */
  async create(data: Prisma.TransactionCreateInput) {
    return prisma.transaction.create({ data })
  }

  /**
   * Update transaction
   */
  async update(id: string, data: Prisma.TransactionUpdateInput) {
    return prisma.transaction.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete transaction
   */
  async delete(id: string) {
    return prisma.transaction.delete({
      where: { id },
    })
  }

  /**
   * Get transactions summary
   */
  async getSummary(userId: string, startDate: Date, endDate: Date) {
    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return {
      income: {
        total: income._sum.amount || 0,
        count: income._count,
      },
      expense: {
        total: expense._sum.amount || 0,
        count: expense._count,
      },
      balance: (income._sum.amount || 0) - (expense._sum.amount || 0),
    }
  }

  /**
   * Get category breakdown
   */
  async getCategoryBreakdown(
    userId: string,
    type: 'INCOME' | 'EXPENSE',
    startDate: Date,
    endDate: Date
  ) {
    return prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    })
  }
}

// Export singleton instance
export const transactionRepository = new TransactionRepository()
```

#### 2.3 Implement Service Layer

**Example: Transaction Service**
```typescript
// src/lib/services/transaction.service.ts
import { transactionRepository } from '@/lib/db/repositories/transaction.repository'
import { walletRepository } from '@/lib/db/repositories/wallet.repository'
import { budgetService } from './budget.service'
import { goalService } from './goal.service'
import { notificationService } from './notification.service'
import { categoryInferenceService } from './category-inference.service'
import type { CreateTransactionInput, UpdateTransactionInput } from '@/types'

export class TransactionService {
  /**
   * Create a new transaction
   * - Updates wallet balance
   * - Updates budget spent amount
   * - Checks budget alerts
   * - Links to goal if applicable
   * - Sends notifications
   */
  async createTransaction(userId: string, input: CreateTransactionInput) {
    try {
      // Infer category if not provided
      if (!input.categoryId && input.description) {
        const inferredCategory = await categoryInferenceService.infer(
          input.description,
          userId
        )
        if (inferredCategory) {
          input.categoryId = inferredCategory.id
        }
      }

      // Create transaction
      const transaction = await transactionRepository.create({
        ...input,
        user: { connect: { id: userId } },
        wallet: { connect: { id: input.walletId } },
        category: { connect: { id: input.categoryId } },
      })

      // Update wallet balance
      await this.updateWalletBalance(input.walletId, input.amount, input.type)

      // Update budget if applicable
      if (input.type === 'EXPENSE' && input.categoryId) {
        await budgetService.updateBudgetSpent(
          userId,
          input.categoryId,
          input.walletId,
          input.amount
        )
      }

      // Try to auto-link to goal
      if (input.type === 'INCOME') {
        await goalService.autoLink(transaction.id, userId)
      }

      // Send notification
      await notificationService.sendTransactionCreated(userId, transaction)

      return {
        success: true,
        data: transaction,
      }
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`)
    }
  }

  /**
   * Update wallet balance after transaction
   */
  private async updateWalletBalance(
    walletId: string,
    amount: number,
    type: 'INCOME' | 'EXPENSE'
  ) {
    const wallet = await walletRepository.findById(walletId)
    if (!wallet) throw new Error('Wallet not found')

    const newBalance =
      type === 'INCOME'
        ? wallet.balance + amount
        : wallet.balance - amount

    await walletRepository.update(walletId, { balance: newBalance })
  }

  /**
   * Get user transactions with filters
   */
  async getTransactions(
    userId: string,
    filters: {
      type?: 'INCOME' | 'EXPENSE'
      categoryId?: string
      walletId?: string
      startDate?: Date
      endDate?: Date
      search?: string
      page?: number
      pageSize?: number
    }
  ) {
    const {
      type,
      categoryId,
      walletId,
      startDate,
      endDate,
      search,
      page = 1,
      pageSize = 50,
    } = filters

    const where: any = { userId }

    if (type) where.type = type
    if (categoryId) where.categoryId = categoryId
    if (walletId) where.walletId = walletId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = startDate
      if (endDate) where.date.lte = endDate
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    return transactionRepository.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { date: 'desc' },
      include: {
        category: true,
        wallet: true,
        goal: true,
      },
    })
  }

  /**
   * Get transaction analytics
   */
  async getAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    const [summary, incomeByCategory, expenseByCategory, trends] =
      await Promise.all([
        transactionRepository.getSummary(userId, startDate, endDate),
        transactionRepository.getCategoryBreakdown(
          userId,
          'INCOME',
          startDate,
          endDate
        ),
        transactionRepository.getCategoryBreakdown(
          userId,
          'EXPENSE',
          startDate,
          endDate
        ),
        this.getTrends(userId, startDate, endDate),
      ])

    return {
      summary,
      breakdown: {
        income: incomeByCategory,
        expense: expenseByCategory,
      },
      trends,
    }
  }

  /**
   * Import transactions from CSV
   */
  async importFromCSV(userId: string, csvData: string) {
    // Implementation for CSV import
    // Parse CSV, validate, create transactions
  }

  /**
   * Export transactions to Excel/PDF
   */
  async exportToExcel(userId: string, filters: any) {
    // Implementation for Excel export
  }

  async exportToPDF(userId: string, filters: any) {
    // Implementation for PDF export
  }

  private async getTrends(userId: string, startDate: Date, endDate: Date) {
    // Implementation for trend analysis
  }
}

// Export singleton instance
export const transactionService = new TransactionService()
```

#### 2.4 Implement Custom Hooks

**Example: useTransactions Hook**
```typescript
// src/lib/hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionApi } from '@/lib/api/transaction.api'
import { toast } from 'sonner'
import type { CreateTransactionInput, TransactionFilters } from '@/types'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionApi.getAll(filters),
    staleTime: 30000, // 30 seconds
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTransactionInput) =>
      transactionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Transaction created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create transaction')
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      transactionApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction', id] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Transaction updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update transaction')
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transactionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Transaction deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete transaction')
    },
  })
}

export function useTransactionAnalytics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['transaction-analytics', startDate, endDate],
    queryFn: () => transactionApi.getAnalytics(startDate, endDate),
    staleTime: 60000, // 1 minute
  })
}

export function useVoiceTransaction() {
  const createTransaction = useCreateTransaction()

  const startListening = async () => {
    // Voice recognition implementation
  }

  const stopListening = () => {
    // Stop voice recognition
  }

  return {
    startListening,
    stopListening,
    createTransaction,
  }
}
```

#### 2.5 API Route Implementation

**Example: Improved API Route**
```typescript
// src/app/api/v1/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transactionService } from '@/lib/services/transaction.service'
import { createTransactionSchema } from '@/lib/utils/validators/schemas'
import { withErrorHandler } from '@/lib/api/middleware/error-handler'
import { withRateLimit } from '@/lib/api/middleware/rate-limit'
import { apiResponse } from '@/lib/api/response'

/**
 * GET /api/v1/transactions
 * Get user transactions with filters
 */
export const GET = withErrorHandler(
  withRateLimit(async (req: NextRequest) => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiResponse.unauthorized()
    }

    const searchParams = req.nextUrl.searchParams
    const filters = {
      type: searchParams.get('type') as 'INCOME' | 'EXPENSE' | undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      walletId: searchParams.get('walletId') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '50'),
    }

    const result = await transactionService.getTransactions(
      session.user.id,
      filters
    )

    return apiResponse.success(result)
  })
)

/**
 * POST /api/v1/transactions
 * Create a new transaction
 */
export const POST = withErrorHandler(
  withRateLimit(async (req: NextRequest) => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiResponse.unauthorized()
    }

    const body = await req.json()

    // Validate input
    const validation = createTransactionSchema.safeParse(body)
    if (!validation.success) {
      return apiResponse.badRequest(validation.error.errors)
    }

    const result = await transactionService.createTransaction(
      session.user.id,
      validation.data
    )

    return apiResponse.created(result.data)
  })
)
```

#### 2.6 API Response Helper

```typescript
// src/lib/api/response.ts
import { NextResponse } from 'next/server'

export const apiResponse = {
  success: (data: any, message?: string) => {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      { status: 200 }
    )
  },

  created: (data: any, message?: string) => {
    return NextResponse.json(
      {
        success: true,
        data,
        message: message || 'Resource created successfully',
      },
      { status: 201 }
    )
  },

  noContent: () => {
    return new NextResponse(null, { status: 204 })
  },

  badRequest: (error: any, message?: string) => {
    return NextResponse.json(
      {
        success: false,
        error: error || 'Bad request',
        message,
      },
      { status: 400 }
    )
  },

  unauthorized: (message?: string) => {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: message || 'Authentication required',
      },
      { status: 401 }
    )
  },

  forbidden: (message?: string) => {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: message || 'Insufficient permissions',
      },
      { status: 403 }
    )
  },

  notFound: (resource?: string) => {
    return NextResponse.json(
      {
        success: false,
        error: 'Not found',
        message: resource ? `${resource} not found` : 'Resource not found',
      },
      { status: 404 }
    )
  },

  serverError: (error: any) => {
    console.error('Server Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 }
    )
  },
}
```

#### 2.7 Error Handler Middleware

```typescript
// src/lib/api/middleware/error-handler.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { apiResponse } from '../response'

export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error('API Error:', error)

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return apiResponse.badRequest(
            'A record with this value already exists'
          )
        }
        if (error.code === 'P2025') {
          return apiResponse.notFound()
        }
      }

      // Handle validation errors
      if (error.name === 'ZodError') {
        return apiResponse.badRequest(error.errors)
      }

      // Default server error
      return apiResponse.serverError(error)
    }
  }
}
```

### Phase 3: Core Features Rebuild (Week 4-6)

#### 3.1 Transaction Management
- [ ] Rebuild transaction CRUD with service layer
- [ ] Implement pagination and filtering
- [ ] Add bulk operations
- [ ] Improve CSV import/export
- [ ] Add transaction validation
- [ ] Implement transaction search

#### 3.2 Budget Management
- [ ] Rebuild budget system with proper calculations
- [ ] Improve alert generation logic
- [ ] Add budget templates
- [ ] Implement budget analytics
- [ ] Add budget forecasting

#### 3.3 Wallet Management
- [ ] Rebuild wallet CRUD
- [ ] Improve balance tracking
- [ ] Add wallet reconciliation
- [ ] Implement wallet analytics

#### 3.4 Category Management
- [ ] Rebuild category system
- [ ] Improve smart categorization
- [ ] Add ML-based suggestions
- [ ] Implement category analytics

### Phase 4: Advanced Features (Week 7-8)

#### 4.1 AI Integration
- [ ] Refactor OpenAI integration
- [ ] Implement caching for AI responses
- [ ] Add conversation context
- [ ] Improve financial advice generation
- [ ] Add error handling and fallbacks

#### 4.2 Voice Recognition
- [ ] Rebuild voice input with better UX
- [ ] Add voice commands
- [ ] Improve accuracy
- [ ] Add language support

#### 4.3 Group Features
- [ ] Rebuild group expense splitting
- [ ] Improve split calculations
- [ ] Add settlement tracking
- [ ] Implement group analytics

#### 4.4 Wedding Planner
- [ ] Refactor wedding module
- [ ] Improve data relationships
- [ ] Add templates
- [ ] Implement timeline features

### Phase 5: Testing & Quality (Week 9)

#### 5.1 Unit Tests
```typescript
// Example: tests/unit/services/transaction.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { transactionService } from '@/lib/services/transaction.service'
import { transactionRepository } from '@/lib/db/repositories/transaction.repository'

vi.mock('@/lib/db/repositories/transaction.repository')

describe('TransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTransaction', () => {
    it('should create a transaction and update wallet balance', async () => {
      const mockTransaction = {
        id: '1',
        amount: 100,
        type: 'EXPENSE',
        description: 'Test',
        userId: 'user1',
        walletId: 'wallet1',
        categoryId: 'cat1',
      }

      vi.mocked(transactionRepository.create).mockResolvedValue(
        mockTransaction as any
      )

      const result = await transactionService.createTransaction('user1', {
        amount: 100,
        type: 'EXPENSE',
        description: 'Test',
        walletId: 'wallet1',
        categoryId: 'cat1',
        date: new Date(),
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransaction)
    })

    it('should handle errors properly', async () => {
      vi.mocked(transactionRepository.create).mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        transactionService.createTransaction('user1', {} as any)
      ).rejects.toThrow('Failed to create transaction')
    })
  })
})
```

#### 5.2 Integration Tests
```typescript
// Example: tests/integration/api/transactions.test.ts
import { describe, it, expect } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import * as transactionsRoute from '@/app/api/v1/transactions/route'

describe('POST /api/v1/transactions', () => {
  it('should create a transaction', async () => {
    await testApiHandler({
      handler: transactionsRoute.POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100,
            type: 'EXPENSE',
            description: 'Test transaction',
            walletId: 'wallet1',
            categoryId: 'cat1',
            date: new Date().toISOString(),
          }),
        })

        expect(res.status).toBe(201)
        const json = await res.json()
        expect(json.success).toBe(true)
      },
    })
  })

  it('should return 401 without authentication', async () => {
    await testApiHandler({
      handler: transactionsRoute.POST,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        expect(res.status).toBe(401)
      },
    })
  })
})
```

### Phase 6: Performance & Optimization (Week 10)

#### 6.1 Database Optimization
```prisma
// Add indexes to schema.prisma
model Transaction {
  // ... existing fields

  @@index([userId, date])
  @@index([walletId, date])
  @@index([categoryId, date])
  @@index([type, date])
  @@index([userId, type, date])
}

model Budget {
  // ... existing fields

  @@index([userId, status])
  @@index([userId, startDate, endDate])
  @@index([walletId])
  @@index([categoryId])
}

model Goal {
  // ... existing fields

  @@index([userId, status])
  @@index([deadline])
}
```

#### 6.2 Caching Strategy
```typescript
// src/lib/cache/redis.ts (if using Redis)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class CacheService {
  private ttl = {
    short: 60, // 1 minute
    medium: 300, // 5 minutes
    long: 3600, // 1 hour
  }

  async get<T>(key: string): Promise<T | null> {
    return redis.get(key)
  }

  async set(key: string, value: any, ttl: keyof typeof this.ttl = 'medium') {
    return redis.set(key, value, { ex: this.ttl[ttl] })
  }

  async del(key: string) {
    return redis.del(key)
  }

  async invalidatePattern(pattern: string) {
    // Invalidate all keys matching pattern
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}

export const cacheService = new CacheService()
```

#### 6.3 Query Optimization
```typescript
// Example: Optimize transaction queries
export class TransactionRepository {
  async findMany(params: any) {
    // Use select to fetch only needed fields
    return prisma.transaction.findMany({
      ...params,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        date: true,
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        wallet: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        // Don't fetch user data if not needed
      },
    })
  }
}
```

### Phase 7: Documentation (Week 11)

#### 7.1 API Documentation
```markdown
# API Documentation

## Authentication

All API endpoints require authentication via NextAuth session.

## Endpoints

### Transactions

#### GET /api/v1/transactions
Get user transactions with filters

**Query Parameters:**
- `type` (optional): INCOME | EXPENSE
- `categoryId` (optional): Filter by category
- `walletId` (optional): Filter by wallet
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `search` (optional): Search in description/notes
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "pageSize": 50,
      "totalPages": 2
    }
  }
}
```

... (continue for all endpoints)
```

#### 7.2 Component Documentation
```typescript
/**
 * TransactionForm Component
 *
 * A form for creating and editing transactions with voice input support.
 *
 * @component
 * @example
 * ```tsx
 * <TransactionForm
 *   mode="create"
 *   onSuccess={(transaction) => console.log('Created:', transaction)}
 *   onCancel={() => setIsOpen(false)}
 * />
 * ```
 *
 * @param {Object} props
 * @param {'create' | 'edit'} props.mode - Form mode
 * @param {Transaction} [props.initialData] - Initial data for edit mode
 * @param {Function} props.onSuccess - Callback on successful submission
 * @param {Function} [props.onCancel] - Callback on cancel
 */
export function TransactionForm({ mode, initialData, onSuccess, onCancel }) {
  // Implementation
}
```

### Phase 8: Deployment & Migration (Week 12)

#### 8.1 Migration Strategy

**Database Migration:**
```typescript
// scripts/migrate.ts
import { PrismaClient } from '@prisma/client'

const oldDb = new PrismaClient({
  datasources: { db: { url: 'file:./old.db' } },
})

const newDb = new PrismaClient({
  datasources: { db: { url: 'file:./new.db' } },
})

async function migrate() {
  console.log('Starting migration...')

  // 1. Migrate users
  const users = await oldDb.user.findMany()
  for (const user of users) {
    await newDb.user.create({ data: user })
  }

  // 2. Migrate wallets
  const wallets = await oldDb.wallet.findMany()
  for (const wallet of wallets) {
    await newDb.wallet.create({ data: wallet })
  }

  // Continue for all tables...

  console.log('Migration complete!')
}

migrate()
  .catch(console.error)
  .finally(() => {
    oldDb.$disconnect()
    newDb.$disconnect()
  })
```

#### 8.2 Deployment Checklist

**Pre-deployment:**
- [ ] Run all tests
- [ ] Check for TypeScript errors
- [ ] Run linter
- [ ] Build production bundle
- [ ] Test production build locally
- [ ] Backup production database
- [ ] Review environment variables

**Deployment:**
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Check all features

**Post-deployment:**
- [ ] Verify all features work
- [ ] Check performance metrics
- [ ] Monitor error rates
- [ ] Collect user feedback

---

## Key Improvements Summary

### 1. Architecture
✅ Layered architecture (Repository → Service → API → UI)
✅ Separation of concerns
✅ Dependency injection ready
✅ Testable code structure

### 2. Code Quality
✅ TypeScript strict mode
✅ Comprehensive error handling
✅ Input validation with Zod
✅ JSDoc comments
✅ Consistent code style

### 3. Performance
✅ Database indexing
✅ Query optimization
✅ Caching strategy
✅ Pagination everywhere
✅ Bundle optimization

### 4. Developer Experience
✅ Custom hooks for all features
✅ API client abstraction
✅ Reusable utilities
✅ Clear documentation
✅ Testing infrastructure

### 5. Security
✅ Proper authentication
✅ Authorization checks
✅ Input sanitization
✅ Rate limiting
✅ CSRF protection

### 6. Testing
✅ Unit tests
✅ Integration tests
✅ API tests
✅ Component tests
✅ E2E tests (optional)

---

## Technologies to Add/Upgrade

### Essential
- [ ] **React Query** (@tanstack/react-query) - Server state management
- [ ] **Zod** - Already included, use extensively
- [ ] **Vitest** - Fast unit testing
- [ ] **Testing Library** - Component testing
- [ ] **MSW** - API mocking for tests

### Nice to Have
- [ ] **Storybook** - Component documentation
- [ ] **Sentry** - Error tracking
- [ ] **PostHog** - Analytics
- [ ] **Prettier** - Code formatting
- [ ] **Husky** - Git hooks
- [ ] **Lint-staged** - Pre-commit linting

---

## Success Metrics

### Code Quality
- [ ] 80%+ test coverage
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Lighthouse score > 90

### Performance
- [ ] Page load < 2s
- [ ] API response < 500ms
- [ ] Bundle size < 500KB
- [ ] No layout shifts

### User Experience
- [ ] All features work correctly
- [ ] Responsive on all devices
- [ ] Accessible (WCAG AA)
- [ ] Fast and smooth interactions

---

## Timeline Summary

- **Week 1:** Preparation & Analysis
- **Week 2-3:** Foundation & Architecture
- **Week 4-6:** Core Features Rebuild
- **Week 7-8:** Advanced Features
- **Week 9:** Testing & Quality
- **Week 10:** Performance & Optimization
- **Week 11:** Documentation
- **Week 12:** Deployment & Migration

**Total Duration:** 12 weeks (3 months)

---

## Next Steps

1. **Review this prompt** with the team
2. **Set up development environment** with new structure
3. **Create feature branches** for each phase
4. **Start with Phase 1** (Preparation & Analysis)
5. **Follow the rebuild plan** systematically
6. **Test continuously** throughout the process
7. **Document as you go**
8. **Deploy incrementally** if possible

---

**Remember:** The goal is to rebuild with better architecture, not just rewrite. Focus on creating a maintainable, scalable, and high-quality codebase that will serve the project for years to come.
