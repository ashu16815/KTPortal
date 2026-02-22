import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const submission = await prisma.weeklySubmission.update({
      where: { id },
      data: { aiSummaryApproved: true },
    })

    await writeAudit({ userId: session.id, action: 'UPDATE', resource: 'submission', resourceId: id, details: { aiSummaryApproved: true } })

    return NextResponse.json({ data: { id: submission.id, aiSummaryApproved: submission.aiSummaryApproved } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to approve summary' } }, { status: 500 })
  }
}
