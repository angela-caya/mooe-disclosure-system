import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import Sidebar from "@/src/components/Sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        userName={session.user.name || "User"} 
        userRole={session.user.role} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Shows only on small screens) */}
        <header className="md:hidden bg-blue-900 text-white p-4 flex justify-between items-center shadow-md">
          <h1 className="font-bold">MOOE Portal</h1>
          <a href="/api/auth/signout" className="text-xs bg-blue-800 px-3 py-1.5 rounded font-medium">Sign Out</a>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}