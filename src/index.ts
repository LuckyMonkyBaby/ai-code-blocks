// src/index.ts - v2.0 exports
export { useStreamingCodeBlocks } from "./use-streaming-code-blocks";
export type { UseStreamingCodeBlocksProps, StreamingCodeBlocksResult } from "./use-streaming-code-blocks";

export { StreamingParser } from "./parser";
export { MemoryStorageAdapter, LocalStorageAdapter } from "./storage";
export type { StorageAdapter } from "./storage";

// Optional React Query integration (requires @tanstack/react-query peer dependency)
export { useStreamingCodeBlocksWithReactQuery } from "./use-streaming-code-blocks-react-query";
export type { 
  UseStreamingCodeBlocksWithReactQueryProps, 
  StreamingCodeBlocksWithReactQueryResult 
} from "./use-streaming-code-blocks-react-query";

// Zustand store
export { createStreamingStore } from "./store";
export type { StreamingStore, StreamingStoreApi } from "./store";

export type {
  Config,
  ConfigInput,
  FileCommand,
  CodeBlock,
  ParsedMessage,
  FileState,
  StreamingState,
  Message,
} from "./types";

export { DEFAULT_CONFIG } from "./types";
