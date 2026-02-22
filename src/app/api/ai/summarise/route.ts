import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { getAIProvider } from '@/lib/ai'
import { safeParseJSON } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    await requireSession()
    const { submissionId } = await request.json()

    const submission = await prisma.weeklySubmission.findUnique({
      where: { id: submissionId },
      include: { tower: true },
    })
    if (!submission) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Submission not found' } }, { status: 404 })

    const ai = getAIProvider()
    const aiSummary = await ai.generateSummary({
      org: submission.org as 'TWG' | 'TCS',
      weekEnding: submission.weekEnding.toISOString(),
      progressScore: submission.progressScore,
      coverageScore: submission.coverageScore,
      confidenceScore: submission.confidenceScore,
      operationalScore: submission.operationalScore,
      qualityScore: submission.qualityScore,
      totalScore: submission.totalScore,
      ragStatus: submission.ragStatus as 'RED' | 'AMBER' | 'GREEN',
      narrative: submission.narrative ?? undefined,
      risks: safeParseJSON<string[]>(submission.risks, []),
      blockers: safeParseJSON<string[]>(submission.blockers, []),
    }, submission.tower.name)

    await prisma.weeklySubmission.update({
      where: { id: submissionId },
      data: { aiSummary, aiSummaryApproved: false },
    })

    return NextResponse.json({ data: { aiSummary } })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'AI generation failed' } }, { status: 500 })
  }
}
