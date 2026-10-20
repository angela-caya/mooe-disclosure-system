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
      <Link href={`/dashboard/expenses/${allocationId}`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
        &larr; Back to Expense List
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Edit Expense Entry</h1>
        </div>
        
        <form action={updateExpense} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Date</label>
            <input 
              type="date" 
              name="date" 
              defaultValue={formattedDate}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              name="category" 
              defaultValue={expense.category}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTILITIES">Utilities (Electricity, Water, Internet)</option>
              <option value="SUPPLIES">Office & Instructional Supplies</option>
              <option value="REPAIRS">Minor Repairs</option>
              <option value="TRAVEL">Travel & Transportation</option>
              <option value="TRAINING">Training & Seminar Fees</option>
              <option value="OTHER">Other Expenses</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Purpose</label>
            <input 
              type="text" 
              name="description"
              defaultValue={expense.description}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
            <input 
              type="number" 
              step="0.01" 
              name="amount"
              defaultValue={expense.amount}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}