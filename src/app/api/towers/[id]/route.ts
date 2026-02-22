import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tower = await prisma.tower.findUnique({
      where: { id },
      include: { tracks: true },
    })
    if (!tower) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Tower not found' } }, { status: 404 })
    return NextResponse.json({ data: tower })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch tower' } }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const tower = await prisma.tower.update({
      where: { id },
      data: { name: body.name, description: body.description },
    })
    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'tower', resourceId: id })
    return NextResponse.json({ data: tower })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update tower' } }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 })
    }
    const { id } = await params
    await prisma.tower.delete({ where: { id } })
    await writeAudit({ userId: session.id, action: 'DELETE', resource: 'tower', resourceId: id })
    return NextResponse.json({ data: { deleted: true } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete tower' } }, { status: 500 })
  }
}
