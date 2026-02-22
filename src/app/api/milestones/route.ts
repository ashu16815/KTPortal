import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load milestones' } }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, actualDate, notes } = body

    if (!id) return NextResponse.json({ error: { code: 'VALIDATION', message: 'id required' } }, { status: 400 })

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(actualDate !== undefined && { actualDate: actualDate ? new Date(actualDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(status === 'COMPLETE' && !actualDate && { actualDate: new Date() }),
      },
      include: { tower: { select: { name: true } } },
    })

    return NextResponse.json({
      data: { ...updated, towerName: updated.tower.name, plannedDate: updated.plannedDate.toISOString(), actualDate: updated.actualDate?.toISOString() },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update milestone' } }, { status: 500 })
  }
}
