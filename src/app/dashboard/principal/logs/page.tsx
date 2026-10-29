// import prisma from "@/lib/prisma";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../../../api/auth/[...nextauth]/route";
// import { redirect } from "next/navigation";
// import Link from "next/link";

// export const dynamic = "force-dynamic";

// export default async function AuditLogsPage() {
//   const session = await getServerSession(authOptions);
  
//   if (!session || session.user.role !== "PRINCIPAL") {
//     redirect('/dashboard');
//   }

//   // Retrieve the system ledger ordered by the most recent transactions
//   const logs = await prisma.auditLog.findMany({
//     include: {
//       user: {
//         select: { name: true, email: true, role: true }
//       }
//     },
//     orderBy: { createdAt: 'desc' },
//     take: 100 // Limit to recent entries for optimal performance
//   });

//   // Helper function to apply visual severity to action types
//   const getActionBadge = (action: string) => {
//     switch (action) {
//       case 'APPROVE': return 'bg-green-100 text-green-800 border-green-200';
//       case 'SUBMIT': return 'bg-blue-100 text-blue-800 border-blue-200';
//       case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
//       case 'CREATE': return 'bg-purple-100 text-purple-800 border-purple-200';
//       default: return 'bg-gray-100 text-gray-800 border-gray-200';
//     }
//   };

//   return (
//     <div className="p-4 md:p-8 max-w-6xl mx-auto">
//       <div className="mb-6">
//         {/* UX: Added back link for better navigation flow */}
//         <Link 
//           href="/dashboard/principal" 
//           className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline mb-2 inline-flex items-center transition-colors cursor-pointer"
//         >
//           &larr; Back to Dashboard
//         </Link>
//         <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Audit Logs</h1>
//         <p className="text-gray-600 mt-1 text-sm">Immutable record of system transactions and user activities.</p>
//       </div>

//       {/* UX: Added shadow transition to the main container */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
//                 <th className="px-6 py-4 font-semibold">Timestamp</th>
//                 <th className="px-6 py-4 font-semibold">User</th>
//                 <th className="px-6 py-4 font-semibold">Action</th>
//                 <th className="px-6 py-4 font-semibold">Target Entity</th>
//                 <th className="px-6 py-4 font-semibold">Details</th>
//               </tr>
//             </thead>
//             <tbody className="text-sm">
//               {logs.length === 0 ? (
//                 <tr>
//                   <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
//                     <span className="text-3xl mb-2 block">📋</span>
//                     No system activity recorded yet.
//                   </td>
//                 </tr>
//               ) : (
//                 logs.map((log) => (
//                   <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
//                     <td className="px-6 py-4 text-gray-600 whitespace-nowrap align-top">
//                       {log.createdAt.toLocaleString()}
//                     </td>
//                     <td className="px-6 py-4 align-top">
//                       <div className="font-semibold text-gray-900">{log.user?.name || log.user?.email}</div>
//                       <div className="text-xs text-gray-500 mt-0.5">{log.user?.role.replace("_", " ")}</div>
//                     </td>
//                     <td className="px-6 py-4 align-top">
//                       <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${getActionBadge(log.action)}`}>
//                         {log.action}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 font-semibold text-gray-700 align-top">
//                       {log.entity}
//                     </td>
//                     <td className="px-6 py-4 text-gray-700 align-top">
//                       {log.details}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }