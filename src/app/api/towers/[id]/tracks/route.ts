import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tracks = await prisma.track.findMany({ where: { towerId: id }, orderBy: { name: 'asc' } })
    return NextResponse.json({ data: tracks })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch tracks' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const track = await prisma.track.create({
      data: { towerId: id, name: body.name, description: body.description },
    })
    await writeAudit({ userId: session.id, action: 'CREATE', resource: 'track', resourceId: track.id })
    return NextResponse.json({ data: track }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create track' } }, { status: 500 })
  }
}
