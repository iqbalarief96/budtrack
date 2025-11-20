# BudTrack - Project Recreation Prompt

## Project Overview

Create a comprehensive personal and collaborative financial management web application called "BudTrack" using Next.js 14 with TypeScript. This application should provide advanced financial tracking, AI-powered insights, voice input capabilities, and specialized features including wedding planning.

---

## Tech Stack Requirements

### Core Framework
- **Next.js 14.2.0** with App Router
- **TypeScript 5** for type safety
- **React 18** for UI components

### Styling & UI
- **Tailwind CSS 3.3** with typography plugin
- **Radix UI** components for accessibility:
  - Alert Dialog, Checkbox, Dialog, Dropdown Menu
  - Label, Progress, Radio Group, Select
  - Separator, Slider, Slot, Switch, Tabs
- **Lucide React** for icons
- **class-variance-authority** and **clsx** for conditional styling
- **tailwindcss-animate** for animations
- **next-themes** for dark mode support

### Database & ORM
- **Prisma 5.22.0** as ORM
- **SQLite** as database (file-based: `dev.db`)
- **@prisma/client** for database access

### Authentication
- **NextAuth.js 4.24.5** for authentication
- **@auth/prisma-adapter** for Prisma integration
- **Bcryptjs** for password hashing

### Data Visualization
- **Chart.js 4.4.8** for charts
- **react-chartjs-2** for React integration
- **Recharts 2.15** for additional visualizations

### AI & External Services
- **OpenAI 4.26** for AI insights and chatbot
- **Web Speech API** for voice recognition
- **Nodemailer** for email notifications

### Data Processing & Export
- **XLSX** for Excel export/import
- **jsPDF** with **jspdf-autotable** for PDF generation
- **csv-parse** for CSV import
- **iconv-lite** for encoding support

### Utilities
- **React Hot Toast** and **Sonner** for notifications
- **React DatePicker** for date inputs
- **React Markdown** with **remark-gfm** and **rehype-raw** for markdown rendering
- **@dnd-kit** (core, sortable, utilities) for drag and drop
- **Zod** for schema validation
- **UUID** and **Nanoid** for ID generation
- **@upstash/ratelimit** and **@vercel/kv** for rate limiting

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  password      String?
  image         String?
  currency      String    @default("IDR")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  wallets       Wallet[]
  categories    Category[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]
  investments   Investment[]
  groups        GroupMember[]
  emergencyFund EmergencyFund?
  chatMessages  ChatMessage[]
  advices       FinancialAdvice[]
  weddings      Wedding[]
}
```

#### Wallet
```prisma
model Wallet {
  id               String   @id @default(cuid())
  name             String
  type             String   // BANK, CASH, CARD, EWALLET
  balance          Float    @default(0)
  currency         String   @default("IDR")
  icon             String?
  color            String?
  isActive         Boolean  @default(true)
  description      String?
  emergencyFundTarget Float? @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  transactions     Transaction[]
  budgets          Budget[]
  emergencyFunds   WalletEmergencyFund[]
}
```

#### Category
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  type        String   // INCOME, EXPENSE
  icon        String?
  color       String?
  description String?
  isDefault   Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  transactions Transaction[]
  budgets      Budget[]
  rules        CategoryRule[]
  goals        Goal[]
}
```

#### Transaction
```prisma
model Transaction {
  id          String   @id @default(cuid())
  amount      Float
  type        String   // INCOME, EXPENSE
  description String
  date        DateTime
  notes       String?
  isRecurring Boolean  @default(false)
  tags        String[] @default([])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  walletId    String
  wallet      Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)

  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])

  goalId      String?
  goal        Goal?    @relation(fields: [goalId], references: [id])

  recurringId String?
  recurring   RecurringTransaction? @relation(fields: [recurringId], references: [id])
}
```

#### Budget
```prisma
model Budget {
  id          String   @id @default(cuid())
  name        String
  amount      Float
  spent       Float    @default(0)
  period      String   // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  startDate   DateTime
  endDate     DateTime
  isRecurring Boolean  @default(false)
  status      String   @default("ACTIVE") // ACTIVE, COMPLETED, ARCHIVED
  alertAt80   Boolean  @default(true)
  alertAt100  Boolean  @default(true)
  alertAt120  Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  walletId    String?
  wallet      Wallet?  @relation(fields: [walletId], references: [id])

  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])

  // Relations
  alerts      BudgetAlert[]
  history     BudgetHistory[]
}
```

#### Goal
```prisma
model Goal {
  id          String   @id @default(cuid())
  name        String
  description String?
  targetAmount Float
  currentAmount Float   @default(0)
  deadline    DateTime?
  status      String   @default("ONGOING") // ONGOING, COMPLETED, ARCHIVED
  icon        String?
  color       String?
  priority    String   @default("MEDIUM") // LOW, MEDIUM, HIGH
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])

  // Relations
  transactions Transaction[]
  activities   GoalActivity[]
}
```

### Additional Models

#### RecurringTransaction
```prisma
model RecurringTransaction {
  id          String   @id @default(cuid())
  amount      Float
  type        String   // INCOME, EXPENSE
  description String
  frequency   String   // DAILY, WEEKLY, MONTHLY, YEARLY
  startDate   DateTime
  endDate     DateTime?
  nextDate    DateTime
  isActive    Boolean  @default(true)
  dayOfWeek   Int?     // 0-6 for weekly
  dayOfMonth  Int?     // 1-31 for monthly
  monthOfYear Int?     // 1-12 for yearly
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  walletId    String
  categoryId  String

  // Relations
  transactions Transaction[]
}
```

#### Group (for expense splitting)
```prisma
model Group {
  id          String   @id @default(cuid())
  name        String
  description String?
  inviteCode  String   @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  createdById String

  // Relations
  members     GroupMember[]
  transactions GroupTransaction[]
  wallets     GroupWallet[]
}

model GroupMember {
  id        String   @id @default(cuid())
  role      String   @default("MEMBER") // OWNER, MEMBER
  joinedAt  DateTime @default(now())

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  groupId   String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)

  // Relations
  splits    ExpenseSplit[]
}

model GroupTransaction {
  id          String   @id @default(cuid())
  amount      Float
  description String
  date        DateTime
  paidBy      String
  createdAt   DateTime @default(now())

  groupId     String
  group       Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)

  // Relations
  splits      ExpenseSplit[]
}

model ExpenseSplit {
  id            String   @id @default(cuid())
  amount        Float
  isPaid        Boolean  @default(false)
  paidAt        DateTime?

  transactionId String
  transaction   GroupTransaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  memberId      String
  member        GroupMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
}
```

#### Investment
```prisma
model Investment {
  id            String   @id @default(cuid())
  name          String
  type          String   // STOCK, CRYPTO, BOND, MUTUAL_FUND, REAL_ESTATE
  symbol        String?
  quantity      Float
  buyPrice      Float
  currentPrice  Float?
  currency      String   @default("IDR")
  purchaseDate  DateTime
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### AI & Smart Features
```prisma
model CategoryRule {
  id          String   @id @default(cuid())
  pattern     String   // Regex pattern
  priority    Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  userId      String
}

model FinancialAdvice {
  id          String   @id @default(cuid())
  title       String
  description String
  type        String   // SAVINGS, INVESTMENT, SPENDING, BUDGET
  priority    String   // LOW, MEDIUM, HIGH, URGENT
  impact      String?  // Estimated financial impact
  timeframe   String?  // SHORT, MEDIUM, LONG
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ChatMessage {
  id          String   @id @default(cuid())
  role        String   // USER, ASSISTANT
  content     String
  createdAt   DateTime @default(now())

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### Budget Alerts
```prisma
model BudgetAlert {
  id          String   @id @default(cuid())
  type        String   // WARNING, CRITICAL, EXCEEDED
  threshold   Float    // 80, 100, 120
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  budgetId    String
  budget      Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
}

model BudgetHistory {
  id          String   @id @default(cuid())
  amount      Float
  spent       Float
  period      String
  startDate   DateTime
  endDate     DateTime
  createdAt   DateTime @default(now())

  budgetId    String
  budget      Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
}
```

#### Emergency Fund
```prisma
model EmergencyFund {
  id          String   @id @default(cuid())
  targetAmount Float
  currentAmount Float   @default(0)
  monthlyExpense Float  @default(0)
  targetMonths Int     @default(6)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model WalletEmergencyFund {
  id          String   @id @default(cuid())
  targetAmount Float
  currentAmount Float   @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  walletId    String
  wallet      Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
}
```

### Wedding Planning Models

```prisma
model Wedding {
  id          String   @id @default(cuid())
  brideName   String
  groomName   String
  weddingDate DateTime
  venue       String?
  totalBudget Float
  spentAmount Float    @default(0)
  guestCount  Int      @default(0)
  status      String   @default("PLANNING") // PLANNING, CONFIRMED, COMPLETED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Relations
  budgetCategories WeddingBudgetCategory[]
  vendors     Vendor[]
  venues      Venue[]
  guests      Guest[]
  documents   Document[]
  rundowns    Rundown[]
  souvenirs   Souvenir[]
  gifts       Gift[]
  playlists   Playlist[]
  moodboards  Moodboard[]
}

model WeddingBudgetCategory {
  id          String   @id @default(cuid())
  name        String   // VENUE, CATERING, DECORATION, PHOTOGRAPHY, etc.
  allocated   Float
  spent       Float    @default(0)

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)

  items       WeddingBudgetItem[]
}

model WeddingBudgetItem {
  id          String   @id @default(cuid())
  name        String
  estimatedCost Float
  actualCost  Float?
  isPaid      Boolean  @default(false)
  notes       String?

  categoryId  String
  category    WeddingBudgetCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
}

model Vendor {
  id          String   @id @default(cuid())
  name        String
  type        String   // CATERING, PHOTOGRAPHY, DECORATION, etc.
  contact     String?
  email       String?
  phone       String?
  price       Float?
  isPaid      Boolean  @default(false)
  notes       String?
  rating      Float?

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Venue {
  id          String   @id @default(cuid())
  name        String
  address     String
  capacity    Int
  price       Float
  isBooked    Boolean  @default(false)
  contactPerson String?
  phone       String?
  notes       String?

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Guest {
  id          String   @id @default(cuid())
  name        String
  email       String?
  phone       String?
  category    String?  // FAMILY, FRIEND, COLLEAGUE
  rsvpStatus  String   @default("PENDING") // PENDING, CONFIRMED, DECLINED
  plusOne     Boolean  @default(false)
  tableNumber Int?
  notes       String?

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Document {
  id          String   @id @default(cuid())
  name        String
  type        String   // CONTRACT, INVOICE, PERMIT, etc.
  url         String?
  notes       String?
  dueDate     DateTime?
  isComplete  Boolean  @default(false)

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Rundown {
  id          String   @id @default(cuid())
  time        DateTime
  activity    String
  duration    Int?     // in minutes
  responsible String?
  notes       String?

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Souvenir {
  id          String   @id @default(cuid())
  name        String
  quantity    Int
  unitPrice   Float
  totalPrice  Float
  supplier    String?
  isOrdered   Boolean  @default(false)

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Gift {
  id          String   @id @default(cuid())
  donorName   String
  amount      Float?
  item        String?
  receivedDate DateTime @default(now())
  thankYouSent Boolean @default(false)
  notes       String?

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Playlist {
  id          String   @id @default(cuid())
  songTitle   String
  artist      String
  moment      String?  // CEREMONY, RECEPTION, FIRST_DANCE, etc.
  notes       String?

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}

model Moodboard {
  id          String   @id @default(cuid())
  title       String
  imageUrl    String?
  description String?
  category    String?  // DECORATION, DRESS, VENUE, FLOWERS, etc.

  weddingId   String
  wedding     Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
}
```

---

## Application Structure

### Directory Layout

```
budtrack/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── transactions/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── import/route.ts
│   │   │   └── export/route.ts
│   │   ├── budgets/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── alerts/route.ts
│   │   ├── wallets/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── categories/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── rules/route.ts
│   │   │   └── infer/route.ts
│   │   ├── goals/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/link/route.ts
│   │   ├── investments/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── recurring/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── groups/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── [id]/invite/route.ts
│   │   │   ├── [id]/members/route.ts
│   │   │   └── [id]/transactions/route.ts
│   │   ├── insights/
│   │   │   ├── route.ts
│   │   │   └── ai/route.ts
│   │   ├── reports/
│   │   │   ├── route.ts
│   │   │   ├── pdf/route.ts
│   │   │   └── excel/route.ts
│   │   ├── chat/route.ts
│   │   ├── transcribe/route.ts
│   │   ├── alerts/route.ts
│   │   ├── settings/route.ts
│   │   ├── risk-assessment/route.ts
│   │   └── wedding/
│   │       ├── route.ts
│   │       ├── [id]/route.ts
│   │       ├── vendors/route.ts
│   │       ├── venues/route.ts
│   │       ├── guests/route.ts
│   │       ├── budget/route.ts
│   │       └── [other wedding endpoints]/route.ts
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   └── error/page.tsx
│   ├── dashboard/page.tsx
│   ├── transactions/page.tsx
│   ├── budgets/page.tsx
│   ├── wallets/page.tsx
│   ├── categories/page.tsx
│   ├── goals/page.tsx
│   ├── investments/page.tsx
│   ├── recurring/page.tsx
│   ├── groups/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── insights/page.tsx
│   ├── reports/page.tsx
│   ├── alerts/page.tsx
│   ├── settings/page.tsx
│   ├── risk-assessment/page.tsx
│   ├── wedding-planner/
│   │   ├── page.tsx
│   │   ├── budget/page.tsx
│   │   ├── vendors/page.tsx
│   │   ├── guests/page.tsx
│   │   └── [other sections]/page.tsx
│   ├── chatbot/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # Radix UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── progress.tsx
│   │   └── [other UI components]
│   ├── budget/
│   │   ├── BudgetCard.tsx
│   │   ├── BudgetForm.tsx
│   │   ├── BudgetProgress.tsx
│   │   └── BudgetAlertBadge.tsx
│   ├── transaction/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionFilter.tsx
│   │   └── VoiceInput.tsx
│   ├── dashboard/
│   │   ├── DashboardOverview.tsx
│   │   ├── FinancialSummary.tsx
│   │   ├── RecentTransactions.tsx
│   │   └── BudgetWidget.tsx
│   ├── wallet/
│   │   ├── WalletCard.tsx
│   │   └── WalletForm.tsx
│   ├── goal/
│   │   ├── GoalCard.tsx
│   │   ├── GoalProgress.tsx
│   │   └── GoalForm.tsx
│   ├── charts/
│   │   ├── IncomeExpenseChart.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   └── TrendChart.tsx
│   ├── wedding/
│   │   ├── WeddingDashboard.tsx
│   │   ├── VendorList.tsx
│   │   ├── GuestList.tsx
│   │   └── [other wedding components]
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   ├── prisma.ts                 # Prisma client singleton
│   ├── ai.ts                     # OpenAI integration
│   ├── email.ts                  # Email service (Nodemailer)
│   ├── notifications.ts          # Notification system
│   ├── budgetAlerts.ts           # Budget alert generation
│   ├── budgetCalculations.ts     # Budget math and calculations
│   ├── budgetReset.ts            # Recurring budget reset logic
│   ├── categoryInference.ts      # Smart categorization
│   ├── financial-advice.ts       # AI financial advice generation
│   ├── savingsGoalAutoLink.ts    # Auto-link transactions to goals
│   ├── walletEmergencyFund.ts    # Emergency fund calculations
│   ├── anomaly-detection.ts      # Fraud/anomaly detection
│   ├── voice-recognition.ts      # Web Speech API wrapper
│   ├── export.ts                 # Excel/PDF export utilities
│   ├── import.ts                 # CSV import utilities
│   └── utils.ts                  # General utilities
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── walletSeed.ts
│   ├── transactionSeed.ts
│   └── budgetSeed.ts
├── public/
│   ├── images/
│   └── icons/
├── styles/
│   └── globals.css
├── types/
│   ├── index.ts
│   └── [type definitions]
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Core Features Implementation

### 1. Authentication System

**Requirements:**
- Implement NextAuth.js with Prisma adapter
- Support email/password authentication
- Secure password hashing with bcryptjs
- Session management
- Protected routes and API endpoints
- User registration with email verification (optional)

**Implementation:**
- Configure NextAuth in `lib/auth.ts`
- Create API route at `app/api/auth/[...nextauth]/route.ts`
- Implement signin/signup pages
- Add session provider in root layout
- Create middleware for protected routes

### 2. Multi-Wallet Management

**Features:**
- Create, update, delete wallets
- Support wallet types: Bank, Cash, Card, E-Wallet
- Track balance per wallet
- Set emergency fund targets per wallet
- Wallet activation/deactivation
- Custom icons and colors
- Currency support per wallet

**UI Components:**
- Wallet cards with balance display
- Wallet creation/edit forms
- Wallet selector dropdown
- Wallet overview dashboard

### 3. Transaction Management

**Core Features:**
- Add income and expense transactions
- Associate transactions with wallet and category
- Date selection with React DatePicker
- Transaction notes and descriptions
- Tag support for transactions
- Bulk transaction operations
- Transaction filtering and search
- Link transactions to goals

**Advanced Features:**
- Voice input for transactions using Web Speech API
- Smart categorization using regex patterns
- CSV import functionality
- Excel and PDF export
- Transaction analytics and trends

**API Endpoints:**
```typescript
// GET /api/transactions - List with filters
// POST /api/transactions - Create transaction
// PUT /api/transactions/[id] - Update transaction
// DELETE /api/transactions/[id] - Delete transaction
// POST /api/transactions/import - Import from CSV
// GET /api/transactions/export - Export to Excel/PDF
```

### 4. Category Management

**Features:**
- Default income/expense categories
- Custom user categories
- Category icons and colors
- Category rules for auto-categorization
- Smart category inference
- Category sorting

**Smart Categorization:**
- Regex pattern matching
- Priority-based rule evaluation
- Learning from user patterns
- AI-powered category suggestions

**API Endpoints:**
```typescript
// GET /api/categories - List categories
// POST /api/categories - Create category
// PUT /api/categories/[id] - Update category
// DELETE /api/categories/[id] - Delete category
// POST /api/categories/rules - Create rule
// POST /api/categories/infer - Infer from description
```

### 5. Budget Management

**Core Features:**
- Multiple budget periods (Daily, Weekly, Monthly, Quarterly, Yearly)
- Wallet-specific budgets
- Category-specific budgets
- Recurring budget support
- Budget progress tracking
- 3-tier alert system:
  - Warning at 80%
  - Critical at 100%
  - Exceeded at 120%

**Budget Calculations:**
- Real-time spent calculation
- Progress percentage
- Remaining amount
- Daily/weekly burn rate
- Budget comparison over periods

**Budget Reset Logic:**
- Automatic recurring budget reset
- Historical budget tracking
- Budget rollover options

**UI Components:**
- Budget progress bars
- Budget cards with status indicators
- Budget alert badges
- Budget creation wizard
- Budget analytics dashboard

### 6. Savings Goals

**Features:**
- Create financial goals with target amounts
- Set deadlines for goals
- Track progress automatically
- Auto-link transactions to goals
- Goal categories and priorities
- Goal activity tracking
- Visual progress indicators

**Auto-Linking Logic:**
- Pattern-based matching
- Category-based suggestions
- User confirmation workflow

### 7. Recurring Transactions

**Features:**
- Set up recurring income/expenses
- Frequencies: Daily, Weekly, Monthly, Yearly
- Configurable start/end dates
- Automatic transaction generation
- Recurring transaction management
- Next execution date calculation

**Implementation:**
- Cron job or scheduled task for generation
- Day of week/month/year configuration
- Skip holiday logic (optional)

### 8. AI-Powered Insights

**Features:**
- OpenAI integration for financial advice
- Spending pattern analysis
- Income vs expense trends
- Budget optimization suggestions
- Savings recommendations
- Investment advice (basic)
- Risk assessment

**Insight Types:**
- Standard insights (calculated)
- Smart insights (AI-powered)
- Period-based analysis (weekly, monthly, quarterly, yearly)
- Cached insights (1-hour cache)

**Implementation:**
```typescript
// lib/financial-advice.ts
export async function generateFinancialAdvice(userId: string) {
  // Fetch user financial data
  // Analyze patterns
  // Generate OpenAI prompt
  // Return structured advice
}
```

### 9. Voice Transaction Input

**Features:**
- Voice-to-text transcription
- Parse transaction details from speech
- Support for amount, category, description
- Real-time feedback
- Fallback to manual input

**Implementation:**
- Use Web Speech API
- Create voice recognition wrapper in `lib/voice-recognition.ts`
- Parse natural language: "spent 50000 on groceries"
- Extract: amount, type, category, description
- Confirm before saving

### 10. Finance Chatbot

**Features:**
- AI-powered financial advisor
- Context-aware responses
- Chat history tracking
- Financial data integration
- Markdown formatting for responses

**Implementation:**
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json()
  const session = await getServerSession()

  // Fetch user financial context
  // Build OpenAI prompt with context
  // Generate response
  // Save to chat history
  // Return response
}
```

### 11. Group Expense Splitting

**Features:**
- Create expense groups
- Invite members via unique codes
- Role-based access (Owner, Member)
- Shared transactions
- Expense splitting
- Payment tracking
- Group budgets
- Member activity tracking

**Split Types:**
- Equal split
- Custom amounts
- Percentage-based

**UI Components:**
- Group dashboard
- Member list
- Expense split calculator
- Payment status tracker

### 12. Investment Portfolio

**Features:**
- Track multiple investment types
- Record purchase price and quantity
- Update current prices
- Calculate gains/losses
- Portfolio overview dashboard
- Investment performance charts

**Investment Types:**
- Stocks
- Crypto
- Bonds
- Mutual Funds
- Real Estate

### 13. Wedding Planning Module

**Complete Wedding Management:**

#### Budget Management
- Category-based wedding budgets
- Vendor expense tracking
- Payment status tracking
- Budget vs actual comparison

#### Vendor Management
- Vendor database
- Contact information
- Pricing and contracts
- Payment tracking
- Vendor ratings

#### Guest Management
- Guest list with RSVP tracking
- Guest categories (Family, Friends, Colleagues)
- Plus-one management
- Table assignments
- Contact information

#### Venue Selection
- Venue comparison
- Capacity tracking
- Booking status
- Contact details

#### Timeline Management
- Event schedule (rundown)
- Task assignments
- Duration tracking
- Responsible parties

#### Document Tracking
- Contract management
- Invoice tracking
- Permit tracking
- Due dates
- Completion status

#### Additional Features
- Gift registry and tracking
- Souvenir planning
- Music playlist management
- Moodboard for inspiration

### 14. Data Export & Import

**Export Features:**
- Excel export (XLSX)
- PDF reports with charts
- CSV export
- Date range selection
- Filter-based export

**Import Features:**
- CSV import for transactions
- Field mapping
- Validation and error handling
- Bulk import preview
- Encoding support (iconv-lite)

**Implementation:**
```typescript
// lib/export.ts
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function exportToExcel(transactions) {
  // Create workbook
  // Add data
  // Format cells
  // Return buffer
}

export async function exportToPDF(transactions) {
  // Create PDF
  // Add header
  // Add table with autoTable
  // Add charts
  // Return buffer
}
```

### 15. Dashboard & Analytics

**Dashboard Components:**
- Financial summary cards (Income, Expense, Balance)
- Active budgets with progress
- Recent transactions
- Upcoming recurring transactions
- Goal progress
- Quick actions

**Charts & Visualizations:**
- Income vs Expense line chart
- Category breakdown pie chart
- Monthly trends
- Budget progress bars
- Goal completion percentage

### 16. Alert System

**Alert Types:**
- Budget alerts (80%, 100%, 120%)
- Goal deadline reminders
- Recurring transaction notifications
- Unusual spending alerts
- Low balance warnings

**Notification Channels:**
- In-app notifications
- Email notifications (Nodemailer)
- Toast messages

### 17. Risk Assessment

**Features:**
- Calculate financial risk score
- Analyze spending patterns
- Debt-to-income ratio
- Emergency fund adequacy
- Investment risk profile
- Anomaly detection

### 18. Reports

**Report Types:**
- Monthly financial reports
- Category-wise spending reports
- Budget performance reports
- Goal progress reports
- Tax reports (optional)
- Custom date range reports

**Export Formats:**
- PDF with charts
- Excel spreadsheets
- CSV data

### 19. Settings & Preferences

**User Settings:**
- Profile management
- Password change
- Currency selection
- Language preferences (optional)
- Theme (dark/light mode)
- Notification preferences
- AI provider configuration
- Email preferences

---

## UI/UX Requirements

### Design System

**Color Palette:**
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)
- Neutral: Gray scale

**Typography:**
- Font: System font stack (Tailwind default)
- Headings: Bold, larger sizes
- Body: Regular weight
- Monospace for numbers/currency

**Components:**
- Use Radix UI for accessibility
- Consistent spacing (Tailwind scale)
- Rounded corners (md/lg)
- Shadows for elevation
- Smooth transitions

### Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Optimizations:**
- Touch-friendly buttons (min 44px)
- Simplified navigation
- Swipeable cards
- Bottom navigation
- Collapsible sidebars

### Dark Mode

- Use next-themes for theme switching
- Dark mode compatible colors
- Respect system preferences
- Toggle in settings

### Accessibility

- ARIA labels
- Keyboard navigation
- Focus indicators
- Screen reader support
- Color contrast compliance (WCAG AA)

---

## API Design Patterns

### Standard Response Format

```typescript
// Success Response
{
  success: true,
  data: {...},
  message?: "Operation successful"
}

// Error Response
{
  success: false,
  error: "Error message",
  code?: "ERROR_CODE"
}
```

### Authentication

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Handle request
}
```

### Validation

Use Zod for request validation:

```typescript
import { z } from 'zod'

const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().min(1),
  date: z.string().datetime(),
  walletId: z.string(),
  categoryId: z.string()
})

export async function POST(req: Request) {
  const body = await req.json()
  const validation = transactionSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    )
  }

  // Process valid data
}
```

---

## Key Algorithms & Logic

### 1. Budget Alert Generation

```typescript
// lib/budgetAlerts.ts
export async function checkBudgetAlerts(budgetId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId }
  })

  const percentage = (budget.spent / budget.amount) * 100

  // Check thresholds
  if (percentage >= 120 && budget.alertAt120) {
    await createAlert(budgetId, 'EXCEEDED', 120)
  } else if (percentage >= 100 && budget.alertAt100) {
    await createAlert(budgetId, 'CRITICAL', 100)
  } else if (percentage >= 80 && budget.alertAt80) {
    await createAlert(budgetId, 'WARNING', 80)
  }
}
```

### 2. Smart Categorization

```typescript
// lib/categoryInference.ts
export async function inferCategory(description: string, userId: string) {
  // Get user's category rules
  const rules = await prisma.categoryRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: 'desc' },
    include: { category: true }
  })

  // Match against patterns
  for (const rule of rules) {
    const regex = new RegExp(rule.pattern, 'i')
    if (regex.test(description)) {
      return rule.category
    }
  }

  // Fallback to AI inference
  return await aiInferCategory(description)
}
```

### 3. Recurring Budget Reset

```typescript
// lib/budgetReset.ts
export async function resetRecurringBudgets() {
  const now = new Date()

  const budgets = await prisma.budget.findMany({
    where: {
      isRecurring: true,
      endDate: { lte: now }
    }
  })

  for (const budget of budgets) {
    // Save to history
    await prisma.budgetHistory.create({
      data: {
        budgetId: budget.id,
        amount: budget.amount,
        spent: budget.spent,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate
      }
    })

    // Calculate new dates
    const { startDate, endDate } = calculateNextPeriod(
      budget.period,
      budget.endDate
    )

    // Reset budget
    await prisma.budget.update({
      where: { id: budget.id },
      data: {
        spent: 0,
        startDate,
        endDate
      }
    })
  }
}
```

### 4. Auto-Link Transactions to Goals

```typescript
// lib/savingsGoalAutoLink.ts
export async function autoLinkToGoal(transaction: Transaction) {
  if (transaction.type !== 'INCOME') return

  // Find matching goals
  const goals = await prisma.goal.findMany({
    where: {
      userId: transaction.userId,
      status: 'ONGOING',
      categoryId: transaction.categoryId
    }
  })

  if (goals.length === 1) {
    // Auto-link if single match
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { goalId: goals[0].id }
    })

    // Update goal progress
    await updateGoalProgress(goals[0].id)
  } else if (goals.length > 1) {
    // Suggest to user
    return goals
  }
}
```

### 5. Emergency Fund Calculation

```typescript
// lib/walletEmergencyFund.ts
export async function calculateEmergencyFund(userId: string) {
  // Get last 3 months average expenses
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const expenses = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: threeMonthsAgo }
    },
    _sum: { amount: true }
  })

  const monthlyExpense = (expenses._sum.amount || 0) / 3
  const targetMonths = 6
  const targetAmount = monthlyExpense * targetMonths

  // Get current savings
  const wallets = await prisma.wallet.findMany({
    where: { userId }
  })

  const currentAmount = wallets.reduce((sum, w) => sum + w.balance, 0)

  return {
    targetAmount,
    currentAmount,
    monthlyExpense,
    targetMonths,
    progress: (currentAmount / targetAmount) * 100
  }
}
```

### 6. Anomaly Detection

```typescript
// lib/anomaly-detection.ts
export async function detectAnomalies(userId: string) {
  // Get average spending per category
  const avgSpending = await calculateAverageSpending(userId)

  // Get recent transactions
  const recentTx = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: last30Days }
    }
  })

  const anomalies = []

  for (const tx of recentTx) {
    const avg = avgSpending[tx.categoryId]
    const deviation = Math.abs(tx.amount - avg) / avg

    // Flag if 3x standard deviation
    if (deviation > 3) {
      anomalies.push({
        transaction: tx,
        expectedAmount: avg,
        deviation
      })
    }
  }

  return anomalies
}
```

### 7. Financial Advice Generation

```typescript
// lib/financial-advice.ts
import { OpenAI } from 'openai'

export async function generateAdvice(userId: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Gather financial context
  const context = await gatherFinancialContext(userId)

  const prompt = `
    You are a financial advisor. Analyze this data and provide 3-5 actionable recommendations:

    Monthly Income: ${context.income}
    Monthly Expenses: ${context.expenses}
    Savings Rate: ${context.savingsRate}%
    Active Budgets: ${context.budgets}
    Financial Goals: ${context.goals}
    Recent Spending Patterns: ${context.patterns}

    Provide advice on: savings, budgeting, spending optimization, and goal achievement.
    Format as JSON array with: title, description, type, priority, impact, timeframe
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  const advice = JSON.parse(response.choices[0].message.content)

  // Save to database
  for (const item of advice.recommendations) {
    await prisma.financialAdvice.create({
      data: {
        userId,
        ...item
      }
    })
  }

  return advice
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI (for AI features)
OPENAI_API_KEY="sk-..."

# Email (Nodemailer)
EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
EMAIL_FROM="noreply@budtrack.com"

# Brevo (optional email provider)
BREVO_API_KEY="your-brevo-api-key"

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL="your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

---

## Seeding Data

### Default Categories

```typescript
// prisma/seed.ts
const defaultCategories = [
  // Expense categories
  { name: 'Food & Dining', type: 'EXPENSE', icon: '🍔', color: '#F59E0B' },
  { name: 'Transportation', type: 'EXPENSE', icon: '🚗', color: '#3B82F6' },
  { name: 'Shopping', type: 'EXPENSE', icon: '🛍️', color: '#EC4899' },
  { name: 'Entertainment', type: 'EXPENSE', icon: '🎬', color: '#8B5CF6' },
  { name: 'Bills & Utilities', type: 'EXPENSE', icon: '💡', color: '#EF4444' },
  { name: 'Healthcare', type: 'EXPENSE', icon: '🏥', color: '#10B981' },
  { name: 'Education', type: 'EXPENSE', icon: '📚', color: '#6366F1' },
  { name: 'Personal', type: 'EXPENSE', icon: '👤', color: '#14B8A6' },
  { name: 'Housing', type: 'EXPENSE', icon: '🏠', color: '#F97316' },
  { name: 'Insurance', type: 'EXPENSE', icon: '🛡️', color: '#06B6D4' },

  // Income categories
  { name: 'Salary', type: 'INCOME', icon: '💼', color: '#10B981' },
  { name: 'Business', type: 'INCOME', icon: '🏢', color: '#3B82F6' },
  { name: 'Investments', type: 'INCOME', icon: '📈', color: '#8B5CF6' },
  { name: 'Freelance', type: 'INCOME', icon: '💻', color: '#EC4899' },
  { name: 'Gifts', type: 'INCOME', icon: '🎁', color: '#F59E0B' },
  { name: 'Other Income', type: 'INCOME', icon: '💵', color: '#14B8A6' }
]
```

---

## Testing Strategy

### Unit Tests
- Test utility functions
- Test calculation logic
- Test data transformations

### Integration Tests
- Test API endpoints
- Test database operations
- Test external service integrations

### E2E Tests (optional)
- Test user flows
- Test critical paths
- Test authentication

---

## Performance Optimizations

1. **Database Indexing:**
   - Index on userId, walletId, categoryId
   - Composite indexes for common queries
   - Index on date fields

2. **Caching:**
   - Cache insights for 1 hour
   - Cache dashboard data
   - Use Redis for session storage (optional)

3. **Pagination:**
   - Implement cursor-based pagination
   - Limit default results to 50-100

4. **Image Optimization:**
   - Use Next.js Image component
   - Optimize icons and assets

5. **Code Splitting:**
   - Dynamic imports for large components
   - Lazy load charts and heavy components

---

## Security Considerations

1. **Authentication:**
   - Secure password hashing (bcryptjs)
   - Session-based auth with NextAuth
   - CSRF protection

2. **API Security:**
   - Validate all inputs (Zod)
   - Rate limiting on endpoints
   - SQL injection prevention (Prisma)

3. **Data Privacy:**
   - User data isolation
   - Proper authorization checks
   - Sensitive data encryption

4. **XSS Prevention:**
   - Sanitize user inputs
   - Use React's built-in XSS protection
   - Sanitize markdown content

---

## Deployment Checklist

- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up email service
- [ ] Configure OpenAI API
- [ ] Set up rate limiting
- [ ] Configure domain and SSL
- [ ] Set up monitoring and logging
- [ ] Run database migrations
- [ ] Seed initial data
- [ ] Test all features
- [ ] Set up backup system
- [ ] Configure CORS if needed
- [ ] Set up CDN for assets
- [ ] Enable production optimizations

---

## Additional Notes

### Internationalization (Optional)
- Use next-intl or similar
- Support multiple languages
- RTL support for Arabic/Hebrew

### PWA Features (Optional)
- Service worker for offline support
- Install prompt
- Push notifications

### Advanced Features (Optional)
- Multi-user accounts (family plans)
- Data sync across devices
- Bank account integration (Plaid/similar)
- Receipt scanning (OCR)
- Tax calculation and reporting
- Debt management module
- Net worth tracking

---

## Success Criteria

The project should:
1. ✅ Allow users to track income and expenses across multiple wallets
2. ✅ Provide smart categorization and budgeting
3. ✅ Generate AI-powered financial insights
4. ✅ Support voice input for transactions
5. ✅ Enable group expense splitting
6. ✅ Offer comprehensive wedding planning tools
7. ✅ Export data in multiple formats
8. ✅ Be fully responsive and accessible
9. ✅ Provide real-time budget alerts
10. ✅ Track financial goals and investments

---

## Getting Started

1. Initialize Next.js project with TypeScript
2. Install all dependencies from package.json
3. Set up Prisma with SQLite
4. Create database schema
5. Implement authentication with NextAuth
6. Build core features iteratively
7. Add AI and voice features
8. Implement wedding planning module
9. Add charts and visualizations
10. Test thoroughly and deploy

---

**Note:** This is a comprehensive application. Start with core features (auth, wallets, transactions, categories, budgets) before moving to advanced features (AI, voice, wedding planning).
