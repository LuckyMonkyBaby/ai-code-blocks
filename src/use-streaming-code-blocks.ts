// src/use-streaming-code-blocks.ts
import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Config, ConfigSchema, FileState, CodeBlock } from "./types";
import { StreamingStateManager } from "./state-manager";
import { StorageAdapter, MemoryStorageAdapter } from "./storage";

interface UseStreamingCodeBlocksProps {
  apiEndpoint: string;
  config?: Partial<Config>;
  storage?: StorageAdapter;
  threadId?: string;
  persistSession?: boolean;
  onFileChanged?: (file: FileState) => void;
  onCodeBlockComplete?: (codeBlock: CodeBlock) => void;
}

export function useStreamingCodeBlocks({
  apiEndpoint,
  config = {},
  storage = new MemoryStorageAdapter(),
  threadId,
  persistSession = false,
  onFileChanged,
  onCodeBlockComplete,
}: UseStreamingCodeBlocksProps) {
  const fullConfig = ConfigSchema.parse(config);
  const managerRef = useRef<StreamingStateManager | undefined>(undefined);

  if (!managerRef.current) {
    managerRef.current = new StreamingStateManager(
      fullConfig,
      storage,
      threadId
    );
  }

  const manager = managerRef.current;
  const [, forceUpdate] = useState({});

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

  // Load existing session on mount
  useEffect(() => {
    if (persistSession && threadId) {
      manager.loadFromStorage(threadId);
    }
  }, [threadId, persistSession, manager]);

  // Process messages and track changes
  useEffect(() => {
    const lastMessage = rawMessages[rawMessages.length - 1];
    if (lastMessage?.role === "assistant") {
      const prevFiles = new Map(manager.getState().currentFiles);

      manager.processMessage(lastMessage.id, lastMessage.content);

      // Notify file changes
      if (onFileChanged) {
        manager.getCurrentFiles().forEach((file) => {
          const prevFile = prevFiles.get(file.filePath);
          if (!prevFile || prevFile.version !== file.version) {
            onFileChanged(file);
          }
        });
      }

      // Notify code block completion
      if (onCodeBlockComplete) {
        const state = manager.getState();
        const currentBlock = state.codeBlocks.find(
          (block) => block.messageId === lastMessage.id && block.isComplete
        );
        if (currentBlock) {
          onCodeBlockComplete(currentBlock);
        }
      }

      forceUpdate({});
    }
  }, [rawMessages, manager, onFileChanged, onCodeBlockComplete]);

  // Auto-save when state changes
  useEffect(() => {
    if (persistSession && threadId) {
      const saveTimer = setTimeout(() => {
        manager.saveToStorage(threadId);
      }, 1000);

      return () => clearTimeout(saveTimer);
    }
  }, [threadId, persistSession, manager, rawMessages]);

  // Clean messages for chat display
  const messages = rawMessages.map((msg) => ({
    ...msg,
    content:
      msg.role === "assistant"
        ? manager.getCleanedMessage(msg.content)
        : msg.content,
  }));

  const state = manager.getState();

  return {
    // Core data
    codeBlocks: state.codeBlocks,
    currentFiles: manager.getCurrentFiles(),
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
    getFile: (filePath: string) => manager.getFile(filePath),
    clearAll: () => {
      manager.clear();
      forceUpdate({});
    },

    // Stats
    totalFiles: manager.getCurrentFiles().length,
    totalCodeBlocks: state.codeBlocks.length,
  };
}
