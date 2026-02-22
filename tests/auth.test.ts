import { describe, it, expect } from 'vitest'
import { canWriteTower } from '../src/lib/auth'
import type { SessionUser } from '../src/types'

function makeSession(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: 'test-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'TWG_LEAD',
    org: 'TWG',
    ...overrides,
  }
}

describe('canWriteTower', () => {
  it('ADMIN can write to any tower', () => {
    const session = makeSession({ role: 'ADMIN' })
    expect(canWriteTower(session, 'tower-1')).toBe(true)
    expect(canWriteTower(session, 'tower-2')).toBe(true)
    expect(canWriteTower(session, null)).toBe(true)
    expect(canWriteTower(session, undefined)).toBe(true)
  })

  it('EXEC cannot write to any tower', () => {
    const session = makeSession({ role: 'EXEC', towerId: 'tower-1' })
    expect(canWriteTower(session, 'tower-1')).toBe(false)
    expect(canWriteTower(session, 'tower-2')).toBe(false)
    expect(canWriteTower(session, null)).toBe(false)
  })

  it('TWG_LEAD can write to their own tower', () => {
    const session = makeSession({ role: 'TWG_LEAD', towerId: 'tower-1' })
    expect(canWriteTower(session, 'tower-1')).toBe(true)
  })

  it('TWG_LEAD cannot write to a different tower', () => {
    const session = makeSession({ role: 'TWG_LEAD', towerId: 'tower-1' })
    expect(canWriteTower(session, 'tower-2')).toBe(false)
  })

  it('TCS_LEAD can write to their own tower', () => {
    const session = makeSession({ role: 'TCS_LEAD', towerId: 'tower-5' })
    expect(canWriteTower(session, 'tower-5')).toBe(true)
    expect(canWriteTower(session, 'tower-1')).toBe(false)
  })

  it('TWG_OWNER and TCS_OWNER are treated like leads', () => {
    const twgOwner = makeSession({ role: 'TWG_OWNER', towerId: 'tower-3' })
    expect(canWriteTower(twgOwner, 'tower-3')).toBe(true)
    expect(canWriteTower(twgOwner, 'tower-4')).toBe(false)

    const tcsOwner = makeSession({ role: 'TCS_OWNER', towerId: 'tower-3' })
    expect(canWriteTower(tcsOwner, 'tower-3')).toBe(true)
    expect(canWriteTower(tcsOwner, 'tower-9')).toBe(false)
  })

  it('returns false when towerId is null/undefined for non-admin leads', () => {
    const session = makeSession({ role: 'TWG_LEAD', towerId: 'tower-1' })
    expect(canWriteTower(session, null)).toBe(false)
    expect(canWriteTower(session, undefined)).toBe(false)
  })

  it('returns false when session has no towerId', () => {
    const session = makeSession({ role: 'TWG_LEAD', towerId: undefined })
    expect(canWriteTower(session, 'tower-1')).toBe(false)
  })
})
