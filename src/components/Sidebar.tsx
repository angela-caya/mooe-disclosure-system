"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userName: string;
  userRole: string;
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  const disbursingLinks = [
    { name: "Dashboard Overview", href: "/dashboard", icon: "📊" },
    { name: "Budget & Expenses", href: "/dashboard/expenses", icon: "💸" },
  ];

  const principalLinks = [
    { name: "Approval Dashboard", href: "/dashboard/principal", icon: "✅" },
    { name: "AIP Settings", href: "/dashboard/principal/settings", icon: "⚙️" },
    { name: "System Audit Logs", href: "/dashboard/principal/logs", icon: "📜" },
  ];

  const navLinks = userRole === "PRINCIPAL" ? principalLinks : disbursingLinks;

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col min-h-screen shadow-xl print:hidden">
      <div className="h-20 flex items-center justify-center border-b border-blue-800">
        <h2 className="text-xl font-black tracking-wider text-white">
          MOOE<span className="text-yellow-400"> PORTAL</span>
        </h2>
      </div>

      <div className="p-6 border-b border-blue-800">
        <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold mb-1">Logged in as</p>
        <p className="font-bold truncate">{userName}</p>
        <span className="inline-block mt-2 px-2 py-1 bg-blue-800 text-xs rounded-md border border-blue-700">
          {userRole.replace("_", " ")}
        </span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-blue-800 text-white border-l-4 border-yellow-400 font-bold"
                  : "text-blue-100 hover:bg-blue-800/50 hover:text-white font-medium"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}