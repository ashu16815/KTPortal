import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { cookies } from 'next/headers'
import {
  COOKIE_NAME_EXPORT,
  createSessionCookie,
  getSession,
  requireRole,
  requireSession,
} from '../src/lib/auth'
import type { SessionUser } from '../src/types'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

const cookiesMock = cookies as unknown as Mock

function makeSession(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'u-1',
    email: 'user@example.com',
    name: 'User',
    role: 'TWG_LEAD',
    org: 'TWG',
    towerId: 'tower-1',
    ...overrides,
  }
}

function mockCookieStore(value: string | undefined | null) {
  const get = vi.fn().mockReturnValue(value == null ? value : { value })
  cookiesMock.mockResolvedValue({ get })
  return get
}

beforeEach(() => {
  cookiesMock.mockReset()
})

describe('auth session helpers', () => {
  it('encodes a session and getSession decodes it from cookie storage', async () => {
    const session = makeSession()
    const encoded = createSessionCookie(session)
    const get = mockCookieStore(encoded)

    await expect(getSession()).resolves.toEqual(session)
    expect(get).toHaveBeenCalledWith(COOKIE_NAME_EXPORT)
  })

  it('returns null when the cookie is missing or empty', async () => {
    mockCookieStore(undefined)
    await expect(getSession()).resolves.toBeNull()

    mockCookieStore('')
    await expect(getSession()).resolves.toBeNull()
  })

  it('returns null when cookie payload cannot be parsed', async () => {
    mockCookieStore(Buffer.from('not-json').toString('base64'))
    await expect(getSession()).resolves.toBeNull()
  })

  it('returns null when next/headers cookies() throws', async () => {
    cookiesMock.mockRejectedValue(new Error('boom'))
    await expect(getSession()).resolves.toBeNull()
  })

  it('requireSession returns the session when present', async () => {
    const session = makeSession({ role: 'ADMIN', towerId: undefined })
    mockCookieStore(createSessionCookie(session))

    await expect(requireSession()).resolves.toEqual(session)
  })

  it('requireSession throws UNAUTHENTICATED when no session exists', async () => {
    mockCookieStore(undefined)
    await expect(requireSession()).rejects.toThrow('UNAUTHENTICATED')
  })

  it('requireRole returns the session when role is allowed', async () => {
    const session = makeSession({ role: 'TWG_LEAD' })
    mockCookieStore(createSessionCookie(session))

    await expect(requireRole(['TWG_LEAD', 'ADMIN'])).resolves.toEqual(session)
  })

  it('requireRole throws FORBIDDEN when role is not allowed', async () => {
    const session = makeSession({ role: 'EXEC' })
    mockCookieStore(createSessionCookie(session))

    await expect(requireRole(['ADMIN'])).rejects.toThrow('FORBIDDEN')
  })
})
