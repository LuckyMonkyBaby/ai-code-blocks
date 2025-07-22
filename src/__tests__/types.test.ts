// src/__tests__/types.test.ts - v2.0 with TypeScript-only validation
import {
  Config,
  ConfigInput, 
  FileCommand,
  CodeBlock,
  ParsedMessage,
  FileState,
  DEFAULT_CONFIG,
} from '../types';

describe('Types and Interfaces', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CONFIG).toEqual({
        startTag: '<ablo-code>',
        endTag: '</ablo-code>',
        thinkingTag: 'ablo-thinking',
        writeTag: 'ablo-write',
        modifyTag: 'ablo-modify',
      });
    });

    it('should be readonly', () => {
      // TypeScript will catch this at compile-time
      expect(typeof DEFAULT_CONFIG.startTag).toBe('string');
      expect(typeof DEFAULT_CONFIG.endTag).toBe('string');
    });
  });

  describe('Type interfaces', () => {
    it('should allow valid write command', () => {
      const command: FileCommand = {
        action: 'write',
        filePath: 'src/test.js',
        content: 'console.log("test");',
        isComplete: true,
      };

      expect(command.action).toBe('write');
      expect(command.filePath).toBe('src/test.js');
    });

    it('should allow valid modify command', () => {
      const command: FileCommand = {
        action: 'modify',
        filePath: 'src/test.js',
        changes: 'Add error handling',
        content: 'try { console.log("test"); } catch (e) {}',
        isComplete: false,
      };

      expect(command.action).toBe('modify');
      expect('changes' in command).toBe(true);
    });

    it('should allow valid code block', () => {
      const codeBlock: CodeBlock = {
        messageId: 'msg-123',
        thinking: 'Planning the implementation',
        commands: [
          {
            action: 'write',
            filePath: 'index.js',
            content: 'const x = 1;',
            isComplete: true,
          },
        ],
        isComplete: true,
      };

      expect(codeBlock.messageId).toBe('msg-123');
      expect(codeBlock.commands).toHaveLength(1);
    });

    it('should allow valid parsed message', () => {
      const parsed: ParsedMessage = {
        chatContent: 'Hello world',
        codeContent: '<ablo-code>test</ablo-code>',
        hasCodeStarted: true,
        hasCodeEnded: true,
      };

      expect(parsed.chatContent).toBe('Hello world');
      expect(parsed.hasCodeStarted).toBe(true);
    });

    it('should allow valid file state', () => {
      const fileState: FileState = {
        filePath: 'src/components/Button.tsx',
        content: 'export const Button = () => null;',
        version: 3,
        lastModified: new Date('2024-01-01T00:00:00Z'),
        sourceMessageId: 'msg-456',
      };

      expect(fileState.filePath).toBe('src/components/Button.tsx');
      expect(fileState.version).toBe(3);
    });

    it('should allow partial config input', () => {
      const configInput: ConfigInput = {
        startTag: '<custom>',
        endTag: '</custom>',
      };

      expect(configInput.startTag).toBe('<custom>');
    });

    it('should allow empty config input', () => {
      const configInput: ConfigInput = {};
      expect(typeof configInput).toBe('object');
    });
  });
});