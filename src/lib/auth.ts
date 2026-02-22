import { cookies } from 'next/headers'
import type { SessionUser, UserRole } from '@/types'

const COOKIE_NAME = 'kt_stub_session'

export interface AuthProvider {
  getSession(): Promise<SessionUser | null>
  requireRole(allowedRoles: UserRole[]): Promise<SessionUser>
}

// Server-side: read cookie from next/headers
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(COOKIE_NAME)
    if (!cookie?.value) return null
    const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8')
    return JSON.parse(decoded) as SessionUser
  } catch {
    return null
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHENTICATED')
  }
  return session
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const session = await requireSession()
  if (!allowedRoles.includes(session.role as UserRole)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

export function createSessionCookie(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME
