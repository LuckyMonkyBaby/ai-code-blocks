// src/types.ts
import { z } from "zod";

export const ConfigSchema = z.object({
  startTag: z.string().default("<ablo-code>"),
  endTag: z.string().default("</ablo-code>"),
  thinkingTag: z.string().default("ablo-thinking"),
  writeTag: z.string().default("ablo-write"),
  modifyTag: z.string().default("ablo-modify"),
});

export const FileCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("write"),
    filePath: z.string(),
    content: z.string(),
    isComplete: z.boolean(),
  }),
  z.object({
    action: z.literal("modify"),
    filePath: z.string(),
    changes: z.string(),
    content: z.string(),
    isComplete: z.boolean(),
  }),
]);

export const CodeBlockSchema = z.object({
  messageId: z.string(),
  thinking: z.string(),
  commands: z.array(FileCommandSchema),
  isComplete: z.boolean(),
});

export const ParsedMessageSchema = z.object({
  chatContent: z.string(),
  codeContent: z.string(),
  hasCodeStarted: z.boolean(),
  hasCodeEnded: z.boolean(),
});

export const FileStateSchema = z.object({
  filePath: z.string(),
  content: z.string(),
  version: z.number(),
  lastModified: z.date(),
  sourceMessageId: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type FileCommand = z.infer<typeof FileCommandSchema>;
export type CodeBlock = z.infer<typeof CodeBlockSchema>;
export type ParsedMessage = z.infer<typeof ParsedMessageSchema>;
export type FileState = z.infer<typeof FileStateSchema>;

export interface StreamingState {
  codeBlocks: CodeBlock[];
  currentFiles: Map<string, FileState>;
  isCodeMode: boolean;
}
