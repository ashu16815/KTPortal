import { describe, expect, it, vi } from 'vitest'
import { getBlobService } from '../src/lib/blob'

describe('StubBlobService via getBlobService', () => {
  it('uploads, returns an encoded URL, and deletes without error', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const service = getBlobService()
    const buffer = Buffer.from('hello')

    const path = await service.upload(buffer, 'report file.txt', 'text/plain')
    expect(path).toBe('stub/1700000000000-report file.txt')

    expect(service.getUrl(path)).toBe('/api/blob/stub%2F1700000000000-report%20file.txt')

    await expect(service.delete(path)).resolves.toBeUndefined()

    vi.restoreAllMocks()
  })
})
