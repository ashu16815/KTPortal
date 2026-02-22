import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canWriteTower } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

function authError(msg: string, status: number) {
  return NextResponse.json({ error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: msg } }, { status })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()

    if (session.role === 'EXEC') return authError('Exec users have read-only access', 403)

    const existing = await prisma.raiddLog.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'RAIDD entry not found' } }, { status: 404 })

    if (!canWriteTower(session, existing.towerId)) {
      return authError('You can only update RAIDD items for your own tower', 403)
    }

    const updated = await prisma.raiddLog.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.mitigation !== undefined && { mitigation: body.mitigation }),
        ...(body.owner !== undefined && { owner: body.owner }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.impact !== undefined && { impact: body.impact }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...((body.status === 'CLOSED' && !existing.closedAt) && { closedAt: new Date() }),
      },
      include: { tower: { select: { name: true } } },
    })

    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'raidd', resourceId: id, details: { status: body.status, towerId: existing.towerId } })

    return NextResponse.json({
      data: {
        ...updated,
        towerName: updated.tower?.name,
        dueDate: updated.dueDate?.toISOString(),
        closedAt: updated.closedAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        tower: undefined,
      }
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return authError('Access denied', 403)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update RAIDD entry' } }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const existing = await prisma.raiddLog.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'RAIDD entry not found' } }, { status: 404 })

    // Only admin can delete, or tower lead for their own tower
    if (!canWriteTower(session, existing.towerId) || session.role === 'EXEC') {
      return authError('Insufficient permissions to delete this entry', 403)
    }

    await prisma.raiddLog.delete({ where: { id } })
    await writeAudit({ userId: session.id, action: 'DELETE', resource: 'raidd', resourceId: id, details: { title: existing.title, towerId: existing.towerId } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return authError('Access denied', 403)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete RAIDD entry' } }, { status: 500 })
  }
}
