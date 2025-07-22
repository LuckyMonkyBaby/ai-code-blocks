// src/use-streaming-code-blocks.ts
import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { Config, ConfigSchema, FileState, CodeBlock } from "./types";
import { StorageAdapter, MemoryStorageAdapter, ReactQueryStorageAdapter, ReactQueryStorageOptions } from "./storage";
import { createStreamingStore, StreamingStore } from "./store";

interface UseStreamingCodeBlocksProps {
  apiEndpoint: string;
  config?: Partial<Config>;
  storage?: StorageAdapter;
  threadId?: string;
  persistSession?: boolean;
  onFileChanged?: (file: FileState) => void;
  onCodeBlockComplete?: (codeBlock: CodeBlock) => void;
  reactQuery?: boolean | ReactQueryStorageOptions; // Simplified API
}

export function useStreamingCodeBlocks({
  apiEndpoint,
  config = {},
  storage = new MemoryStorageAdapter(),
  threadId,
  persistSession = false,
  onFileChanged,
  onCodeBlockComplete,
  reactQuery,
}: UseStreamingCodeBlocksProps) {
  const fullConfig = ConfigSchema.parse(config);
  
  // Auto-detect QueryClientProvider and determine React Query settings
  let queryClient: QueryClient | undefined;
  let reactQueryEnabled = false;
  let reactQueryOptions: ReactQueryStorageOptions = {};
  
  try {
    queryClient = useQueryClient();
    // If we get here, QueryClientProvider is available
    if (reactQuery === true) {
      reactQueryEnabled = true;
    } else if (typeof reactQuery === 'object') {
      reactQueryEnabled = true;
      reactQueryOptions = reactQuery;
    }
  } catch {
    // No QueryClientProvider found - React Query not available
    reactQueryEnabled = false;
  }
  
  // Stable callback references to prevent stale closures
  const onFileChangedRef = useRef(onFileChanged);
  onFileChangedRef.current = onFileChanged;
  
  const onCodeBlockCompleteRef = useRef(onCodeBlockComplete);
  onCodeBlockCompleteRef.current = onCodeBlockComplete;

  // Create storage adapter with React Query integration if enabled
  const effectiveStorage = reactQueryEnabled && queryClient
    ? new ReactQueryStorageAdapter(storage, queryClient, reactQueryOptions)
    : storage;

  // Create and initialize Zustand store
  const storeRef = useRef<ReturnType<typeof createStreamingStore>>();
  if (!storeRef.current) {
    storeRef.current = createStreamingStore();
    // Initialize store immediately when creating
    storeRef.current.getState().initialize(fullConfig, effectiveStorage, threadId);
  }
  
  const store = storeRef.current;

  // Subscribe to store state
  const state = store((state) => ({
    codeBlocks: state.codeBlocks,
    currentFiles: state.currentFiles,
    isCodeMode: state.isCodeMode,
  }));
  
  const actions = store((state) => ({
    processMessage: state.processMessage,
    loadFromStorage: state.loadFromStorage,
    saveToStorage: state.saveToStorage,
    getSessionData: state.getSessionData,
    getCleanedMessage: state.getCleanedMessage,
    getFile: state.getFile,
    getCurrentFiles: state.getCurrentFiles,
    clear: state.clear,
  }));

  const {
    messages: rawMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    reload,
    stop,
  } = useChat({
    api: apiEndpoint,
  });

  // React Query integration for session management (only when enabled)
  const sessionQueryEnabled = !!(threadId && persistSession && reactQueryEnabled);
  
  // Create dummy query/mutation objects when React Query is not enabled
  const dummyQuery = {
    isLoading: false,
    error: null,
    refetch: undefined,
  };
  
  const dummyMutation = {
    isPending: false,
    error: null,
    mutate: undefined,
  };
  
  let sessionQuery: any = dummyQuery;
  let saveSessionMutation: any = dummyMutation;
  
  if (sessionQueryEnabled && queryClient) {
    sessionQuery = useQuery({
      queryKey: ['streaming-session', threadId],
      queryFn: async () => {
        if (!threadId || !persistSession) return null;
        await actions.loadFromStorage(threadId);
        return actions.getSessionData();
      },
      enabled: sessionQueryEnabled,
      staleTime: reactQueryOptions?.staleTime || 5 * 60 * 1000,
      gcTime: reactQueryOptions?.cacheTime || 10 * 60 * 1000,
    });

    saveSessionMutation = useMutation({
      mutationFn: async (data: { sessionId: string; sessionData: any }) => {
        await actions.saveToStorage(data.sessionId);
        return data.sessionData;
      },
      onSuccess: (data: any, variables: { sessionId: string; sessionData: any }) => {
        queryClient?.setQueryData(
          ['streaming-session', variables.sessionId], 
          data
        );
      },
    });
  }

  // Load existing session on mount (skip if using React Query)
  useEffect(() => {
    if (persistSession && threadId && !reactQueryEnabled) {
      store.getState().loadFromStorage(threadId);
    }
  }, [threadId, persistSession, reactQueryEnabled, store]);

  // Process messages and track changes with stable callbacks
  useEffect(() => {
    const processLastMessage = async () => {
      const lastMessage = rawMessages[rawMessages.length - 1];
      if (lastMessage?.role === "assistant") {
        const currentState = store.getState();
        const prevFiles = new Map(currentState.currentFiles);

        await currentState.processMessage(lastMessage.id, lastMessage.content);

        // Notify file changes using stable reference
        if (onFileChangedRef.current) {
          currentState.getCurrentFiles().forEach((file) => {
            const prevFile = prevFiles.get(file.filePath);
            if (!prevFile || prevFile.version !== file.version) {
              onFileChangedRef.current!(file);
            }
          });
        }

        // Notify code block completion using stable reference
        if (onCodeBlockCompleteRef.current) {
          const updatedState = store.getState();
          const currentBlock = updatedState.codeBlocks.find(
            (block) => block.messageId === lastMessage.id && block.isComplete
          );
          if (currentBlock) {
            onCodeBlockCompleteRef.current(currentBlock);
          }
        }
      }
    };

    processLastMessage();
  }, [rawMessages, store]);

  // Auto-save when state changes (subscribe to store changes)
  useEffect(() => {
    if (!persistSession || !threadId) return;

    let saveTimer: NodeJS.Timeout;

    const unsubscribe = store.subscribe((state, prevState) => {
      // Only save if something actually changed
      if (
        state.codeBlocks !== prevState.codeBlocks ||
        state.currentFiles !== prevState.currentFiles
      ) {
        if (saveTimer) {
          clearTimeout(saveTimer);
        }
        
        saveTimer = setTimeout(async () => {
          if (reactQueryEnabled && saveSessionMutation.mutate) {
            // Use React Query mutation for saving
            const sessionData = store.getState().getSessionData();
            saveSessionMutation.mutate({ sessionId: threadId, sessionData });
          } else {
            // Fallback to direct storage
            store.getState().saveToStorage(threadId);
          }
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [threadId, persistSession, reactQueryEnabled, store, saveSessionMutation]);

  // Clean messages for chat display
  const messages = rawMessages.map((msg) => ({
    ...msg,
    content:
      msg.role === "assistant"
        ? store.getState().getCleanedMessage(msg.content)
        : msg.content,
  }));

  return {
    // Core data
    codeBlocks: state.codeBlocks,
    currentFiles: state.currentFiles ? Array.from(state.currentFiles.values()) : [],
    isCodeMode: state.isCodeMode,

    // Chat interface
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    reload,
    stop,

    // File operations
    getFile: (filePath: string) => store.getState().getFile(filePath),
    clearAll: () => store.getState().clear(),

    // Stats
    totalFiles: state.currentFiles ? state.currentFiles.size : 0,
    totalCodeBlocks: state.codeBlocks.length,

    // React Query states (when enabled)
    isLoadingSession: sessionQueryEnabled ? sessionQuery.isLoading : false,
    isSavingSession: sessionQueryEnabled ? saveSessionMutation.isPending : false,
    sessionError: sessionQueryEnabled ? (sessionQuery.error || saveSessionMutation.error) : null,
    
    // React Query operations
    refetchSession: sessionQueryEnabled ? sessionQuery.refetch : undefined,
    invalidateSession: sessionQueryEnabled && threadId && queryClient ? () => {
      queryClient.invalidateQueries({ 
        queryKey: ['streaming-session', threadId] 
      });
    } : undefined,
  };
}
