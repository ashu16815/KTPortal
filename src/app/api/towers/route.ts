import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function GET() {
  try {
    const towers = await prisma.tower.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { tracks: true, users: true } } },
    })
    return NextResponse.json({ data: towers })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch towers' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 })
    }
    const body = await request.json()
    const tower = await prisma.tower.create({
      data: { name: body.name, description: body.description },
    })
    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'tower', resourceId: tower.id, details: { name: tower.name } })
    return NextResponse.json({ data: tower }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create tower' } }, { status: 500 })
  }
}
