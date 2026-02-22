import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('submissionId')

    const responses = await prisma.pulseResponse.findMany({
      where: submissionId ? { submissionId } : {},
      include: { track: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: responses.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), trackName: r.track.name, track: undefined }))
    })
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch pulse' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    void session
    const body = await request.json()

    const response = await prisma.pulseResponse.create({
      data: {
        submissionId: body.submissionId,
        trackId: body.trackId,
        score: body.score,
        comment: body.comment,
      },
    })
    return NextResponse.json({ data: { ...response, createdAt: response.createdAt.toISOString() } }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } }, { status: 401 })
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create pulse response' } }, { status: 500 })
  }
}
