// src/react-query-hooks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StorageAdapter, ReactQueryStorageOptions } from "./storage";
import { FileState } from "./types";

export interface UseFileQueryOptions extends ReactQueryStorageOptions {
  storage: StorageAdapter;
  enabled?: boolean;
}

export function useFileQuery(filePath: string, options: UseFileQueryOptions) {
  return useQuery({
    queryKey: ['file', filePath],
    queryFn: () => options.storage.loadFile(filePath),
    enabled: options.enabled,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 10 * 60 * 1000,
    retry: options.retry !== undefined ? options.retry : 3,
  });
}

export interface UseSessionMutationOptions {
  storage: StorageAdapter;
  onSuccess?: (data: any, variables: { sessionId: string; sessionData: any }) => void;
  onError?: (error: Error) => void;
}

export function useSessionMutation(options: UseSessionMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { sessionId: string; sessionData: any }) => {
      await options.storage.saveSession(variables.sessionId, variables.sessionData);
      return variables.sessionData;
    },
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(['streaming-session', variables.sessionId], data);
      options.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables) => {
      // Invalidate cache on error
      queryClient.invalidateQueries({ 
        queryKey: ['streaming-session', variables.sessionId] 
      });
      options.onError?.(error);
    },
  });
}

export interface UseFileMutationOptions {
  storage: StorageAdapter;
  onSuccess?: (file: FileState) => void;
  onError?: (error: Error) => void;
}

export function useFileMutation(options: UseFileMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { filePath: string; content: string; metadata: any }) => {
      await options.storage.saveFile(variables.filePath, variables.content, variables.metadata);
      return { content: variables.content, metadata: variables.metadata };
    },
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(['file', variables.filePath], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['files'] });
      
      options.onSuccess?.({
        filePath: variables.filePath,
        content: variables.content,
        version: data.metadata?.version || 1,
        lastModified: new Date(),
        sourceMessageId: data.metadata?.sourceMessageId || '',
      });
    },
    onError: (error: Error, variables) => {
      // Invalidate cache on error
      queryClient.invalidateQueries({ 
        queryKey: ['file', variables.filePath] 
      });
      options.onError?.(error);
    },
  });
}

export interface UseSessionQueryOptions extends ReactQueryStorageOptions {
  storage: StorageAdapter;
  enabled?: boolean;
}

export function useSessionQuery(sessionId: string, options: UseSessionQueryOptions) {
  return useQuery({
    queryKey: ['streaming-session', sessionId],
    queryFn: () => options.storage.loadSession(sessionId),
    enabled: options.enabled,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 10 * 60 * 1000,
    retry: options.retry !== undefined ? options.retry : 3,
  });
}

// Utility hook for prefetching files
export function usePrefetchFile(storage: StorageAdapter, options?: ReactQueryStorageOptions) {
  const queryClient = useQueryClient();

  return (filePath: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['file', filePath],
      queryFn: () => storage.loadFile(filePath),
      staleTime: options?.staleTime || 5 * 60 * 1000,
    });
  };
}

// Utility hook for invalidating queries
export function useStreamingQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateSession: (sessionId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ['streaming-session', sessionId] 
      });
    },
    invalidateFile: (filePath: string) => {
      queryClient.invalidateQueries({ 
        queryKey: ['file', filePath] 
      });
    },
    invalidateAllFiles: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['files'] 
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'streaming-session' ||
          query.queryKey[0] === 'file' ||
          query.queryKey[0] === 'files'
      });
    },
  };
}