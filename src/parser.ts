// src/parser.ts
import { Config, ParsedMessage, FileCommand, CodeBlock } from "./types";

// Parser states for handling streaming chunks
enum ParserState {
  NORMAL = 'normal',
  POTENTIAL_TAG_START = 'potential_tag_start', 
  IN_TAG = 'in_tag',
  TAG_COMPLETE = 'tag_complete'
}

// Token buffer for incomplete chunks
interface TokenBuffer {
  content: string;
  position: number;
  potentialTag: string;
}

export class StreamingParser {
  private state: ParserState = ParserState.NORMAL;
  private buffer: TokenBuffer = { content: '', position: 0, potentialTag: '' };
  
  constructor(private config: Config) {}

  parseMessage(content: string): ParsedMessage {
    // Add new content to buffer
    this.buffer.content += content;
    
    // Process buffer using state machine
    return this.processBuffer();
  }

  // State machine buffer processor - handles partial tags in streaming
  private processBuffer(): ParsedMessage {
    let chatContent = '';
    let codeContent = '';
    let hasCodeStarted = false;
    let hasCodeEnded = false;
    
    // Process character by character to handle partial tags
    while (this.buffer.position < this.buffer.content.length) {
      const char = this.buffer.content[this.buffer.position];
      
      switch (this.state) {
        case ParserState.NORMAL:
          if (char === '<') {
            this.state = ParserState.POTENTIAL_TAG_START;
            this.buffer.potentialTag = '<';
          } else {
            chatContent += char;
          }
          break;
          
        case ParserState.POTENTIAL_TAG_START:
          this.buffer.potentialTag += char;
          
          if (this.buffer.potentialTag === this.config.startTag) {
            // Complete start tag found
            this.state = ParserState.IN_TAG;
            hasCodeStarted = true;
            codeContent = this.config.startTag;
            this.buffer.potentialTag = '';
            
            // Extract text before code as chat content
            const beforeCodeEnd = this.buffer.position - this.config.startTag.length + 1;
            chatContent = this.buffer.content.substring(0, beforeCodeEnd);
            
          } else if (!this.config.startTag.startsWith(this.buffer.potentialTag)) {
            // Not our tag, add to chat content
            chatContent += this.buffer.potentialTag;
            this.state = ParserState.NORMAL;
            this.buffer.potentialTag = '';
          }
          // else: keep building potential tag
          break;
          
        case ParserState.IN_TAG:
          codeContent += char;
          
          // Check for end tag
          if (char === '>' && codeContent.endsWith(this.config.endTag)) {
            this.state = ParserState.TAG_COMPLETE;
            hasCodeEnded = true;
            
            // Extract text after code as additional chat content
            const remainingContent = this.buffer.content.substring(this.buffer.position + 1);
            if (remainingContent.trim()) {
              chatContent = chatContent.trim();
              if (chatContent && remainingContent.trim()) {
                chatContent += '\n\n' + remainingContent.trim();
              } else if (!chatContent) {
                chatContent = remainingContent.trim();
              }
            }
            
            // Process remaining buffer
            this.buffer.position = this.buffer.content.length;
            break;
          }
          break;
          
        case ParserState.TAG_COMPLETE:
          // Should not reach here in normal flow
          break;
      }
      
      this.buffer.position++;
    }
    
    // Handle incomplete states (streaming not complete)
    if (this.state === ParserState.POTENTIAL_TAG_START) {
      // Potential tag at end of buffer - don't include in chat content yet
      // Wait for more content to determine if it's actually our tag
      const contentBeforeTag = this.buffer.content.substring(0, this.buffer.position - this.buffer.potentialTag.length + 1);
      
      // Reset position to before potential tag for next processing
      this.buffer.position = this.buffer.position - this.buffer.potentialTag.length + 1;
      
      return {
        chatContent: contentBeforeTag.trim(),
        codeContent: '',
        hasCodeStarted: false,
        hasCodeEnded: false,
      };
    }
    
    if (this.state === ParserState.IN_TAG && !hasCodeEnded) {
      // In the middle of a code block - return chat content before code
      return {
        chatContent: chatContent.trim(),
        codeContent: codeContent,
        hasCodeStarted: true,
        hasCodeEnded: false,
      };
    }
    
    // Reset buffer if processing is complete
    if (hasCodeEnded) {
      this.resetBuffer();
    }
    
    return {
      chatContent: chatContent.trim(),
      codeContent: codeContent,
      hasCodeStarted,
      hasCodeEnded,
    };
  }
  
  // Reset buffer state for next parsing cycle
  private resetBuffer(): void {
    this.buffer = { content: '', position: 0, potentialTag: '' };
    this.state = ParserState.NORMAL;
  }

  parseCodeBlock(codeContent: string, messageId: string): CodeBlock {
    const thinking = this.extractThinking(codeContent);
    const commands = [
      ...this.extractWriteCommands(codeContent),
      ...this.extractModifyCommands(codeContent),
    ];

    return {
      messageId: messageId as `msg-${string}`,
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
      // Check if the match ends with the closing tag by looking at the original content
      const matchStart = match.index || 0;
      const matchEnd = matchStart + match[0].length;
      const isComplete = content.substring(matchEnd - `</${this.config.writeTag}>`.length, matchEnd) === `</${this.config.writeTag}>`;
      
      commands.push({
        action: "write",
        filePath: match[1],
        content: match[2].trim(),
        isComplete,
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
      // Check if the match ends with the closing tag by looking at the original content
      const matchStart = match.index || 0;
      const matchEnd = matchStart + match[0].length;
      const isComplete = content.substring(matchEnd - `</${this.config.modifyTag}>`.length, matchEnd) === `</${this.config.modifyTag}>`;
      
      commands.push({
        action: "modify",
        filePath: match[1],
        changes: match[2] || "",
        content: match[3].trim(),
        isComplete,
      });
    }

    return commands;
  }
}