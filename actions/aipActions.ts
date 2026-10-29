'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route"
import { logSystemAction } from "@/lib/auditLogger"

export async function saveBudgetLine(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const userId = session.user.id

  const lineId = formData.get("lineId") as string | null
  const selectedYear = parseInt(formData.get("year") as string, 10) // Retrieved from hidden input
  const category = formData.get("category") as any
  const description = formData.get("description") as string
  const remarks = formData.get("remarks") as string
  const plannedAmount = parseFloat(formData.get("plannedAmount") as string)

  let plan = await prisma.aIPPlan.findUnique({ where: { year: selectedYear } })

  if (!plan) {
    plan = await prisma.aIPPlan.create({ data: { year: selectedYear, status: "DRAFT" } })
    await logSystemAction(userId, "CREATE", `AIP Plan (${selectedYear})`, plan.id, `Initialized AIP for Fiscal Year ${selectedYear}`)
  }

  let budgetLine;
  if (lineId) {
    budgetLine = await prisma.aIPBudgetLine.update({
      where: { id: lineId },
      data: { category, description, remarks, plannedAmount }
    })
    await logSystemAction(userId, "UPDATE", `AIP Category (${selectedYear})`, lineId, `Updated ${category.replace("_", " ")} budget to ₱${plannedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  } else {
    budgetLine = await prisma.aIPBudgetLine.create({
      data: { aipPlanId: plan.id, category, description, remarks, plannedAmount }
    })
    await logSystemAction(userId, "CREATE", `AIP Category (${selectedYear})`, budgetLine.id, `Added ${category.replace("_", " ")} budget amounting to ₱${plannedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  }

  // Sync 1/12 allocations for all 12 months
  const monthlyAmount = plannedAmount / 12
  for (let m = 1; m <= 12; m++) {
    await prisma.monthlyBudgetLine.upsert({
      where: { aipBudgetLineId_month_year: { aipBudgetLineId: budgetLine.id, month: m, year: selectedYear } },
      update: { plannedAmount: monthlyAmount },
      create: { aipBudgetLineId: budgetLine.id, month: m, year: selectedYear, plannedAmount: monthlyAmount }
    })
  }

  revalidatePath(`/dashboard/aip`)
}

export async function deleteBudgetLine(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const lineId = formData.get("lineId") as string
  const selectedYear = formData.get("year") as string // Retrieved from hidden input
  
  await prisma.aIPBudgetLine.delete({ where: { id: lineId } })
  await logSystemAction(session.user.id, "DELETE", `AIP Category (${selectedYear})`, lineId, `Deleted a category budget allocation`)
  
  revalidatePath(`/dashboard/aip`)
}

export async function approveAIP(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!["SYSTEM_ADMIN", "PRINCIPAL"].includes(session.user.role)) {
    throw new Error("You are not authorized to approve this AIP.");
  }

  const year = Number(formData.get("year"));

  const plan = await prisma.aIPPlan.findUnique({
    where: { year },
    include: { budgetLines: true },
  });

  if (!plan || plan.budgetLines.length === 0) {
    throw new Error("Add at least one budget line before approval.");
  }

  await prisma.aIPPlan.update({
    where: { year },
    data: { status: "APPROVED" },
  });

  await logSystemAction(
    session.user.id,
    "APPROVE",
    "AIP Plan",
    plan.id,
    `Approved AIP for Fiscal Year ${year}`
  );

  revalidatePath("/dashboard/aip");
  revalidatePath("/dashboard/expenses");
}