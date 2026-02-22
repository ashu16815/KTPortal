import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, canWriteTower } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

function authError(msg: string, status: number) {
  return NextResponse.json({ error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: msg } }, { status })
}

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const towerId = searchParams.get('towerId')

    const statuses = status ? status.split(',') : undefined

    const raidds = await prisma.raiddLog.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(towerId ? { towerId } : {}),
      },
      include: { tower: { select: { name: true } } },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      data: raidds.map(r => ({
        ...r,
        towerName: r.tower?.name,
        dueDate: r.dueDate?.toISOString(),
        closedAt: r.closedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        tower: undefined,
      })),
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load RAIDD log' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    if (!body.title || !body.type) {
      return NextResponse.json({ error: { code: 'VALIDATION', message: 'title and type are required' } }, { status: 400 })
    }

    // Exec is read-only
    if (session.role === 'EXEC') return authError('Exec users have read-only access', 403)

    // Tower leads can only create RAIDD for their own tower
    if (body.towerId && !canWriteTower(session, body.towerId)) {
      return authError('You can only create RAIDD items for your own tower', 403)
    }

    const entry = await prisma.raiddLog.create({
      data: {
        towerId: body.towerId || undefined,
        type: body.type,
        title: body.title,
        description: body.description,
        impact: body.impact ?? 'MEDIUM',
        probability: body.probability,
        status: body.status ?? 'OPEN',
        owner: body.owner,
        raisedBy: body.raisedBy ?? session.name,
        mitigation: body.mitigation,
        notes: body.notes,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
      include: { tower: { select: { name: true } } },
    })

    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'raidd', resourceId: entry.id, details: { type: body.type, title: body.title, towerId: body.towerId } })

    return NextResponse.json({
      data: {
        ...entry,
        towerName: entry.tower?.name,
        dueDate: entry.dueDate?.toISOString(),
        closedAt: entry.closedAt?.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        tower: undefined,
      }
    }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') return authError('Login required', 401)
    if (err instanceof Error && err.message === 'FORBIDDEN') return authError('Access denied', 403)
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create RAIDD entry' } }, { status: 500 })
  }
}
