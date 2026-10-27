import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PRINCIPAL' && session.user.role !== 'DISBURSING_OFFICER') {
    redirect('/login');
  }

  // Fetch all signatories, ordered by position and active status
  const signatories = await prisma.signatory.findMany({
    orderBy: [
      { position: 'asc' },
      { isActive: 'desc' },
      { name: 'asc' }
    ]
  });

  // Server Action: Magdagdag ng bagong signatory
  async function addSignatory(formData: FormData) {
    'use server'
    const name = formData.get("name") as string;
    const position = formData.get("position") as string;

    if (name && position) {
      await prisma.signatory.create({
        data: { name, position, isActive: true }
      });
      revalidatePath("/dashboard/settings");
    }
  }

  // Server Action: I-toggle ang Active/Inactive status
  async function toggleSignatoryStatus(formData: FormData) {
    'use server'
    const id = formData.get("id") as string;
    const currentStatus = formData.get("isActive") === "true";

    if (id) {
      await prisma.signatory.update({
        where: { id },
        data: { isActive: !currentStatus }
      });
      revalidatePath("/dashboard/settings");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">System Settings</h1>
        <p className="text-gray-600 mt-1 text-sm">Manage dynamic configurations, agency profile, and report signatories.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form para mag-add ng Signatory */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Signatory</h2>
            <form action={addSignatory} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name (with Title)</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  placeholder="e.g. JUAN DELA CRUZ, CPA" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                />
              </div>
              
              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position / Designation</label>
                <input 
                  type="text" 
                  id="position" 
                  name="position" 
                  placeholder="e.g. Principal II, Officer-in-Charge, ASDS, SDS, Accountant" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-all hover:-translate-y-0.5"
              >
                Save Signatory
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Listahan ng Signatories */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Signatory Master List</h2>
            </div>
            
            <div className="p-0 overflow-x-auto">
              {signatories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No signatories configured yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-600 bg-white">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Position</th>
                      <th className="px-6 py-3 font-medium text-center">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signatories.map((sig) => (
                      <tr key={sig.id} className={`border-b border-gray-100 transition-colors ${!sig.isActive ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                        <td className={`px-6 py-4 font-bold ${!sig.isActive ? 'text-gray-400' : 'text-gray-900'}`}>
                          {sig.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="px-2.5 py-1 bg-gray-200 rounded-md font-semibold text-xs text-gray-700">
                            {sig.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            sig.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sig.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {sig.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <form action={toggleSignatoryStatus}>
                            <input type="hidden" name="id" value={sig.id} />
                            <input type="hidden" name="isActive" value={sig.isActive.toString()} />
                            <button 
                              type="submit" 
                              className={`text-sm font-semibold hover:underline ${
                                sig.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                              }`}
                            >
                              {sig.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}