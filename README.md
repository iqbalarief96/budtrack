# BudTrack

A comprehensive personal and collaborative financial management platform built with Next.js, featuring AI-powered insights, voice input, and specialized planning tools.

[![Next.js](https://img.shields.io/badge/Next.js-14.2.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Database Management](#database-management)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Development](#development)
- [Contributing](#contributing)

## Features

### Core Financial Management

- **Multi-Wallet Support** - Manage multiple bank accounts, cash wallets, and payment methods simultaneously
- **Smart Transaction Tracking** - Record income and expenses with automatic categorization
- **AI-Powered Categorization** - Intelligent transaction categorization using pattern matching and machine learning
- **Category Rules** - Define custom rules for automatic transaction categorization
- **Recurring Transactions** - Set up and automate recurring income and expenses
- **Emergency Fund Tracking** - Set and track emergency fund targets per wallet

### Budget Management

- **Flexible Budget Periods** - Create budgets for daily, weekly, monthly, quarterly, or yearly periods
- **Multi-Wallet & Category Budgets** - Assign budgets to specific wallets and categories
- **Smart Alert System** - 3-tier alerts (Warning at 80%, Critical at 100%, Exceeded at 120%)
- **Budget History** - Track budget performance over time
- **Recurring Budgets** - Automatically resetting budgets for ongoing financial planning
- **Visual Progress** - Real-time progress bars and percentage indicators

### Financial Insights & Analytics

- **AI-Powered Insights** - Get intelligent financial recommendations powered by OpenAI
- **Pattern Analysis** - Identify spending patterns and trends
- **Period-Based Reports** - Analyze your finances by week, month, quarter, or year
- **Income vs Expense Analysis** - Visualize your financial balance
- **Risk Assessment** - Evaluate your financial risk profile
- **Anomaly Detection** - Identify unusual transactions and spending patterns

### Goals & Investments

- **Savings Goals** - Set and track financial goals with progress monitoring
- **Auto-Goal Linking** - Automatically link transactions to relevant goals
- **Investment Portfolio** - Track your investment holdings and performance
- **Goal Categories** - Organize goals by type and priority
- **Activity Tracking** - Monitor all contributions and withdrawals from goals

### Voice & AI Features

- **Voice Transaction Input** - Speak your transactions using Web Speech API
- **Finance Chatbot** - AI-powered financial advisor for personalized guidance
- **Real-time Transcription** - Convert speech to text for hands-free entry
- **Chat History** - Review past conversations with the financial advisor

### Collaborative Features

- **Shared Wallets** - Create group wallets for shared expenses
- **Expense Splitting** - Split bills among group members
- **Payment Tracking** - Track who has paid their share
- **Group Budgets** - Create and manage shared budgets
- **Role-Based Access** - Member and owner roles with different permissions
- **Group Invitations** - Invite members via unique codes

### Wedding Planning Module

Complete wedding planning suite including:
- **Wedding Budget Management** - Dedicated budgeting with category breakdown
- **Vendor Management** - Track vendors with contact info and pricing
- **Guest Management** - RSVP tracking and seating arrangements
- **Venue Selection** - Compare and book venues
- **Timeline Management** - Event schedule with task assignments
- **Document Tracking** - Manage contracts and important documents
- **Gift Registry** - Track wedding gifts and donors
- **Playlist Management** - Curate your wedding music
- **Moodboard Creation** - Collect inspiration and design references
- **Souvenir Planning** - Plan and budget for wedding favors

### Data Management & Export

- **CSV Import** - Import transactions from spreadsheets
- **Excel Export** - Export data to XLSX format
- **PDF Reports** - Generate professional financial reports
- **Bulk Operations** - Select and manage multiple transactions at once
- **Advanced Filtering** - Filter by type, category, date range, and amount

### User Experience

- **Mobile Responsive** - Fully responsive design for all devices
- **Dark Mode Support** - Toggle between light and dark themes
- **Multi-Currency** - Support for different currencies
- **Email Notifications** - Get notified about important financial events
- **Customizable Dashboard** - Personalize your financial overview
- **Toast Notifications** - Real-time feedback for all actions

## Tech Stack

### Frontend
- **Next.js 14.2.0** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Chart.js & Recharts** - Data visualization
- **Lucide React** - Modern icon library
- **React DatePicker** - Date input components
- **@dnd-kit** - Drag and drop functionality

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma 5.22.0** - Type-safe ORM
- **SQLite** - Embedded database
- **NextAuth.js** - Authentication solution
- **Bcryptjs** - Password hashing

### AI & External Services
- **OpenAI API** - AI-powered insights and chatbot
- **Web Speech API** - Voice recognition
- **Nodemailer** - Email notifications
- **Brevo API** - Email service provider

### Data Processing
- **XLSX** - Excel file handling
- **jsPDF** - PDF generation
- **CSV Parse** - CSV file parsing
- **Zod** - Schema validation

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **ts-node** - TypeScript execution for scripts

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/budtrack.git
   cd budtrack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # OpenAI (optional, for AI features)
   OPENAI_API_KEY="your-openai-api-key"

   # Email (optional, for notifications)
   EMAIL_SERVER="smtp://username:password@smtp.example.com:587"
   EMAIL_FROM="noreply@budtrack.com"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the database (optional)**
   ```bash
   # Seed categories
   npm run seed

   # Seed wallets (optional)
   npx ts-node prisma/walletSeed.ts

   # Seed transactions (optional)
   npx ts-node prisma/transactionSeed.ts

   # Seed budgets (optional)
   npx ts-node prisma/budgetSeed.ts
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. Create an account at `/auth/signin`
2. Set up your first wallet in `/wallets`
3. Add income and expense categories in `/categories`
4. Start tracking transactions in `/transactions`
5. Create your first budget in `/budgets`

## Database Management

### Backup and Restore

BudTrack provides PowerShell scripts for database and project backup/restore operations.

#### Backup Options

##### 1. Database Backup Only
Create a backup of just the database:
```powershell
.\backup.ps1
```
Creates: `backups/dev.db.backup_YYYYMMDD_HHMMSS.sqlite`

##### 2. Full Project Backup
Backup the entire project (code + database):
```powershell
.\backup-project.ps1
```
Creates: `project-backups/budtrack_backup_YYYYMMDD_HHMMSS.zip`

Excludes: `node_modules`, `.next`, `.git`, `backups`, `project-backups`

##### 3. Interactive Backup Menu
Choose backup type via interactive menu:
```powershell
.\backup-all.ps1
```

**Options:**
1. Backup database only
2. Backup project only
3. Backup both separately

**Command-line parameters:**
```powershell
# Database only
.\backup-all.ps1 -DatabaseOnly

# Project only
.\backup-all.ps1 -ProjectOnly

# Set max backups to keep
.\backup-all.ps1 -MaxBackups 20
```

#### Restore Operations

##### Interactive Restore Menu
```powershell
.\restore.ps1
```

**Options:**
1. Restore database only
2. Restore full project
3. Restore both separately

**Command-line parameters:**
```powershell
# Restore database only
.\restore.ps1 -DatabaseOnly

# Restore project only
.\restore.ps1 -ProjectOnly

# Restore specific backup file
.\restore.ps1 -BackupFile "path\to\backup.zip"
.\restore.ps1 -DatabaseBackupFile "path\to\backup.sqlite"
```

**Safety Features:**
- Automatic backup before restore
- Confirmation prompts
- Rollback capability

### Migrating to Another Computer

1. Create full project backup:
   ```powershell
   .\backup-project.ps1
   ```

2. Transfer the backup file from `project-backups/` to the new computer

3. Extract the backup file

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the application:
   ```bash
   npm run dev
   ```

## Project Structure

```
budtrack/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (35+ endpoints)
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── transactions/         # Transaction CRUD
│   │   ├── budgets/              # Budget management
│   │   ├── wallets/              # Wallet operations
│   │   ├── categories/           # Category management
│   │   ├── goals/                # Savings goals
│   │   ├── groups/               # Group expense splitting
│   │   ├── insights/             # Financial insights
│   │   ├── reports/              # Report generation
│   │   ├── chat/                 # AI chatbot
│   │   └── wedding/              # Wedding planning
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main dashboard
│   ├── transactions/             # Transaction pages
│   ├── budgets/                  # Budget pages
│   ├── wallets/                  # Wallet management
│   ├── categories/               # Category organization
│   ├── goals/                    # Goal tracking
│   ├── investments/              # Investment portfolio
│   ├── recurring/                # Recurring transactions
│   ├── groups/                   # Group management
│   ├── insights/                 # Financial insights
│   ├── reports/                  # Report pages
│   ├── alerts/                   # Alert center
│   ├── settings/                 # User settings
│   ├── risk-assessment/          # Risk evaluation
│   ├── wedding-planner/          # Wedding planning
│   ├── chatbot/                  # Finance chatbot
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── ui/                       # Reusable UI components
│   ├── budget/                   # Budget-specific components
│   └── ...                       # Feature-specific components
├── lib/                          # Utility functions
│   ├── ai.ts                     # OpenAI integration
│   ├── auth.ts                   # NextAuth configuration
│   ├── email.ts                  # Email service
│   ├── notifications.ts          # Notification system
│   ├── budgetAlerts.ts           # Budget alert logic
│   ├── budgetCalculations.ts     # Budget math
│   ├── categoryInference.ts      # Smart categorization
│   ├── financial-advice.ts       # AI advice generation
│   ├── anomaly-detection.ts      # Fraud detection
│   └── voice-recognition.ts      # Speech recognition
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Category seeding
│   ├── walletSeed.ts             # Wallet seeding
│   ├── transactionSeed.ts        # Transaction seeding
│   └── budgetSeed.ts             # Budget seeding
├── public/                       # Static assets
├── backup.ps1                    # Database backup script
├── backup-project.ps1            # Project backup script
├── backup-all.ps1                # Combined backup script
├── restore.ps1                   # Restore script
└── package.json                  # Dependencies
```

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/import` - Import from CSV
- `GET /api/transactions/export` - Export to Excel/PDF

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/alerts` - Get budget alerts

### Wallets
- `GET /api/wallets` - List wallets
- `POST /api/wallets` - Create wallet
- `PUT /api/wallets/:id` - Update wallet
- `DELETE /api/wallets/:id` - Delete wallet

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `POST /api/categories/rules` - Create category rule
- `POST /api/categories/infer` - Infer category from description

### Goals
- `GET /api/goals` - List goals
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/:id/link` - Link transaction to goal

### Insights
- `GET /api/insights` - Get financial insights
- `POST /api/insights/ai` - Get AI-powered advice

### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `POST /api/groups/:id/invite` - Invite member
- `POST /api/groups/:id/transactions` - Create shared transaction

### AI Features
- `POST /api/chat` - Chat with financial advisor
- `POST /api/transcribe` - Transcribe voice input

### Wedding Planning
- `GET /api/wedding` - Get wedding details
- `POST /api/wedding/vendors` - Manage vendors
- `POST /api/wedding/guests` - Manage guests
- `POST /api/wedding/budget` - Manage wedding budget

## Development

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npm run seed
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite database path | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Authentication secret | Yes |
| `OPENAI_API_KEY` | OpenAI API key | No* |
| `EMAIL_SERVER` | SMTP server URL | No* |
| `EMAIL_FROM` | Sender email address | No* |
| `BREVO_API_KEY` | Brevo API key | No* |

\* Required for specific features (AI insights, email notifications)

### Database Schema

The application uses Prisma with SQLite and includes the following main models:

- **User** - User accounts and authentication
- **Wallet** - Financial accounts and wallets
- **Transaction** - Income and expense records
- **Category** - Transaction categories
- **Budget** - Budget tracking
- **Goal** - Savings goals
- **Investment** - Investment portfolio
- **RecurringTransaction** - Automated transactions
- **Group** - Shared expense groups
- **GroupTransaction** - Shared transactions
- **BudgetAlert** - Budget notifications
- **CategoryRule** - Auto-categorization rules
- **FinancialAdvice** - AI-generated advice
- **ChatMessage** - Chatbot conversations
- **Wedding** - Wedding planning data

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting (recommended)
- Functional components with React hooks
- Server components by default (Next.js App Router)

### Testing

```bash
# Run tests (when available)
npm test

# Run tests in watch mode
npm test -- --watch
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- Charts powered by [Chart.js](https://www.chartjs.org/) and [Recharts](https://recharts.org/)
- AI features powered by [OpenAI](https://openai.com/)

## Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Contact: [your-email@example.com]

---

Made with ❤️ by the BudTrack team
