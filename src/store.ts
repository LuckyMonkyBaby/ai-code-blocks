// src/store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Config, CodeBlock, FileState, StreamingState } from './types';
import { StreamingParser } from './parser';
import { StorageAdapter, MemoryStorageAdapter } from './storage';

export interface StreamingStore extends StreamingState {
  // Configuration and dependencies
  parser: StreamingParser | null;
  storage: StorageAdapter;
  threadId?: string;

  // Actions
  initialize: (config: Config, storage?: StorageAdapter, threadId?: string) => void;
  processMessage: (messageId: string, content: string) => Promise<void>;
  updateFile: (filePath: string, updates: Partial<FileState>) => void;
  addFile: (file: FileState) => void;
  removeFile: (filePath: string) => void;
  clear: () => void;
  
  // Session management
  loadFromStorage: (sessionId: string) => Promise<void>;
  saveToStorage: (sessionId: string) => Promise<void>;
  getSessionData: () => any;
  
  // Utility methods
  getCleanedMessage: (content: string) => string;
  getFile: (filePath: string) => FileState | undefined;
  getCurrentFiles: () => FileState[];
}

const createStreamingStore = () =>
  create<StreamingStore>()(
    devtools(
      (set, get) => ({
        // Initial state
        codeBlocks: [],
        currentFiles: new Map(),
        isCodeMode: false,
        parser: null,
        storage: new MemoryStorageAdapter(),
        threadId: undefined,

        // Actions
        initialize: (config: Config, storage = new MemoryStorageAdapter(), threadId) => {
          set({
            parser: new StreamingParser(config),
            storage,
            threadId,
            codeBlocks: [],
            currentFiles: new Map(),
            isCodeMode: false,
          });
        },

        processMessage: async (messageId: string, content: string) => {
          const { parser, storage, threadId } = get();
          if (!parser) return;

          const parsed = parser.parseMessage(content);

          if (parsed.hasCodeStarted) {
            const codeBlock = parser.parseCodeBlock(parsed.codeContent, messageId);
            
            // Update code blocks
            set((state) => {
              const existingIndex = state.codeBlocks.findIndex(
                (block) => block.messageId === codeBlock.messageId
              );

              const newCodeBlocks = [...state.codeBlocks];
              if (existingIndex >= 0) {
                newCodeBlocks[existingIndex] = codeBlock;
              } else {
                newCodeBlocks.push(codeBlock);
              }

              return { codeBlocks: newCodeBlocks };
            });

            // Update files
            const currentFiles = new Map(get().currentFiles);
            
            for (const command of codeBlock.commands) {
              if (!command.isComplete) continue;

              const existing = currentFiles.get(command.filePath);

              // Skip if content hasn't changed
              if (existing && existing.content === command.content) {
                continue;
              }

              const fileState: FileState = {
                filePath: command.filePath,
                content: command.content,
                version: existing ? existing.version + 1 : 1,
                lastModified: new Date(),
                sourceMessageId: codeBlock.messageId,
              };

              currentFiles.set(command.filePath, fileState);

              // Save to storage
              await storage.saveFile(command.filePath, command.content, {
                version: fileState.version,
                sourceMessageId: codeBlock.messageId,
                threadId,
              });
            }

            set({ 
              currentFiles,
              isCodeMode: !parsed.hasCodeEnded 
            });
          } else {
            set({ isCodeMode: false });
          }
        },

        updateFile: (filePath: string, updates: Partial<FileState>) => {
          set((state) => {
            const currentFiles = new Map(state.currentFiles);
            const existing = currentFiles.get(filePath);
            
            if (existing) {
              currentFiles.set(filePath, { ...existing, ...updates });
            }
            
            return { currentFiles };
          });
        },

        addFile: (file: FileState) => {
          set((state) => {
            const currentFiles = new Map(state.currentFiles);
            currentFiles.set(file.filePath, file);
            return { currentFiles };
          });
        },

        removeFile: (filePath: string) => {
          set((state) => {
            const currentFiles = new Map(state.currentFiles);
            currentFiles.delete(filePath);
            return { currentFiles };
          });
        },

        clear: () => {
          set({
            codeBlocks: [],
            currentFiles: new Map(),
            isCodeMode: false,
          });
        },

        // Session management
        loadFromStorage: async (sessionId: string) => {
          const { storage } = get();
          const data = await storage.loadSession(sessionId);
          
          if (data) {
            set({
              ...data,
              currentFiles: new Map(Object.entries(data.currentFiles || {})),
            });
          }
        },

        saveToStorage: async (sessionId: string) => {
          const { storage, codeBlocks, currentFiles, isCodeMode } = get();
          
          await storage.saveSession(sessionId, {
            codeBlocks,
            currentFiles: Object.fromEntries(currentFiles),
            isCodeMode,
          });
        },

        getSessionData: () => {
          const { codeBlocks, currentFiles, isCodeMode } = get();
          return {
            codeBlocks,
            currentFiles: Object.fromEntries(currentFiles),
            isCodeMode,
          };
        },

        // Utility methods
        getCleanedMessage: (content: string) => {
          const { parser } = get();
          if (!parser) return content;

          const parsed = parser.parseMessage(content);
          
          // If code has started but not ended, return empty string (incomplete code block)
          if (parsed.hasCodeStarted && !parsed.hasCodeEnded) {
            return "";
          }
          
          // Return chat content if it exists, otherwise return original content
          return parsed.chatContent || content;
        },

        getFile: (filePath: string) => {
          return get().currentFiles.get(filePath);
        },

        getCurrentFiles: () => {
          return Array.from(get().currentFiles.values());
        },
      }),
      {
        name: 'streaming-code-blocks-store',
      }
    )
  );

// Export the store creator
export { createStreamingStore };

// Export a default store instance for convenience
export const useStreamingStore = createStreamingStore();