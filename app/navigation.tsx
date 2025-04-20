import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  FiHome, 
  FiDollarSign, 
  FiCreditCard, 
  FiPieChart, 
  FiTarget, 
  FiSettings,
  FiUsers,
  FiCalendar,
  FiBriefcase,
  FiAlertTriangle,
  FiHeart
} from 'react-icons/fi'

const MainNav = () => {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: FiHome },
    { href: '/transactions', label: 'Transactions', icon: FiDollarSign },
    { href: '/wedding-planner', label: 'Wedding Planner', icon: FiHeart },
    { href: '/categories', label: 'Categories', icon: FiPieChart },
    { href: '/wallets', label: 'Wallets', icon: FiCreditCard },
    { href: '/budgets', label: 'Budgets', icon: FiTarget },
    { href: '/recurring', label: 'Recurring', icon: FiCalendar },
    { href: '/insights', label: 'Insights', icon: FiPieChart },
    { href: '/groups', label: 'Groups', icon: FiUsers },
    { href: '/investments', label: 'Investments', icon: FiBriefcase },
    { href: '/alerts', label: 'Alerts', icon: FiAlertTriangle },
    { href: '/settings', label: 'Settings', icon: FiSettings },
  ]

  return (
    <nav className="flex gap-2 lg:gap-5 md:gap-3 flex-wrap">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            href={item.href}
            key={item.href}
            className={cn(
              'flex items-center text-sm md:text-base font-medium transition-colors hover:text-primary',
              pathname === item.href
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4 mr-1" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default MainNav 