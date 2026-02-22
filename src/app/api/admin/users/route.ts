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
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { tower: { select: { name: true } } },
    })
    type UserRow = (typeof users)[number]
    return NextResponse.json({ data: users.map((u: UserRow) => ({ ...u, createdAt: u.createdAt.toISOString(), towerName: u.tower?.name })) })
  } catch (err) {
    const authResponse = handleAuthError(err)
    if (authResponse) return authResponse
    console.error('[admin/users]', err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN'])
    const body = await request.json()
    const user = await prisma.user.create({
      data: { email: body.email, name: body.name, role: body.role, org: body.org, towerId: body.towerId || undefined },
    })
    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'user', resourceId: user.id })
    return NextResponse.json({ data: { ...user, createdAt: user.createdAt.toISOString() } }, { status: 201 })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create user' } }, { status: 500 })
  }
}
