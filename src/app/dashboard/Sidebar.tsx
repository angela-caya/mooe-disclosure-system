'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

// Accept userRole as a prop from the layout
export default function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  // Define menu items with permitted roles
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', allowed: ['PRINCIPAL', 'DISBURSING_OFFICER'] },
    { name: 'Budget & Expenses', path: '/dashboard/expenses', icon: '💰', allowed: ['PRINCIPAL', 'DISBURSING_OFFICER'] },
    { name: 'Liquidation Reports', path: '/dashboard/reports', icon: '📄', allowed: ['PRINCIPAL', 'DISBURSING_OFFICER'] },
    { name: 'User Management', path: '/dashboard/users', icon: '👥', allowed: ['PRINCIPAL'] }, // Admin only
  ]

  // Filter the menu to only show items allowed for the current user's role
  const visibleMenus = menuItems.filter(item => item.allowed.includes(userRole))

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-blue-700">MOOE Portal</h2>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {visibleMenus.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <LogoutButton />
      </div>
    </div>
  )
}