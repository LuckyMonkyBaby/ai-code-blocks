// src/index.ts
export { useStreamingCodeBlocks } from "./use-streaming-code-blocks";
export { StreamingParser } from "./parser";
export { StreamingStateManager } from "./state-manager";
export { MemoryStorageAdapter, ReactQueryStorageAdapter } from "./storage";
export type { StorageAdapter, ReactQueryStorageOptions } from "./storage";

// Zustand store
export { createStreamingStore, useStreamingStore } from "./store";
export type { StreamingStore } from "./store";

// React Query hooks
export {
  useFileQuery,
  useSessionMutation,
  useFileMutation,
  useSessionQuery,
  usePrefetchFile,
  useStreamingQueries,
} from "./react-query-hooks";
export type {
  UseFileQueryOptions,
  UseSessionMutationOptions,
  UseFileMutationOptions,
  UseSessionQueryOptions,
} from "./react-query-hooks";
import { Config } from "./types";

export type {
  Config,
  FileCommand,
  CodeBlock,
  ParsedMessage,
  FileState,
  StreamingState,
} from "./types";

export {
  ConfigSchema,
  FileCommandSchema,
  CodeBlockSchema,
  ParsedMessageSchema,
  FileStateSchema,
} from "./types";

export const DEFAULT_CONFIG: Config = {
  startTag: "<ablo-code>",
  endTag: "</ablo-code>",
  thinkingTag: "ablo-thinking",
  writeTag: "ablo-write",
  modifyTag: "ablo-modify",
};
