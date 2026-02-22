import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const towerId = searchParams.get('towerId')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status
    if (towerId) where.towerId = towerId

    const raidds = await prisma.raiddLog.findMany({
      where,
      include: { tower: { select: { id: true, name: true } } },
      orderBy: [{ type: 'asc' }, { impact: 'asc' }, { createdAt: 'desc' }],
    })

    const data = raidds.map(r => ({
      id: r.id,
      towerId: r.towerId,
      towerName: r.tower?.name,
      type: r.type,
      title: r.title,
      description: r.description,
      impact: r.impact,
      probability: r.probability,
      status: r.status,
      owner: r.owner,
      raisedBy: r.raisedBy,
      dueDate: r.dueDate?.toISOString(),
      closedAt: r.closedAt?.toISOString(),
      mitigation: r.mitigation,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to load RAIDD log' } }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { towerId, type, title, description, impact, probability, status, owner, raisedBy, dueDate, mitigation, notes } = body

    if (!type || !title) {
      return NextResponse.json({ error: { code: 'VALIDATION', message: 'type and title are required' } }, { status: 400 })
    }

    const record = await prisma.raiddLog.create({
      data: {
        towerId: towerId ?? null,
        type,
        title,
        description: description ?? null,
        impact: impact ?? 'MEDIUM',
        probability: probability ?? null,
        status: status ?? 'OPEN',
        owner: owner ?? null,
        raisedBy: raisedBy ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        mitigation: mitigation ?? null,
        notes: notes ?? null,
      },
      include: { tower: { select: { id: true, name: true } } },
    })

    return NextResponse.json({
      data: {
        ...record,
        towerName: record.tower?.name,
        dueDate: record.dueDate?.toISOString(),
        closedAt: record.closedAt?.toISOString(),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create RAIDD entry' } }, { status: 500 })
  }
}
