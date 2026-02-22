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
    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'user', resourceId: user.id, details: { email: body.email, role: body.role } })
    return NextResponse.json({ data: { ...user, createdAt: user.createdAt.toISOString() } }, { status: 201 })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create user' } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN'])
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: { code: 'VALIDATION', message: 'id required' } }, { status: 400 })

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.org !== undefined && { org: updates.org }),
        ...(updates.towerId !== undefined && { towerId: updates.towerId || null }),
      },
    })
    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'user', resourceId: id, details: updates })
    return NextResponse.json({ data: { ...user, createdAt: user.createdAt.toISOString() } })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update user' } }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN'])
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: { code: 'VALIDATION', message: 'id query param required' } }, { status: 400 })
    if (id === session.id) return NextResponse.json({ error: { code: 'VALIDATION', message: 'Cannot delete your own account' } }, { status: 400 })

    await prisma.user.delete({ where: { id } })
    await writeAudit({ userId: session.id, action: 'DELETE', resource: 'user', resourceId: id })
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete user' } }, { status: 500 })
  }
}
