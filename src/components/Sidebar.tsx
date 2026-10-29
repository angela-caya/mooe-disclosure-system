"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps {
  userName: string
  userRole: string
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { title: "Dashboard Overview", href: "/dashboard", icon: "📊", roles: ["PRINCIPAL", "DISBURSING_OFFICER", "SYSTEM_ADMIN"] },
    { title: "Manage Expenses", href: "/dashboard/expenses", icon: "💸", roles: ["DISBURSING_OFFICER", "PRINCIPAL", "SYSTEM_ADMIN"] },
    { title: "AIP / APP", href: "/dashboard/aip", icon: "📊", roles: ["SYSTEM_ADMIN", "PRINCIPAL", "DISBURSING_OFFICER"] },
    { title: "Budget Adjustments", href: "/dashboard/adjustments", icon: "🔄", roles: ["SYSTEM_ADMIN", "PRINCIPAL", "DISBURSING_OFFICER"] },
    { title: "Approval Inbox", href: "/dashboard/approvals", icon: "⚖️", roles: ["PRINCIPAL"] },
    // Binalik ang User Management
    { title: "User Management", href: "/dashboard/users", icon: "👥", roles: ["PRINCIPAL", "SYSTEM_ADMIN"] },
    { title: "Audit Logs", href: "/dashboard/audit", icon: "📜", roles: ["PRINCIPAL", "SYSTEM_ADMIN"] },
    { title: "Settings", href: "/dashboard/settings", icon: "⚙️", roles: ["PRINCIPAL", "SYSTEM_ADMIN"] }
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 bg-blue-900 text-white h-screen sticky top-0 shadow-xl">
      <div className="p-4 sm:p-6 border-b border-blue-800 flex items-center gap-3">
        <div className="w-9 sm:w-10 aspect-square rounded-full flex items-center justify-center overflow-hidden bg-white/20 backdrop-blur-sm shadow-sm shrink-0">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain m-auto p-1" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-base sm:text-lg font-bold tracking-tight leading-tight">MOOE Portal</h2>
          <p className="text-blue-300 text-[10px] mt-0.5">Biñan City SHS - West</p>
        </div>
      </div>

      <div className="px-4 py-6 flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 px-2">Main Menu</div>
        
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
          const isActive = item.href === "/dashboard" 
            ? pathname === "/dashboard" 
            : pathname.startsWith(item.href)

          return (
            <Link 
              key={item.href} 
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-800 text-white shadow-inner" 
                  : "text-blue-100 hover:bg-blue-800/50 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.title}
            </Link>
          )
        })}

        <div className="mt-8">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 px-2">Public Links</div>
          <Link href="/" target="_blank" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-800/50 hover:text-white transition-colors">
            <span className="text-lg">🌐</span> Transparency Board
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-blue-800 bg-blue-950/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-sm">
            {userName.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{userName}</p>
            <p className="text-[10px] text-blue-300 uppercase tracking-wider">{userRole.replace("_", " ")}</p>
          </div>
        </div>
        <Link href="/api/auth/signout" className="block w-full text-center bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded transition-colors">
          Sign Out
        </Link>
      </div>
    </aside>
  )
}