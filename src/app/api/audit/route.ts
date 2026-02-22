import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count(),
    ])

    type AuditLogRow = (typeof logs)[number]
    return NextResponse.json({
      data: {
        logs: logs.map((l: AuditLogRow) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
          userName: l.user?.name,
          userEmail: l.user?.email,
          user: undefined,
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
      }
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed' } }, { status: 500 })
  }
}
