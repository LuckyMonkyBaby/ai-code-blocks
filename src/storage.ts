// src/storage.ts - v2.0 simplified interfaces

export interface StorageAdapter {
  saveSession(sessionId: string, data: any): Promise<void>;
  loadSession(sessionId: string): Promise<any | null>;
  saveFile(filePath: string, content: string, metadata: any): Promise<void>;
  loadFile(filePath: string): Promise<{ content: string; metadata: any } | null>;
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

export class LocalStorageAdapter implements StorageAdapter {
  private keyPrefix: string;

  constructor(keyPrefix: string = 'ai-code-blocks') {
    this.keyPrefix = keyPrefix;
  }

  private getSessionKey(sessionId: string): string {
    return `${this.keyPrefix}:session:${sessionId}`;
  }

  private getFileKey(filePath: string): string {
    return `${this.keyPrefix}:file:${encodeURIComponent(filePath)}`;
  }

  async saveSession(sessionId: string, data: any): Promise<void> {
    try {
      const key = this.getSessionKey(sessionId);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // Handle quota exceeded or other localStorage errors
      console.warn('Failed to save session to localStorage:', error);
      throw error;
    }
  }

  async loadSession(sessionId: string): Promise<any | null> {
    try {
      const key = this.getSessionKey(sessionId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
      return null;
    }
  }

  async saveFile(
    filePath: string,
    content: string,
    metadata: any
  ): Promise<void> {
    try {
      const key = this.getFileKey(filePath);
      const data = { content, metadata, savedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save file to localStorage:', error);
      throw error;
    }
  }

  async loadFile(filePath: string): Promise<{ content: string; metadata: any } | null> {
    try {
      const key = this.getFileKey(filePath);
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return { content: parsed.content, metadata: parsed.metadata };
    } catch (error) {
      console.warn('Failed to load file from localStorage:', error);
      return null;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const key = this.getFileKey(filePath);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to delete file from localStorage:', error);
      throw error;
    }
  }
}
