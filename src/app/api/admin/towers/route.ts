import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

function handleAuthError(err: unknown) {
  if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
  }
  if (err instanceof Error && err.message === 'FORBIDDEN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
  }
  return null
}

export async function GET() {
  try {
    await requireRole(['ADMIN'])
    const towers = await prisma.tower.findMany({
      orderBy: { name: 'asc' },
      include: { tracks: true, _count: { select: { users: true, submissions: true } } },
    })
    type TowerRow = (typeof towers)[number]
    return NextResponse.json({ data: towers.map((t: TowerRow) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })) })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN'])
    const body = await request.json()
    const tower = await prisma.tower.create({ data: { name: body.name, description: body.description } })
    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'tower', resourceId: tower.id })
    return NextResponse.json({ data: { ...tower, createdAt: tower.createdAt.toISOString(), updatedAt: tower.updatedAt.toISOString() } }, { status: 201 })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}
