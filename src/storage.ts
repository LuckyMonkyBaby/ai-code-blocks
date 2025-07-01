// src/storage.ts
export interface StorageAdapter {
  saveSession(sessionId: string, data: any): Promise<void>;
  loadSession(sessionId: string): Promise<any | null>;
  saveFile(filePath: string, content: string, metadata: any): Promise<void>;
  loadFile(
    filePath: string
  ): Promise<{ content: string; metadata: any } | null>;
  deleteFile(filePath: string): Promise<void>;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private sessions = new Map<string, any>();
  private files = new Map<string, { content: string; metadata: any }>();

  async saveSession(sessionId: string, data: any): Promise<void> {
    this.sessions.set(sessionId, data);
  }

  async loadSession(sessionId: string): Promise<any | null> {
    return this.sessions.get(sessionId) || null;
  }

  async saveFile(
    filePath: string,
    content: string,
    metadata: any
  ): Promise<void> {
    this.files.set(filePath, { content, metadata });
  }

  async loadFile(filePath: string) {
    return this.files.get(filePath) || null;
  }

  async deleteFile(filePath: string): Promise<void> {
    this.files.delete(filePath);
  }
}
