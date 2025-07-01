// src/parser.ts
import { Config, ParsedMessage, FileCommand, CodeBlock } from "./types";

export class StreamingParser {
  constructor(private config: Config) {}

  parseMessage(content: string): ParsedMessage {
    const startIndex = content.indexOf(this.config.startTag);
    const endIndex = content.indexOf(this.config.endTag);

    if (startIndex === -1) {
      return {
        chatContent: content,
        codeContent: "",
        hasCodeStarted: false,
        hasCodeEnded: false,
      };
    }

    if (endIndex === -1) {
      return {
        chatContent: content.substring(0, startIndex).trim(),
        codeContent: content.substring(startIndex),
        hasCodeStarted: true,
        hasCodeEnded: false,
      };
    }

    const beforeCode = content.substring(0, startIndex).trim();
    const codeBlock = content.substring(
      startIndex,
      endIndex + this.config.endTag.length
    );
    const afterCode = content
      .substring(endIndex + this.config.endTag.length)
      .trim();

    return {
      chatContent: [beforeCode, afterCode].filter(Boolean).join("\n\n"),
      codeContent: codeBlock,
      hasCodeStarted: true,
      hasCodeEnded: true,
    };
  }

  parseCodeBlock(codeContent: string, messageId: string): CodeBlock {
    const thinking = this.extractThinking(codeContent);
    const commands = [
      ...this.extractWriteCommands(codeContent),
      ...this.extractModifyCommands(codeContent),
    ];

    return {
      messageId,
      thinking,
      commands,
      isComplete: codeContent.includes(this.config.endTag),
    };
  }

  private extractThinking(content: string): string {
    const regex = new RegExp(
      `<${this.config.thinkingTag}>([\\s\\S]*?)(?:<\\/${this.config.thinkingTag}>|$)`
    );
    return content.match(regex)?.[1]?.trim() || "";
  }

  private extractWriteCommands(content: string): FileCommand[] {
    const commands: FileCommand[] = [];
    const regex = new RegExp(
      `<${this.config.writeTag}\\s+file_path="([^"]+)">([\\s\\S]*?)(?:<\\/${this.config.writeTag}>|$)`,
      "g"
    );

    let match;
    while ((match = regex.exec(content)) !== null) {
      commands.push({
        action: "write",
        filePath: match[1],
        content: match[2].trim(),
        isComplete: match[2].includes(`</${this.config.writeTag}>`),
      });
    }

    return commands;
  }

  private extractModifyCommands(content: string): FileCommand[] {
    const commands: FileCommand[] = [];
    const regex = new RegExp(
      `<${this.config.modifyTag}\\s+file_path="([^"]+)"(?:\\s+changes="([^"]*)")?>([\\s\\S]*?)(?:<\\/${this.config.modifyTag}>|$)`,
      "g"
    );

    let match;
    while ((match = regex.exec(content)) !== null) {
      commands.push({
        action: "modify",
        filePath: match[1],
        changes: match[2] || "",
        content: match[3].trim(),
        isComplete: match[3].includes(`</${this.config.modifyTag}>`),
      });
    }

    return commands;
  }
}
