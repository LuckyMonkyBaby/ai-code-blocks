// src/types.ts - v2.0 with strict TypeScript (no runtime validation)

// Configuration types
export interface Config {
  readonly startTag: string;
  readonly endTag: string;
  readonly thinkingTag: string;
  readonly writeTag: string;
  readonly modifyTag: string;
}

// Default configuration as const assertion (compile-time)
export const DEFAULT_CONFIG = {
  startTag: '<ablo-code>',
  endTag: '</ablo-code>',
  thinkingTag: 'ablo-thinking',
  writeTag: 'ablo-write',
  modifyTag: 'ablo-modify',
} as const satisfies Config;

// File operation types
export type FileAction = 'write' | 'modify';

export interface WriteCommand {
  readonly action: 'write';
  readonly filePath: string;
  readonly content: string;
  readonly isComplete: boolean;
}

export interface ModifyCommand {
  readonly action: 'modify';
  readonly filePath: string;
  readonly changes: string;
  readonly content: string;
  readonly isComplete: boolean;
}

export type FileCommand = WriteCommand | ModifyCommand;

// Code block types
export interface CodeBlock {
  readonly messageId: `msg-${string}`;
  readonly thinking: string;
  readonly commands: readonly FileCommand[];
  readonly isComplete: boolean;
}

// Message parsing types
export interface ParsedMessage {
  readonly chatContent: string;
  readonly codeContent: string;
  readonly hasCodeStarted: boolean;
  readonly hasCodeEnded: boolean;
}

// File state types with template literal types for safety
export interface FileState {
  readonly filePath: string;
  readonly content: string;
  readonly version: number;
  readonly lastModified: Date;
  readonly sourceMessageId: `msg-${string}`;
}

// Store state interface
export interface StreamingState {
  readonly files: ReadonlyMap<string, FileState>;
  readonly codeBlocks: readonly CodeBlock[];
  readonly isStreaming: boolean;
}

// Utility type for partial config input
export type ConfigInput = Partial<Config>;

// Message types for chat interface
export interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
}