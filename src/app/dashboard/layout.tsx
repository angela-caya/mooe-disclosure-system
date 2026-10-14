import Sidebar from './Sidebar'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch active session to determine user role
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Extract the role, defaulting to DISBURSING_OFFICER if undefined
  const userRole = (session.user as any)?.role || 'DISBURSING_OFFICER'

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Pass the userRole to the Sidebar component */}
      <Sidebar userRole={userRole} />

      {/* Main Content Area on the right */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">MOOE Disclosure System</h1>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}