// src/use-streaming-code-blocks.ts - v2.0.3 self-contained (no React Query)
import { useEffect, useRef, useState, useCallback, ChangeEvent, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { Config, ConfigInput, FileState, CodeBlock, Message, DEFAULT_CONFIG } from "./types";
import { StorageAdapter, LocalStorageAdapter } from "./storage";
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

// UPDATED: Add support for handleSubmit options
export interface HandleSubmitOptions {
  body?: any;
  headers?: Record<string, string>;
  data?: any;
}

// v2.0 return interface with consistent naming  
export interface StreamingCodeBlocksResult {
  // State (readonly arrays)
  files: readonly FileState[];        // was: currentFiles
  codeBlocks: readonly CodeBlock[];
  isStreaming: boolean;               // was: isCodeMode
  
  // Chat interface (UPDATED: handleSubmit now supports options)
  messages: readonly Message[];
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>, options?: HandleSubmitOptions) => void; // UPDATED
  isLoading: boolean;
  append: (message: { role: 'user' | 'assistant'; content: string }) => void;
  reload: () => void;
  stop: () => void;
  
  // Operations
  getFile: (path: string) => FileState | undefined;
  clearAll: () => void;
  
  // Session management states (self-contained in v2.0.3)
  isLoadingSession: boolean;
  isSavingSession: boolean;
  sessionError: Error | null;
  refetchSession: () => void;
}

export function useStreamingCodeBlocks({
  endpoint,
  sessionId,
  config = {},
  storage = new LocalStorageAdapter(),
  persistSession = false,
  onFileChanged,
  onCodeBlockComplete,
}: UseStreamingCodeBlocksProps): StreamingCodeBlocksResult {
  // Create final config by merging with defaults
  const finalConfig: Config = { ...DEFAULT_CONFIG, ...config };
  
  // Session management state
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  
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
    handleSubmit: originalHandleSubmit, // RENAMED for wrapping
    isLoading,
    append,
    reload,
    stop,
  } = useChat({
    api: endpoint,
  });

  // ADDED: Wrapper for handleSubmit to support options parameter
  const handleSubmit = (e: FormEvent<HTMLFormElement>, options?: HandleSubmitOptions) => {
    // The @ai-sdk/react handleSubmit already supports options, just pass them through
    // TypeScript might complain, but it works at runtime
    return (originalHandleSubmit as any)(e, options);
  };

  // Session loading function
  const loadSession = useCallback(async () => {
    if (!sessionId || !persistSession) return;
    
    setIsLoadingSession(true);
    setSessionError(null);
    
    try {
      await store.getState().loadSession(sessionId);
    } catch (error) {
      setSessionError(error as Error);
    } finally {
      setIsLoadingSession(false);
    }
  }, [sessionId, persistSession, store]);
  
  // Session saving function
  const saveSession = useCallback(async () => {
    if (!sessionId || !persistSession) return;
    
    setIsSavingSession(true);
    setSessionError(null);
    
    try {
      await store.getState().saveSession(sessionId);
    } catch (error) {
      setSessionError(error as Error);
    } finally {
      setIsSavingSession(false);
    }
  }, [sessionId, persistSession, store]);

  // Load existing session on mount
  useEffect(() => {
    if (persistSession && sessionId) {
      loadSession();
    }
  }, [loadSession]);

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
          saveSession();
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [sessionId, persistSession, saveSession, store]);

  // Clean messages for chat display (filter to only user/assistant)
  const messages = rawMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.role === "assistant" 
        ? store.getState().getCleanedMessage(msg.content, msg.id)
        : msg.content,
    }));

  return {
    // State (v2.0 naming)
    files,
    codeBlocks,
    isStreaming,

    // Chat interface (UPDATED: now includes options support)
    messages,
    input,
    handleInputChange,
    handleSubmit, // Now supports options parameter
    isLoading,
    append,
    reload,
    stop,

    // Operations
    getFile: (path: string) => store.getState().getFile(path),
    clearAll: () => store.getState().clear(),

    // Session management states (self-contained in v2.0.3)
    isLoadingSession,
    isSavingSession,
    sessionError,
    refetchSession: loadSession,
  };
}