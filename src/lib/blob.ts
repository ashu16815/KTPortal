export interface BlobService {
  upload(file: Buffer, filename: string, contentType: string): Promise<string>
  getUrl(blobPath: string): string
  delete(blobPath: string): Promise<void>
}

class StubBlobService implements BlobService {
  private store: Map<string, { data: Buffer; contentType: string }> = new Map()

  async upload(file: Buffer, filename: string, contentType: string): Promise<string> {
    const path = `stub/${Date.now()}-${filename}`
    this.store.set(path, { data: file, contentType })
    return path
  }

  getUrl(blobPath: string): string {
    return `/api/blob/${encodeURIComponent(blobPath)}`
  }

  async delete(blobPath: string): Promise<void> {
    this.store.delete(blobPath)
  }
}

export function getBlobService(): BlobService {
  // Azure Blob Storage implementation would go here when keys are present
  // For now always return stub
  return new StubBlobService()
}
