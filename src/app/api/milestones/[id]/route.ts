import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canWriteTower } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

function authError(msg: string, status: number) {
  return NextResponse.json({ error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: msg } }, { status })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const existing = await prisma.milestone.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Milestone not found' } }, { status: 404 })

    if (session.role === 'EXEC' || !canWriteTower(session, existing.towerId)) {
      return authError('Insufficient permissions to delete this milestone', 403)
    }

    await prisma.milestone.delete({ where: { id } })
    await writeAudit({ userId: session.id, action: 'DELETE', resource: 'milestone', resourceId: id, details: { name: existing.name, towerId: existing.towerId } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return authError('Access denied', 403)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete milestone' } }, { status: 500 })
  }
}
