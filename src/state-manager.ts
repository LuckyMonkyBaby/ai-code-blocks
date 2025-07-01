// src/state-manager.ts
import { Config, CodeBlock, FileState, StreamingState } from "./types";
import { StreamingParser } from "./parser";
import { StorageAdapter, MemoryStorageAdapter } from "./storage";

export class StreamingStateManager {
  private parser: StreamingParser;
  private state: StreamingState;
  private storage: StorageAdapter;
  private threadId?: string;

  constructor(
    config: Config,
    storage: StorageAdapter = new MemoryStorageAdapter(),
    threadId?: string
  ) {
    this.parser = new StreamingParser(config);
    this.storage = storage;
    this.threadId = threadId;
    this.state = {
      codeBlocks: [],
      currentFiles: new Map(),
      isCodeMode: false,
    };
  }

  async processMessage(messageId: string, content: string): Promise<void> {
    const parsed = this.parser.parseMessage(content);

    if (parsed.hasCodeStarted) {
      const codeBlock = this.parser.parseCodeBlock(
        parsed.codeContent,
        messageId
      );
      await this.updateCodeBlock(codeBlock);
      await this.updateFiles(codeBlock);
      this.state.isCodeMode = !parsed.hasCodeEnded;
    } else {
      this.state.isCodeMode = false;
    }
  }

  async loadFromStorage(sessionId: string): Promise<void> {
    const data = await this.storage.loadSession(sessionId);
    if (data) {
      this.state = {
        ...data,
        currentFiles: new Map(Object.entries(data.currentFiles || {})),
      };
    }
  }

  async saveToStorage(sessionId: string): Promise<void> {
    await this.storage.saveSession(sessionId, {
      ...this.state,
      currentFiles: Object.fromEntries(this.state.currentFiles),
    });
  }

  getCleanedMessage(content: string): string {
    const parsed = this.parser.parseMessage(content);
    return (
      parsed.chatContent ||
      (parsed.hasCodeStarted && !parsed.hasCodeEnded ? "" : content)
    );
  }

  getState(): StreamingState {
    return {
      ...this.state,
      currentFiles: new Map(this.state.currentFiles),
    };
  }

  getCurrentFiles(): FileState[] {
    return Array.from(this.state.currentFiles.values());
  }

  getFile(filePath: string): FileState | undefined {
    return this.state.currentFiles.get(filePath);
  }

  clear(): void {
    this.state = {
      codeBlocks: [],
      currentFiles: new Map(),
      isCodeMode: false,
    };
  }

  private async updateCodeBlock(codeBlock: CodeBlock): Promise<void> {
    const existingIndex = this.state.codeBlocks.findIndex(
      (block) => block.messageId === codeBlock.messageId
    );

    if (existingIndex >= 0) {
      this.state.codeBlocks[existingIndex] = codeBlock;
    } else {
      this.state.codeBlocks.push(codeBlock);
    }
  }

  private async updateFiles(codeBlock: CodeBlock): Promise<void> {
    for (const command of codeBlock.commands) {
      if (!command.isComplete) continue;

      const existing = this.state.currentFiles.get(command.filePath);

      const fileState: FileState = {
        filePath: command.filePath,
        content: command.content,
        version: existing ? existing.version + 1 : 1,
        lastModified: new Date(),
        sourceMessageId: codeBlock.messageId,
      };

      this.state.currentFiles.set(command.filePath, fileState);

      await this.storage.saveFile(command.filePath, command.content, {
        version: fileState.version,
        sourceMessageId: codeBlock.messageId,
        threadId: this.threadId,
      });
    }
  }
}
