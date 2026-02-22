import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canWriteTower } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

function authError(msg: string, status: number) {
  return NextResponse.json({ error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: msg } }, { status })
}

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const { searchParams } = new URL(req.url)
    const towerId = searchParams.get('towerId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (towerId) where.towerId = towerId
    if (status) where.status = status

    const milestones = await prisma.milestone.findMany({
      where,
      include: { tower: { select: { id: true, name: true, groupId: true } } },
      orderBy: [{ plannedDate: 'asc' }],
    })

    const data = milestones.map(m => ({
      id: m.id,
      towerId: m.towerId,
      towerName: m.tower.name,
      name: m.name,
      phase: m.phase,
      plannedDate: m.plannedDate.toISOString(),
      actualDate: m.actualDate?.toISOString(),
      status: m.status,
      notes: m.notes,
    }))

    return NextResponse.json({ data })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load milestones' } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()

    if (session.role === 'EXEC') return authError('Exec users have read-only access', 403)
    if (!body.towerId || !body.name || !body.phase || !body.plannedDate) {
      return NextResponse.json({ error: { code: 'VALIDATION', message: 'towerId, name, phase and plannedDate are required' } }, { status: 400 })
    }
    if (!canWriteTower(session, body.towerId)) {
      return authError('You can only create milestones for your own tower', 403)
    }

    const milestone = await prisma.milestone.create({
      data: {
        towerId: body.towerId,
        name: body.name,
        phase: body.phase,
        plannedDate: new Date(body.plannedDate),
        status: body.status ?? 'PENDING',
        notes: body.notes,
      },
      include: { tower: { select: { name: true } } },
    })

    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'milestone', resourceId: milestone.id, details: { name: body.name, towerId: body.towerId } })

    return NextResponse.json({
      data: { ...milestone, towerName: milestone.tower.name, plannedDate: milestone.plannedDate.toISOString(), actualDate: milestone.actualDate?.toISOString(), createdAt: milestone.createdAt.toISOString(), updatedAt: milestone.updatedAt.toISOString(), tower: undefined },
    }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return authError('Access denied', 403)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create milestone' } }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const { id, status, actualDate, notes, name, phase, plannedDate } = body

    if (!id) return NextResponse.json({ error: { code: 'VALIDATION', message: 'id required' } }, { status: 400 })
    if (session.role === 'EXEC') return authError('Exec users have read-only access', 403)

    const existing = await prisma.milestone.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Milestone not found' } }, { status: 404 })

    if (!canWriteTower(session, existing.towerId)) {
      return authError('You can only update milestones for your own tower', 403)
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phase !== undefined && { phase }),
        ...(plannedDate !== undefined && { plannedDate: new Date(plannedDate) }),
        ...(status !== undefined && { status }),
        ...(actualDate !== undefined && { actualDate: actualDate ? new Date(actualDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(status === 'COMPLETE' && !actualDate && { actualDate: new Date() }),
      },
      include: { tower: { select: { name: true } } },
    })

    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'milestone', resourceId: id, details: { status, towerId: existing.towerId } })

    return NextResponse.json({
      data: { ...updated, towerName: updated.tower.name, plannedDate: updated.plannedDate.toISOString(), actualDate: updated.actualDate?.toISOString(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), tower: undefined },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return authError('Access denied', 403)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update milestone' } }, { status: 500 })
  }
}
