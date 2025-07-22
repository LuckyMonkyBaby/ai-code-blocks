// src/use-streaming-code-blocks.ts - v2.0 with clean React Query integration
import { useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Config, ConfigInput, FileState, CodeBlock, Message, DEFAULT_CONFIG } from "./types";
import { StorageAdapter, MemoryStorageAdapter } from "./storage";
import { createStreamingStore, StreamingStoreApi } from "./store";

// v2.0 API with consistent naming
export interface UseStreamingCodeBlocksProps {
  endpoint: string;                    // was: apiEndpoint
  sessionId?: string;                  // was: threadId
  config?: ConfigInput;
  storage?: StorageAdapter;
  persistSession?: boolean;
  onFileChanged?: (file: FileState) => void;
  onCodeBlockComplete?: (codeBlock: CodeBlock) => void;
}

// v2.0 return interface with consistent naming  
export interface StreamingCodeBlocksResult {
  // State (readonly arrays)
  files: readonly FileState[];        // was: currentFiles
  codeBlocks: readonly CodeBlock[];
  isStreaming: boolean;               // was: isCodeMode
  
  // Chat interface (unchanged)
  messages: readonly Message[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  append: (message: { role: 'user' | 'assistant'; content: string }) => void;
  reload: () => void;
  stop: () => void;
  
  // Operations
  getFile: (path: string) => FileState | undefined;
  clearAll: () => void;
  
  // React Query states (always present in v2.0)
  isLoadingSession: boolean;
  isSavingSession: boolean;
  sessionError: Error | null;
  refetchSession: () => void;
}

export function useStreamingCodeBlocks({
  endpoint,
  sessionId,
  config = {},
  storage = new MemoryStorageAdapter(),
  persistSession = false,
  onFileChanged,
  onCodeBlockComplete,
}: UseStreamingCodeBlocksProps): StreamingCodeBlocksResult {
  // Create final config by merging with defaults
  const finalConfig: Config = { ...DEFAULT_CONFIG, ...config };
  
  // React Query is always available in v2.0 - no conditionals
  const queryClient = useQueryClient();
  
  // Stable callback references to prevent stale closures
  const onFileChangedRef = useRef(onFileChanged);
  onFileChangedRef.current = onFileChanged;
  
  const onCodeBlockCompleteRef = useRef(onCodeBlockComplete);
  onCodeBlockCompleteRef.current = onCodeBlockComplete;

  // Create and initialize Zustand store
  const storeRef = useRef<StreamingStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createStreamingStore();
    // Initialize immediately
    storeRef.current.getState().initialize(finalConfig, storage, sessionId);
  }
  
  const store = storeRef.current;

  // Subscribe to store state - these are optimized selectors
  const files = store((state) => Array.from(state.files.values()));
  const codeBlocks = store((state) => state.codeBlocks);
  const isStreaming = store((state) => state.isStreaming);

  // Chat integration with @ai-sdk/react
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
    api: endpoint,
  });

  // Clean React Query integration for session management
  const sessionQuery = useQuery({
    queryKey: ['streaming-session', sessionId],
    queryFn: async () => {
      if (!sessionId || !persistSession) return null;
      await store.getState().loadSession(sessionId);
      return store.getState().getSessionData();
    },
    enabled: !!(sessionId && persistSession),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  const saveSessionMutation = useMutation({
    mutationFn: async (data: { sessionId: string; sessionData: any }) => {
      await store.getState().saveSession(data.sessionId);
      return data.sessionData;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['streaming-session', variables.sessionId], data);
    },
  });

  // Load existing session on mount
  useEffect(() => {
    if (persistSession && sessionId) {
      // Let React Query handle the loading
      sessionQuery.refetch();
    }
  }, [sessionId, persistSession]);

  // Process messages and track changes
  useEffect(() => {
    const processLastMessage = async () => {
      const lastMessage = rawMessages[rawMessages.length - 1];
      if (lastMessage?.role === "assistant") {
        const prevFiles = new Map(store.getState().files);

        await store.getState().processMessage(lastMessage.id, lastMessage.content);

        // Notify file changes using stable reference
        if (onFileChangedRef.current) {
          const currentFiles = store.getState().files;
          currentFiles.forEach((file) => {
            const prevFile = prevFiles.get(file.filePath);
            if (!prevFile || prevFile.version !== file.version) {
              onFileChangedRef.current!(file);
            }
          });
        }

        // Notify code block completion using stable reference
        if (onCodeBlockCompleteRef.current) {
          const currentCodeBlocks = store.getState().codeBlocks;
          const currentBlock = currentCodeBlocks.find(
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

  // Auto-save when state changes
  useEffect(() => {
    if (!persistSession || !sessionId) return;

    let saveTimer: NodeJS.Timeout;

    const unsubscribe = store.subscribe((state, prevState) => {
      // Only save if something actually changed
      if (state.files !== prevState.files || state.codeBlocks !== prevState.codeBlocks) {
        if (saveTimer) {
          clearTimeout(saveTimer);
        }
        
        saveTimer = setTimeout(() => {
          const sessionData = store.getState().getSessionData();
          saveSessionMutation.mutate({ sessionId, sessionData });
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [sessionId, persistSession, saveSessionMutation, store]);

  // Clean messages for chat display (filter to only user/assistant)
  const messages = rawMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.role === "assistant" 
        ? store.getState().getCleanedMessage(msg.content)
        : msg.content,
    }));

  return {
    // State (v2.0 naming)
    files,
    codeBlocks,
    isStreaming,

    // Chat interface
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    reload,
    stop,

    // Operations
    getFile: (path: string) => store.getState().getFile(path),
    clearAll: () => store.getState().clear(),

    // React Query states (always present in v2.0)
    isLoadingSession: sessionQuery.isLoading,
    isSavingSession: saveSessionMutation.isPending,
    sessionError: (sessionQuery.error || saveSessionMutation.error) as Error | null,
    refetchSession: () => sessionQuery.refetch(),
  };
}