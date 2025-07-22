// src/__tests__/test-utils.ts
import { Config, FileState, CodeBlock } from '../types';

/**
 * Test utilities for streaming-code-blocks library
 */

export const DEFAULT_TEST_CONFIG: Config = {
  startTag: '<ablo-code>',
  endTag: '</ablo-code>',
  thinkingTag: 'ablo-thinking',
  writeTag: 'ablo-write',
  modifyTag: 'ablo-modify',
};

/**
 * Create a mock message with code blocks
 */
export function createMockMessage(
  id: string,
  role: 'user' | 'assistant',
  content: string
) {
  return { id, role, content };
}

/**
 * Create a mock code block content
 */
export function createCodeBlockContent(options: {
  thinking?: string;
  commands: Array<{
    action: 'write' | 'modify';
    filePath: string;
    content: string;
    changes?: string;
  }>;
  config?: Config;
}) {
  const config = options.config || DEFAULT_TEST_CONFIG;
  let content = `<${config.startTag}>`;

  if (options.thinking) {
    content += `\n<${config.thinkingTag}>\n${options.thinking}\n</${config.thinkingTag}>`;
  }

  for (const cmd of options.commands) {
    if (cmd.action === 'write') {
      content += `\n<${config.writeTag} file_path="${cmd.filePath}">\n${cmd.content}\n</${config.writeTag}>`;
    } else {
      content += `\n<${config.modifyTag} file_path="${cmd.filePath}"${
        cmd.changes ? ` changes="${cmd.changes}"` : ''
      }>\n${cmd.content}\n</${config.modifyTag}>`;
    }
  }

  content += `\n</${config.endTag}>`;
  return content;
}

/**
 * Create a mock file state
 */
export function createMockFileState(
  partial: Partial<FileState> & { filePath: string }
): FileState {
  return {
    content: '',
    version: 1,
    lastModified: new Date(),
    sourceMessageId: 'mock-msg',
    ...partial,
  };
}

/**
 * Create a mock code block
 */
export function createMockCodeBlock(
  partial: Partial<CodeBlock> & { messageId: string }
): CodeBlock {
  return {
    thinking: '',
    commands: [],
    isComplete: true,
    ...partial,
  };
}

/**
 * Simulate streaming by returning content in chunks
 */
export function* streamContent(content: string, chunkSize: number = 50) {
  for (let i = 0; i < content.length; i += chunkSize) {
    yield content.substring(0, i + chunkSize);
  }
}

/**
 * Mock storage adapter for testing
 */
export class MockStorageAdapter {
  sessions = new Map<string, any>();
  files = new Map<string, { content: string; metadata: any }>();
  
  // Track calls for assertions
  calls = {
    saveSession: [] as Array<{ sessionId: string; data: any }>,
    loadSession: [] as string[],
    saveFile: [] as Array<{ filePath: string; content: string; metadata: any }>,
    loadFile: [] as string[],
    deleteFile: [] as string[],
  };

  async saveSession(sessionId: string, data: any): Promise<void> {
    this.calls.saveSession.push({ sessionId, data });
    this.sessions.set(sessionId, data);
  }

  async loadSession(sessionId: string): Promise<any | null> {
    this.calls.loadSession.push(sessionId);
    return this.sessions.get(sessionId) || null;
  }

  async saveFile(filePath: string, content: string, metadata: any): Promise<void> {
    this.calls.saveFile.push({ filePath, content, metadata });
    this.files.set(filePath, { content, metadata });
  }

  async loadFile(filePath: string) {
    this.calls.loadFile.push(filePath);
    return this.files.get(filePath) || null;
  }

  async deleteFile(filePath: string): Promise<void> {
    this.calls.deleteFile.push(filePath);
    this.files.delete(filePath);
  }

  reset() {
    this.sessions.clear();
    this.files.clear();
    this.calls = {
      saveSession: [],
      loadSession: [],
      saveFile: [],
      loadFile: [],
      deleteFile: [],
    };
  }
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert file content matches expected
 */
export function assertFileContent(
  file: FileState | undefined,
  expected: {
    filePath: string;
    content?: string | RegExp;
    version?: number;
  }
) {
  expect(file).toBeDefined();
  expect(file!.filePath).toBe(expected.filePath);
  
  if (expected.content !== undefined) {
    if (expected.content instanceof RegExp) {
      expect(file!.content).toMatch(expected.content);
    } else {
      expect(file!.content).toBe(expected.content);
    }
  }
  
  if (expected.version !== undefined) {
    expect(file!.version).toBe(expected.version);
  }
}

/**
 * Create a complete test message with before/after content
 */
export function createTestMessage(options: {
  beforeCode?: string;
  codeBlock: string;
  afterCode?: string;
}) {
  const parts = [];
  if (options.beforeCode) parts.push(options.beforeCode);
  parts.push(options.codeBlock);
  if (options.afterCode) parts.push(options.afterCode);
  return parts.join('\n\n');
}