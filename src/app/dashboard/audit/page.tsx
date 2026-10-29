import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string, search?: string }>
}) {
  const session = await getServerSession(authOptions)
  
  if (!session || (session.user.role !== 'PRINCIPAL')) {
    redirect('/dashboard')
  }

  // Implement search and filter functions for faster log retrieval (ISO 25010: Performance Efficiency 2.2)
  const resolvedParams = await searchParams
  const currentPage = Math.max(1, parseInt(resolvedParams.page || "1", 10))
  const searchQuery = resolvedParams.search || ""
  const itemsPerPage = 50

  const whereClause = searchQuery ? {
    OR: [
      { details: { contains: searchQuery, mode: 'insensitive' as const } },
      { entity: { contains: searchQuery, mode: 'insensitive' as const } },
      { user: { name: { contains: searchQuery, mode: 'insensitive' as const } } }
    ]
  } : {}

  const [logs, totalLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      include: {
        user: {
          select: { name: true, email: true, role: true }
        }
      }
    }),
    prisma.auditLog.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(totalLogs / itemsPerPage)

  const getBadgeStyle = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'LOGIN':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'UPDATE':
      case 'SUBMIT':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'APPROVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'REJECT':
      case 'DELETE':
      case 'LOGOUT':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatEntityName = (entity: string) => {
    return entity.replace(/([A-Z])/g, ' $1').trim()
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Audit Logs</h2>
          <p className="text-sm text-gray-600 mt-1">Immutable ledger of all financial and administrative actions.</p>
        </div>
        
        {/* Search Bar for optimal log retrieval */}
        <form className="w-full sm:w-auto" method="GET" action="/dashboard/audit">
          <div className="relative">
            <input 
              type="text" 
              name="search" 
              defaultValue={searchQuery}
              placeholder="Search logs..." 
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-lg">Activity Ledger</h3>
          <span className="text-xs text-gray-500 font-medium">Displaying {logs.length} of {totalLogs} records</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 bg-white uppercase tracking-wide">
                <th className="px-6 py-4 font-bold">Timestamp</th>
                <th className="px-6 py-4 font-bold">Action</th>
                <th className="px-6 py-4 font-bold">Target Module</th>
                <th className="px-6 py-4 font-bold">Activity Details</th>
                <th className="px-6 py-4 font-bold">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery ? "No matching records found." : "No system activities recorded yet."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {log.createdAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span 
                        className="text-sm font-semibold text-gray-900 cursor-help border-b border-dashed border-gray-300"
                        title={log.entityId ? `Database ID: ${log.entityId}` : "No ID tied to this action"}
                      >
                        {formatEntityName(log.entity)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.details}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">
                        {log.user?.name || log.user?.email || "System"}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                        {log.user?.role ? log.user.role.replace("_", " ") : ""}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link href={`/dashboard/audit?page=${currentPage - 1}${searchQuery ? `&search=${searchQuery}` : ''}`} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                  Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={`/dashboard/audit?page=${currentPage + 1}${searchQuery ? `&search=${searchQuery}` : ''}`} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}