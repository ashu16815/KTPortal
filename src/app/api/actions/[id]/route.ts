import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()

    const action = await prisma.action.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
        ...(body.status === 'DONE' ? { resolvedAt: new Date() } : {}),
        ...(body.ownerId ? { ownerId: body.ownerId } : {}),
      },
      include: {
        owner: { select: { name: true } },
        tower: { select: { name: true } },
      },
    })

    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'action', resourceId: id, details: { status: body.status } })

    return NextResponse.json({
      data: {
        ...action,
        ownerName: action.owner.name,
        towerName: action.tower.name,
        dueDate: action.dueDate?.toISOString(),
        resolvedAt: action.resolvedAt?.toISOString(),
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
        owner: undefined,
        tower: undefined,
      }
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update action' } }, { status: 500 })
  }
}
