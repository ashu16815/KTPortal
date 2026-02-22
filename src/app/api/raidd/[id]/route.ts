import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, mitigation, notes, closedAt, owner, dueDate } = body

    const updated = await prisma.raiddLog.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(mitigation !== undefined && { mitigation }),
        ...(notes !== undefined && { notes }),
        ...(owner !== undefined && { owner }),
        ...(closedAt !== undefined && { closedAt: closedAt ? new Date(closedAt) : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status === 'CLOSED' && !closedAt && { closedAt: new Date() }),
      },
      include: { tower: { select: { name: true } } },
    })

    return NextResponse.json({
      data: {
        ...updated,
        towerName: updated.tower?.name,
        dueDate: updated.dueDate?.toISOString(),
        closedAt: updated.closedAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update RAIDD entry' } }, { status: 500 })
  }
}
