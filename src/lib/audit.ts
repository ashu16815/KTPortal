import { prisma } from './prisma'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN'
export type AuditResource = 'tower' | 'track' | 'submission' | 'action' | 'user' | 'weights' | 'artefact' | 'decision' | 'auth'

export async function writeAudit(params: {
  userId?: string
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : undefined,
      },
    })
  } catch (err) {
    // Audit failures should not break the main operation
    console.error('Audit write failed:', err)
  }
}
