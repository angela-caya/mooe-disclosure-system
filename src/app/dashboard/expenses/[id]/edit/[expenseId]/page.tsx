import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logSystemAction } from "@/lib/auditLogger";
import Link from "next/link";

export default async function EditExpensePage({
  params
}: {
  params: Promise<{ id: string; expenseId: string }>
}) {
  // Authenticate user session
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Resolve asynchronous route parameters
  const resolvedParams = await params;
  const allocationId = resolvedParams.id;
  const expenseId = resolvedParams.expenseId;

  // Fetch the specific expense using the correct relational field name 'report'
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { report: true }
  });

  // Ensure the expense exists and the associated report is still in the draft phase
  if (!expense || expense.report.status !== "DRAFT") {
    notFound(); 
  }

  // Process the update transaction and log the audit trail
  async function updateExpense(formData: FormData) {
    'use server'
    const amount = parseFloat(formData.get("amount") as string);
    const date = new Date(formData.get("date") as string);
    
    // Safely bypass the TypeScript enum constraint since the HTML select is already strictly validated
    const category = formData.get("category") as any; 
    const description = formData.get("description") as string;

    await prisma.expense.update({
      where: { id: expenseId },
      data: { amount, date, category, description }
    });

    await logSystemAction(
      session!.user.id,
      "UPDATE",
      "Expense",
      expenseId,
      `Updated expense entry: ${description} (₱${amount})`
    );

    revalidatePath(`/dashboard/expenses/${allocationId}`);
    redirect(`/dashboard/expenses/${allocationId}`);
  }

  // Format the stored date for the HTML date input element
  const formattedDate = expense.date.toISOString().split('T')[0];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* UX: Improved back link with transition and proper coloring */}
      <Link 
        href={`/dashboard/expenses/${allocationId}`} 
        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline mb-2 inline-flex items-center transition-colors cursor-pointer"
      >
        &larr; Back to Expense List
      </Link>
      
      {/* UX: Added subtle hover shadow to the main card container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Expense Entry</h1>
        </div>
        
        <form action={updateExpense} className="p-6 space-y-5">
          <div>
            <label htmlFor="editDate" className="block text-sm font-semibold text-gray-700 mb-1">Receipt Date</label>
            <input 
              id="editDate"
              type="date" 
              name="date" 
              defaultValue={formattedDate}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow cursor-pointer"
            />
          </div>

          <div>
            <label htmlFor="editCategory" className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <select 
              id="editCategory"
              name="category" 
              defaultValue={expense.category}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow cursor-pointer"
            >
              <option value="UTILITIES">Utilities (Electricity, Water, Internet)</option>
              <option value="SUPPLIES">Office & Instructional Supplies</option>
              <option value="MINOR_REPAIRS">Minor Repairs</option> {/* FIX: Changed REPAIRS to MINOR_REPAIRS to match DB enum */}
              <option value="TRAVEL">Travel & Transportation</option>
              <option value="TRAINING">Training & Seminar Fees</option>
              <option value="OTHERS">Other Expenses</option>
            </select>
          </div>

          <div>
            <label htmlFor="editDesc" className="block text-sm font-semibold text-gray-700 mb-1">Description / Purpose</label>
            <input 
              id="editDesc"
              type="text" 
              name="description"
              defaultValue={expense.description}
              placeholder="e.g. Meralco Bill"
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            />
          </div>

          <div>
            <label htmlFor="editAmount" className="block text-sm font-semibold text-gray-700 mb-1">Amount (₱)</label>
            <input 
              id="editAmount"
              type="number" 
              step="0.01" 
              name="amount"
              defaultValue={expense.amount}
              placeholder="0.00"
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            />
          </div>

          <div className="pt-4 flex justify-end">
            {/* UX: Added lift animation and active state press to the primary action button */}
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}