// src/use-streaming-code-blocks-react-query.ts - Optional React Query integration
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStreamingCodeBlocks, UseStreamingCodeBlocksProps, StreamingCodeBlocksResult } from "./use-streaming-code-blocks";
import { MemoryStorageAdapter } from "./storage";

// Check if we're in a QueryClientProvider context
function useQueryClientCheck() {
  try {
    return useQueryClient();
  } catch (error) {
    throw new Error(
      'ai-code-blocks: No QueryClient found. Please wrap your app with QueryClientProvider:\n\n' +
      'import { QueryClient, QueryClientProvider } from "@tanstack/react-query";\n\n' +
      'const queryClient = new QueryClient();\n\n' +
      'function App() {\n' +
      '  return (\n' +
      '    <QueryClientProvider client={queryClient}>\n' +
      '      <YourComponents />\n' +
      '    </QueryClientProvider>\n' +
      '  );\n' +
      '}'
    );
  }
}

// React Query enhanced version with cache management and optimistic updates
export interface UseStreamingCodeBlocksWithReactQueryProps extends Omit<UseStreamingCodeBlocksProps, 'storage'> {
  storage?: never; // Force users to rely on React Query cache
  queryOptions?: {
    staleTime?: number;
    gcTime?: number;
  };
}

export interface StreamingCodeBlocksWithReactQueryResult extends Omit<StreamingCodeBlocksResult, 'isLoadingSession' | 'isSavingSession' | 'sessionError' | 'refetchSession'> {
  // Enhanced React Query states
  isLoadingSession: boolean;
  isSavingSession: boolean;
  sessionError: Error | null;
  refetchSession: () => void;
  
  // Additional React Query features
  isSessionStale: boolean;
  lastSessionUpdate: Date | null;
}

export function useStreamingCodeBlocksWithReactQuery({
  endpoint,
  sessionId,
  config = {},
  persistSession = false,
  onFileChanged,
  onCodeBlockComplete,
  queryOptions = {},
}: UseStreamingCodeBlocksWithReactQueryProps): StreamingCodeBlocksWithReactQueryResult {
  // Check for QueryClient early with helpful error
  const queryClient = useQueryClientCheck();
  
  const { staleTime = 5 * 60 * 1000, gcTime = 10 * 60 * 1000 } = queryOptions;

  // Use in-memory storage since React Query handles persistence
  const baseResult = useStreamingCodeBlocks({
    endpoint,
    sessionId,
    config,
    storage: new MemoryStorageAdapter(),
    persistSession: false, // We handle this with React Query
    onFileChanged,
    onCodeBlockComplete,
  });

  // React Query session management
  const sessionQuery = useQuery({
    queryKey: ['streaming-code-blocks-session', sessionId],
    queryFn: async () => {
      if (!sessionId || !persistSession) return null;
      
      // Here you would implement your session loading logic
      // For now, return the current session data
      return {
        files: Object.fromEntries(baseResult.files.map(f => [f.filePath, f])),
        codeBlocks: [...baseResult.codeBlocks],
        isStreaming: baseResult.isStreaming,
        timestamp: new Date(),
      };
    },
    enabled: !!(sessionId && persistSession),
    staleTime,
    gcTime,
  });

  const saveSessionMutation = useMutation({
    mutationKey: ['streaming-code-blocks-save-session', sessionId],
    mutationFn: async (sessionData: any) => {
      if (!sessionId) throw new Error('No session ID provided');
      
      // Here you would implement your session saving logic
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 100));
      return { ...sessionData, savedAt: new Date() };
    },
    onSuccess: (data) => {
      // Update the query cache optimistically
      if (sessionId) {
        queryClient.setQueryData(['streaming-code-blocks-session', sessionId], data);
      }
    },
  });

  // Auto-save session when state changes (using React Query mutation)
  React.useEffect(() => {
    if (!persistSession || !sessionId) return;

    let saveTimer: NodeJS.Timeout;

    // Debounced save
    const debouncedSave = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      
      saveTimer = setTimeout(() => {
        const sessionData = {
          files: Object.fromEntries(baseResult.files.map(f => [f.filePath, f])),
          codeBlocks: [...baseResult.codeBlocks],
          isStreaming: baseResult.isStreaming,
          timestamp: new Date(),
        };
        
        saveSessionMutation.mutate(sessionData);
      }, 1000);
    };

    // Trigger save when files or code blocks change
    debouncedSave();

    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [baseResult.files, baseResult.codeBlocks, persistSession, sessionId, saveSessionMutation]);

  return {
    ...baseResult,
    
    // Enhanced React Query states
    isLoadingSession: sessionQuery.isLoading,
    isSavingSession: saveSessionMutation.isPending,
    sessionError: (sessionQuery.error || saveSessionMutation.error) as Error | null,
    refetchSession: () => sessionQuery.refetch(),
    
    // Additional React Query features
    isSessionStale: sessionQuery.isStale,
    lastSessionUpdate: sessionQuery.data?.timestamp || null,
  };
}