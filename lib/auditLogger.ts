import prisma from "@/lib/prisma";

type AuditActionType = "CREATE" | "UPDATE" | "SUBMIT" | "APPROVE" | "REJECT" | "DELETE";

export async function logSystemAction(
  userId: string,
  action: AuditActionType,
  entity: string,
  entityId: string,
  details: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details,
      },
    });
  } catch (error) {
    console.error("Critical error recording audit log:", error);
  }
}