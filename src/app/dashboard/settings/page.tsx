import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import SettingsClient from "@/src/components/SettingsClient"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'PRINCIPAL')) {
    redirect('/dashboard')
  }

  const signatories = await prisma.signatory.findMany({
    orderBy: { createdAt: 'asc' }
  })

  // SERVER-SIDE SECURITY & RELIABILITY: Update Signatory (IDOR & Transaction Protection)
  async function updateSignatory(formData: FormData) {
    'use server'
    
    // Re-authenticate inside the Server Action (IDOR protection)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PRINCIPAL') {
      throw new Error("Unauthorized: Only Principals can modify system settings.")
    }
    const currentUserId = session.user.id

    const id = formData.get("id") as string
    const name = formData.get("name") as string
    const position = formData.get("position") as string
    const box = formData.get("box") as string
    const isActive = formData.get("isActive") === "true"

    // Execute database operations within a transaction to ensure all-or-nothing execution
    await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.signatory.update({
          where: { id },
          data: { name, position, box, isActive }
        })
      } else {
        await tx.signatory.create({
          data: { name, position, box, isActive }
        })
      }

      // Direct audit log creation within the transaction to guarantee consistency
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: "UPDATE",
          entity: "System Settings",
          entityId: id || box,
          details: `Updated official signatory for Box ${box}: ${name}`
        }
      })
    })

    revalidatePath('/dashboard/settings')
  }

  return (
    <SettingsClient 
      signatories={signatories} 
      updateSignatory={updateSignatory} 
    />
  )
}