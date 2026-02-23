import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '../src/lib/prisma'
import { writeAudit } from '../src/lib/audit'

const createMock = prisma.auditLog.create as unknown as Mock

beforeEach(() => {
  createMock.mockReset()
})

describe('writeAudit', () => {
  it('writes an audit log record with serialized details', async () => {
    createMock.mockResolvedValue({ id: 'a1' })

    await writeAudit({
      userId: 'user-1',
      action: 'UPDATE',
      resource: 'tower',
      resourceId: 'tower-1',
      details: { changed: ['name'], by: 'user-1' },
    })

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'UPDATE',
        resource: 'tower',
        resourceId: 'tower-1',
        details: JSON.stringify({ changed: ['name'], by: 'user-1' }),
      },
    })
  })

  it('omits details when not provided', async () => {
    createMock.mockResolvedValue({ id: 'a2' })

    await writeAudit({
      action: 'LOGIN',
      resource: 'auth',
    })

    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: undefined,
        action: 'LOGIN',
        resource: 'auth',
        resourceId: undefined,
        details: undefined,
      },
    })
  })

  it('swallows prisma errors and logs them', async () => {
    const error = new Error('db down')
    createMock.mockRejectedValue(error)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      writeAudit({
        action: 'CREATE',
        resource: 'action',
        resourceId: 'act-1',
      })
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalledWith('Audit write failed:', error)

    consoleSpy.mockRestore()
  })
})
