// src/__tests__/storage.test.ts
import { MemoryStorageAdapter, StorageAdapter } from '../storage';

describe('MemoryStorageAdapter', () => {
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
  });

  describe('session management', () => {
    it('should save and load session data', async () => {
      const sessionId = 'test-session';
      const sessionData = {
        codeBlocks: [],
        currentFiles: { 'test.js': { content: 'test' } },
        isCodeMode: false,
      };

      await storage.saveSession(sessionId, sessionData);
      const loaded = await storage.loadSession(sessionId);

      expect(loaded).toEqual(sessionData);
    });

    it('should return null for non-existent session', async () => {
      const loaded = await storage.loadSession('non-existent');
      expect(loaded).toBeNull();
    });

    it('should overwrite existing session', async () => {
      const sessionId = 'test-session';
      const data1 = { version: 1 };
      const data2 = { version: 2 };

      await storage.saveSession(sessionId, data1);
      await storage.saveSession(sessionId, data2);
      const loaded = await storage.loadSession(sessionId);

      expect(loaded).toEqual(data2);
    });
  });

  describe('file management', () => {
    it('should save and load file with metadata', async () => {
      const filePath = 'src/test.js';
      const content = 'console.log("test");';
      const metadata = { version: 1, sourceMessageId: 'msg-123' };

      await storage.saveFile(filePath, content, metadata);
      const loaded = await storage.loadFile(filePath);

      expect(loaded).toEqual({ content, metadata });
    });

    it('should return null for non-existent file', async () => {
      const loaded = await storage.loadFile('non-existent.js');
      expect(loaded).toBeNull();
    });

    it('should delete file', async () => {
      const filePath = 'test.js';
      await storage.saveFile(filePath, 'content', {});
      await storage.deleteFile(filePath);

      const loaded = await storage.loadFile(filePath);
      expect(loaded).toBeNull();
    });

    it('should handle delete on non-existent file gracefully', async () => {
      await expect(storage.deleteFile('non-existent.js')).resolves.not.toThrow();
    });
  });
});

// Custom Storage Adapter Tests
describe('StorageAdapter Interface', () => {
  // Mock implementation for testing interface compliance
  class MockStorageAdapter implements StorageAdapter {
    private mockError: Error | null = null;

    setMockError(error: Error) {
      this.mockError = error;
    }

    async saveSession(sessionId: string, data: any): Promise<void> {
      if (this.mockError) throw this.mockError;
    }

    async loadSession(sessionId: string): Promise<any | null> {
      if (this.mockError) throw this.mockError;
      return null;
    }

    async saveFile(filePath: string, content: string, metadata: any): Promise<void> {
      if (this.mockError) throw this.mockError;
    }

    async loadFile(filePath: string): Promise<{ content: string; metadata: any } | null> {
      if (this.mockError) throw this.mockError;
      return null;
    }

    async deleteFile(filePath: string): Promise<void> {
      if (this.mockError) throw this.mockError;
    }
  }

  it('should handle storage errors gracefully', async () => {
    const storage = new MockStorageAdapter();
    const error = new Error('Storage error');
    storage.setMockError(error);

    await expect(storage.saveSession('test', {})).rejects.toThrow('Storage error');
    await expect(storage.loadSession('test')).rejects.toThrow('Storage error');
    await expect(storage.saveFile('test.js', '', {})).rejects.toThrow('Storage error');
    await expect(storage.loadFile('test.js')).rejects.toThrow('Storage error');
    await expect(storage.deleteFile('test.js')).rejects.toThrow('Storage error');
  });
});