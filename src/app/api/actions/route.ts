import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const towerId = searchParams.get('towerId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const actions = await prisma.action.findMany({
      where: {
        ...(towerId ? { towerId } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
      include: {
        owner: { select: { name: true, email: true } },
        tower: { select: { name: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    })

    type ActionRow = (typeof actions)[number]
    const mapped = actions.map((a: ActionRow) => ({
      ...a,
      ownerName: a.owner.name,
      towerName: a.tower.name,
      dueDate: a.dueDate?.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      owner: undefined,
      tower: undefined,
    }))

    return NextResponse.json({ data: mapped })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch actions' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const action = await prisma.action.create({
      data: {
        towerId: body.towerId,
        ownerId: body.ownerId ?? session.id,
        title: body.title,
        description: body.description,
        status: body.status ?? 'OPEN',
        priority: body.priority ?? 'MEDIUM',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
      include: {
        owner: { select: { name: true } },
        tower: { select: { name: true } },
      },
    })

    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'action', resourceId: action.id, details: { title: body.title } })

    return NextResponse.json({
      data: {
        ...action,
        ownerName: action.owner.name,
        towerName: action.tower.name,
        dueDate: action.dueDate?.toISOString(),
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
        owner: undefined,
        tower: undefined,
      }
    }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create action' } }, { status: 500 })
  }
}
