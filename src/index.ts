// src/index.ts
export { useStreamingCodeBlocks } from "./use-streaming-code-blocks";
export { StreamingParser } from "./parser";
export { StreamingStateManager } from "./state-manager";
export { MemoryStorageAdapter } from "./storage";
export type { StorageAdapter } from "./storage";
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
