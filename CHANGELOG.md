# Changelog

All notable changes to BudTrack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-21

### 🎉 Initial Release

BudTrack v1.0.0 is the first official release of our comprehensive personal and collaborative financial management platform.

### ✨ Features

#### Core Financial Management
- **Multi-Wallet Support** - Manage multiple bank accounts, cash wallets, cards, and e-wallets
- **Transaction Tracking** - Record and categorize income and expenses with detailed notes
- **Smart Categorization** - AI-powered automatic transaction categorization using regex patterns
- **Category Rules** - Define custom rules for automatic categorization
- **Recurring Transactions** - Set up automated recurring income and expenses
- **Emergency Fund Tracking** - Per-wallet and global emergency fund targets
- **Transaction Import/Export** - CSV import and Excel/PDF export capabilities

#### Budget Management
- **Flexible Budget Periods** - Daily, weekly, monthly, quarterly, and yearly budgets
- **Multi-Wallet & Category Budgets** - Create budgets for specific wallets and categories
- **3-Tier Alert System** - Warnings at 80%, critical at 100%, exceeded at 120%
- **Budget History** - Track budget performance over time
- **Recurring Budgets** - Automatically resetting budgets
- **Real-time Progress Tracking** - Visual progress bars and percentage indicators

#### Financial Insights & Analytics
- **AI-Powered Insights** - Intelligent financial recommendations using OpenAI
- **Pattern Analysis** - Identify spending patterns and trends
- **Period-Based Reports** - Weekly, monthly, quarterly, and yearly analysis
- **Income vs Expense Charts** - Visual comparison and balance tracking
- **Category Breakdown** - Pie charts and detailed category analytics
- **Risk Assessment** - Financial risk profile evaluation
- **Anomaly Detection** - Identify unusual transactions and spending patterns

#### Goals & Investments
- **Savings Goals** - Create and track financial goals with deadlines
- **Auto-Goal Linking** - Automatically link transactions to relevant goals
- **Goal Progress Tracking** - Visual progress indicators and activity logs
- **Investment Portfolio** - Track stocks, crypto, bonds, mutual funds, and real estate
- **Portfolio Performance** - Monitor investment gains and losses

#### AI & Voice Features
- **Finance Chatbot** - AI-powered financial advisor for personalized guidance
- **Voice Transaction Input** - Hands-free transaction entry using Web Speech API
- **Real-time Transcription** - Convert speech to text for quick entry
- **Chat History** - Review past conversations with the financial advisor
- **Smart Insights Mode** - Toggle between standard and AI-powered insights

#### Collaborative Features
- **Shared Wallets** - Create group wallets for shared expenses
- **Expense Splitting** - Split bills among group members (equal or custom)
- **Payment Tracking** - Track who has paid their share
- **Group Budgets** - Create and manage shared budgets
- **Role-Based Access** - Owner and member roles with different permissions
- **Group Invitations** - Invite members via unique codes

#### Wedding Planning Module
- **Complete Wedding Management** - Dedicated planning suite for weddings
- **Budget Tracking** - Category-based wedding budgets with vendor tracking
- **Vendor Management** - Contact info, pricing, and payment tracking
- **Guest Management** - RSVP tracking, seating arrangements, and contact management
- **Venue Selection** - Compare venues, track capacity and booking status
- **Timeline Management** - Event schedule with task assignments and duration tracking
- **Document Tracking** - Manage contracts, invoices, and important documents
- **Gift Registry** - Track wedding gifts and donors
- **Souvenir Planning** - Plan and budget for wedding favors
- **Playlist Management** - Curate wedding music by ceremony moments
- **Moodboard Creation** - Collect inspiration and design references

#### User Experience
- **Responsive Design** - Fully optimized for mobile, tablet, and desktop
- **Dark Mode** - Toggle between light and dark themes
- **Multi-Currency Support** - Support for different currencies
- **Email Notifications** - Get notified about budget alerts and important events
- **Toast Notifications** - Real-time feedback for all actions
- **Drag & Drop** - Intuitive drag and drop functionality
- **Advanced Filtering** - Filter transactions by type, category, date, amount, and search

#### Data Management
- **CSV Import** - Import transactions from spreadsheets with field mapping
- **Excel Export** - Export data to XLSX format with formatting
- **PDF Reports** - Generate professional financial reports with charts
- **Bulk Operations** - Select and manage multiple transactions at once
- **Data Validation** - Comprehensive input validation using Zod
- **Backup/Restore** - PowerShell scripts for database and project backup

### 🛠️ Technical Highlights

#### Tech Stack
- **Frontend:** Next.js 14.2.0, React 18, TypeScript 5
- **Styling:** Tailwind CSS 3.3, Radix UI components
- **Database:** SQLite with Prisma 5.22.0 ORM
- **Authentication:** NextAuth.js 4.24.5 with bcryptjs
- **Charts:** Chart.js 4.4.8 and Recharts 2.15
- **AI:** OpenAI 4.26 integration
- **Email:** Nodemailer with Brevo API support
- **Voice:** Web Speech API integration
- **Data Processing:** XLSX, jsPDF, CSV Parse

#### Database Models
- 30+ Prisma models including:
  - Core: User, Wallet, Transaction, Category, Budget, Goal
  - Advanced: RecurringTransaction, Investment, Group, GroupMember
  - AI: ChatMessage, FinancialAdvice, CategoryRule
  - Alerts: BudgetAlert, BudgetHistory
  - Wedding: Wedding, Vendor, Guest, Venue, Document, Rundown, Souvenir, Gift, Playlist, Moodboard
  - Emergency Fund: EmergencyFund, WalletEmergencyFund

#### API Architecture
- 35+ RESTful API endpoints
- Comprehensive error handling
- Input validation with Zod
- Session-based authentication
- Rate limiting ready

### 🔒 Security
- Secure password hashing with bcryptjs
- Session-based authentication via NextAuth
- CSRF protection
- SQL injection prevention via Prisma
- Input sanitization and validation
- XSS prevention

### 📚 Documentation
- Comprehensive README with full feature list
- Project recreation prompt (1,806 lines)
- Project rebuild guide (1,502 lines)
- API endpoint documentation
- Database schema documentation
- Installation and setup guides
- Deployment guidelines

### 🐛 Bug Fixes
- Fixed per-wallet emergency fund target calculations
- Improved mobile UI/UX for transactions page
- Fixed wallet-based emergency fund calculations
- Various performance improvements

### 💾 Database & Migration
- Complete Prisma schema with all relationships
- Seeding scripts for categories, wallets, transactions, and budgets
- Backup and restore PowerShell scripts
- Project migration utilities

### 📦 Dependencies
- Total: 75 production dependencies
- 13 development dependencies
- All security vulnerabilities addressed
- Latest stable versions used

### 🎯 Known Limitations
- SQLite database (file-based, suitable for personal/small team use)
- Email notifications require SMTP configuration
- AI features require OpenAI API key
- Voice input requires modern browser support

### 📋 Requirements
- Node.js 18 or higher
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Optional: SMTP server for email notifications
- Optional: OpenAI API key for AI features

### 🚀 Installation

```bash
# Clone repository
git clone https://github.com/iqbalarief96/budtrack.git
cd budtrack

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npx prisma generate
npx prisma db push

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

### 🔄 Upgrade Notes
This is the initial release. No upgrade path needed.

### 🙏 Acknowledgments
- Built with Next.js
- UI components from Radix UI
- Icons from Lucide
- Charts powered by Chart.js and Recharts
- AI features powered by OpenAI

### 📄 License
MIT License

---

## Future Releases

See [PROJECT_REBUILD_PROMPT.md](PROJECT_REBUILD_PROMPT.md) for planned improvements and upcoming features.

[1.0.0]: https://github.com/iqbalarief96/budtrack/releases/tag/v1.0.0
