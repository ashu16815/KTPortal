import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionCookie } from '@/lib/auth'

const COOKIE_NAME = 'kt_stub_session'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 })

    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org: user.org,
      towerId: user.towerId ?? undefined,
    }

    const cookie = createSessionCookie(session)
    const response = NextResponse.json({ data: session })
    response.cookies.set(COOKIE_NAME, cookie, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Login failed' } }, { status: 500 })
  }
}
