// src/store.ts - v2.0 with all logic consolidated
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Config, CodeBlock, FileState, FileCommand, DEFAULT_CONFIG } from './types';
import { StreamingParser } from './parser';
import { StorageAdapter } from './storage';

// Progressive content builder for handling streaming partial tags
interface MessageContentState {
  stableContent: string;      // Content that won't change
  lastProcessedLength: number; // Track processing progress
  isStreamingCode: boolean;   // Current streaming state
}

export interface StreamingStore {
  // State
  files: ReadonlyMap<string, FileState>;
  codeBlocks: readonly CodeBlock[];
  isStreaming: boolean;
  
  // Configuration and dependencies
  config: Config;
  parser: StreamingParser | null;
  storage: StorageAdapter | null;
  sessionId: string | null;
  
  // Message content cache for progressive text building
  messageContentCache: Map<string, MessageContentState>;

  // Core actions
  initialize: (config: Config, storage: StorageAdapter, sessionId?: string) => void;
  processMessage: (messageId: string, content: string) => Promise<void>;
  clear: () => void;
  
  // File operations
  updateFile: (filePath: string, updates: Partial<FileState>) => void;
  addFile: (file: FileState) => void;
  removeFile: (filePath: string) => void;
  getFile: (filePath: string) => FileState | undefined;
  
  // Session management  
  loadSession: (sessionId: string) => Promise<void>;
  saveSession: (sessionId: string) => Promise<void>;
  getSessionData: () => { files: Record<string, FileState>; codeBlocks: CodeBlock[]; isStreaming: boolean };
  
  // Utility methods
  getCleanedMessage: (content: string, messageId?: string) => string;
}

export const createStreamingStore = () =>
  create<StreamingStore>()(
    devtools(
      (set, get) => ({
        // Initial state
        files: new Map(),
        codeBlocks: [],
        isStreaming: false,
        config: DEFAULT_CONFIG,
        parser: null,
        storage: null,
        sessionId: null,
        messageContentCache: new Map(),

        // Core actions
        initialize: (config: Config, storage: StorageAdapter, sessionId?: string) => {
          set({
            config,
            parser: new StreamingParser(config),
            storage,
            sessionId: sessionId || null,
            files: new Map(),
            codeBlocks: [],
            isStreaming: false,
            messageContentCache: new Map(),
          });
        },

        // Enhanced message processing with proper state management
        processMessage: async (messageId: string, content: string) => {
          const { parser, storage, sessionId } = get();
          if (!parser) return;

          const parsed = parser.parseMessage(content);

          if (parsed.hasCodeStarted) {
            const codeBlock = parser.parseCodeBlock(parsed.codeContent, messageId as `msg-${string}`);
            
            // Update code blocks
            const existingCodeBlocks = get().codeBlocks;
            const existingIndex = existingCodeBlocks.findIndex(
              (block) => block.messageId === codeBlock.messageId
            );

            const newCodeBlocks = [...existingCodeBlocks];
            if (existingIndex >= 0) {
              newCodeBlocks[existingIndex] = codeBlock;
            } else {
              newCodeBlocks.push(codeBlock);
            }

            // Update files from completed commands
            const currentFiles = new Map(get().files);
            
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

              // Save to storage if available
              if (storage) {
                try {
                  await storage.saveFile(command.filePath, command.content, {
                    version: fileState.version,
                    sourceMessageId: codeBlock.messageId,
                    sessionId,
                  });
                } catch (error) {
                  console.warn('Failed to save file to storage:', error);
                }
              }
            }

            set({
              codeBlocks: newCodeBlocks,
              files: currentFiles,
              isStreaming: !parsed.hasCodeEnded,
            });
          } else {
            set({ isStreaming: false });
          }
        },

        clear: () => {
          set({
            files: new Map(),
            codeBlocks: [],
            isStreaming: false,
            messageContentCache: new Map(),
          });
        },

        // File operations
        updateFile: (filePath: string, updates: Partial<FileState>) => {
          const currentFiles = new Map(get().files);
          const existing = currentFiles.get(filePath);
          
          if (existing) {
            currentFiles.set(filePath, { ...existing, ...updates });
            set({ files: currentFiles });
          }
        },

        addFile: (file: FileState) => {
          const currentFiles = new Map(get().files);
          currentFiles.set(file.filePath, file);
          set({ files: currentFiles });
        },

        removeFile: (filePath: string) => {
          const currentFiles = new Map(get().files);
          currentFiles.delete(filePath);
          set({ files: currentFiles });
        },

        getFile: (filePath: string) => {
          return get().files.get(filePath);
        },

        // Session management
        loadSession: async (sessionId: string) => {
          const { storage } = get();
          if (!storage) return;

          try {
            const data = await storage.loadSession(sessionId);
            if (data) {
              set({
                files: new Map(Object.entries(data.files || {})),
                codeBlocks: data.codeBlocks || [],
                isStreaming: data.isStreaming || false,
                messageContentCache: new Map(Object.entries(data.messageContentCache || {})),
              });
            }
          } catch (error) {
            console.warn('Failed to load session from storage:', error);
          }
        },

        saveSession: async (sessionId: string) => {
          const { storage, files, codeBlocks, isStreaming, messageContentCache } = get();
          if (!storage) return;

          try {
            await storage.saveSession(sessionId, {
              files: Object.fromEntries(files),
              codeBlocks,
              isStreaming,
              messageContentCache: Object.fromEntries(messageContentCache),
            });
          } catch (error) {
            console.warn('Failed to save session to storage:', error);
          }
        },

        getSessionData: () => {
          const { files, codeBlocks, isStreaming, messageContentCache } = get();
          return {
            files: Object.fromEntries(files),
            codeBlocks: [...codeBlocks],
            isStreaming,
            messageContentCache: Object.fromEntries(messageContentCache),
          };
        },

        // Enhanced getCleanedMessage with industry-standard buffer management
        getCleanedMessage: (content: string, messageId?: string) => {
          const { parser, messageContentCache } = get();
          if (!parser) return content;

          // Get or create message state for progressive building
          const messageKey = messageId || 'default';
          let messageState = messageContentCache.get(messageKey) as MessageContentState;
          
          if (!messageState) {
            messageState = {
              stableContent: '',
              lastProcessedLength: 0,
              isStreamingCode: false
            };
          }

          // Only process new content (performance optimization)
          if (content.length <= messageState.lastProcessedLength && messageState.isStreamingCode) {
            // No new content during streaming - return stable content
            return messageState.stableContent;
          }

          const parsed = parser.parseMessage(content);
          
          // Update processing state
          messageState.lastProcessedLength = content.length;
          messageState.isStreamingCode = parsed.hasCodeStarted && !parsed.hasCodeEnded;
          
          if (parsed.hasCodeStarted && !parsed.hasCodeEnded) {
            // CRITICAL: During code streaming, only update if we have new stable content
            if (parsed.chatContent && parsed.chatContent.length > messageState.stableContent.length) {
              messageState.stableContent = parsed.chatContent;
            }
            
            // Cache updated state
            messageContentCache.set(messageKey, messageState);
            
            // Return stable content (never return partial tags)
            return messageState.stableContent;
            
          } else if (parsed.hasCodeStarted && parsed.hasCodeEnded) {
            // Code streaming complete - update with final content
            messageState.stableContent = parsed.chatContent || content;
            messageState.isStreamingCode = false;
            messageContentCache.set(messageKey, messageState);
            
            return messageState.stableContent;
            
          } else {
            // No code detected - normal content
            messageState.stableContent = content;
            messageState.isStreamingCode = false;
            messageContentCache.set(messageKey, messageState);
            
            return content;
          }
        },
      }),
      {
        name: 'streaming-code-blocks-store-v2',
      }
    )
  );

// Export type for external usage
export type StreamingStoreApi = ReturnType<typeof createStreamingStore>;