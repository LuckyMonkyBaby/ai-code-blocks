// src/storage.ts
import { QueryClient } from "@tanstack/react-query";

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

export interface ReactQueryStorageOptions {
  staleTime?: number;
  cacheTime?: number;
  retry?: number | boolean;
}

export class ReactQueryStorageAdapter implements StorageAdapter {
  private baseAdapter: StorageAdapter;
  private queryClient: QueryClient;
  private options: ReactQueryStorageOptions;

  constructor(
    baseAdapter: StorageAdapter,
    queryClient: QueryClient,
    options: ReactQueryStorageOptions = {}
  ) {
    this.baseAdapter = baseAdapter;
    this.queryClient = queryClient;
    this.options = {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      ...options,
    };
  }

  async saveSession(sessionId: string, data: any): Promise<void> {
    // Update cache immediately for optimistic update
    this.queryClient.setQueryData(['session', sessionId], data);
    
    // Perform the actual save
    try {
      await this.baseAdapter.saveSession(sessionId, data);
    } catch (error) {
      // Revert cache on failure
      this.queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      throw error;
    }
  }

  async loadSession(sessionId: string): Promise<any | null> {
    return this.queryClient.fetchQuery({
      queryKey: ['session', sessionId],
      queryFn: () => this.baseAdapter.loadSession(sessionId),
      staleTime: this.options.staleTime,
      gcTime: this.options.cacheTime,
      retry: this.options.retry,
    });
  }

  async saveFile(filePath: string, content: string, metadata: any): Promise<void> {
    const fileData = { content, metadata };
    
    // Update cache immediately for optimistic update
    this.queryClient.setQueryData(['file', filePath], fileData);
    
    // Perform the actual save
    try {
      await this.baseAdapter.saveFile(filePath, content, metadata);
      // Invalidate related queries to ensure consistency
      this.queryClient.invalidateQueries({ queryKey: ['files'] });
    } catch (error) {
      // Revert cache on failure
      this.queryClient.invalidateQueries({ queryKey: ['file', filePath] });
      throw error;
    }
  }

  async loadFile(filePath: string): Promise<{ content: string; metadata: any } | null> {
    return this.queryClient.fetchQuery({
      queryKey: ['file', filePath],
      queryFn: () => this.baseAdapter.loadFile(filePath),
      staleTime: this.options.staleTime,
      gcTime: this.options.cacheTime,
      retry: this.options.retry,
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    // Remove from cache immediately
    this.queryClient.removeQueries({ queryKey: ['file', filePath] });
    
    // Perform the actual deletion
    await this.baseAdapter.deleteFile(filePath);
    
    // Invalidate related queries
    this.queryClient.invalidateQueries({ queryKey: ['files'] });
  }

  // Additional methods for React Query integration
  invalidateSession(sessionId: string): void {
    this.queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
  }

  invalidateFile(filePath: string): void {
    this.queryClient.invalidateQueries({ queryKey: ['file', filePath] });
  }

  invalidateAllFiles(): void {
    this.queryClient.invalidateQueries({ queryKey: ['files'] });
  }

  prefetchSession(sessionId: string): Promise<void> {
    return this.queryClient.prefetchQuery({
      queryKey: ['session', sessionId],
      queryFn: () => this.baseAdapter.loadSession(sessionId),
      staleTime: this.options.staleTime,
    });
  }
}
