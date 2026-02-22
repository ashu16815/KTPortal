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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['ADMIN'])
    const { id } = await params
    const body = await request.json()
    const tower = await prisma.tower.update({
      where: { id },
      data: { name: body.name, description: body.description },
    })
    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'tower', resourceId: id })
    return NextResponse.json({ data: { ...tower, createdAt: tower.createdAt.toISOString(), updatedAt: tower.updatedAt.toISOString() } })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['ADMIN'])
    const { id } = await params
    await prisma.tower.delete({ where: { id } })
    await writeAudit({ userId: session.id, action: 'DELETE', resource: 'tower', resourceId: id })
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}
