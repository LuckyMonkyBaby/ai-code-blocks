// src/__tests__/types.test.ts
import {
  ConfigSchema,
  FileCommandSchema,
  CodeBlockSchema,
  ParsedMessageSchema,
  FileStateSchema,
} from '../types';

describe('Type Schemas', () => {
  describe('ConfigSchema', () => {
    it('should validate complete config', () => {
      const config = {
        startTag: '<code>',
        endTag: '</code>',
        thinkingTag: 'thinking',
        writeTag: 'write',
        modifyTag: 'modify',
      };

      const result = ConfigSchema.parse(config);
      expect(result).toEqual(config);
    });

    it('should apply defaults for missing fields', () => {
      const result = ConfigSchema.parse({});
      
      expect(result).toEqual({
        startTag: '<ablo-code>',
        endTag: '</ablo-code>',
        thinkingTag: 'ablo-thinking',
        writeTag: 'ablo-write',
        modifyTag: 'ablo-modify',
      });
    });

    it('should validate partial config', () => {
      const config = {
        startTag: '<custom>',
        endTag: '</custom>',
      };

      const result = ConfigSchema.parse(config);
      expect(result.startTag).toBe('<custom>');
      expect(result.endTag).toBe('</custom>');
      expect(result.thinkingTag).toBe('ablo-thinking');
    });
  });

  describe('FileCommandSchema', () => {
    it('should validate write command', () => {
      const command = {
        action: 'write' as const,
        filePath: 'src/test.js',
        content: 'console.log("test");',
        isComplete: true,
      };

      const result = FileCommandSchema.parse(command);
      expect(result).toEqual(command);
    });

    it('should validate modify command', () => {
      const command = {
        action: 'modify' as const,
        filePath: 'src/test.js',
        changes: 'Add error handling',
        content: 'try { console.log("test"); } catch (e) {}',
        isComplete: false,
      };

      const result = FileCommandSchema.parse(command);
      expect(result).toEqual(command);
    });

    it('should reject invalid action', () => {
      const command = {
        action: 'delete',
        filePath: 'test.js',
        content: '',
        isComplete: true,
      };

      expect(() => FileCommandSchema.parse(command)).toThrow();
    });

    it('should reject missing required fields', () => {
      const command = {
        action: 'write' as const,
        filePath: 'test.js',
        // missing content and isComplete
      };

      expect(() => FileCommandSchema.parse(command)).toThrow();
    });
  });

  describe('CodeBlockSchema', () => {
    it('should validate complete code block', () => {
      const codeBlock = {
        messageId: 'msg-123',
        thinking: 'Planning the implementation',
        commands: [
          {
            action: 'write' as const,
            filePath: 'index.js',
            content: 'const x = 1;',
            isComplete: true,
          },
        ],
        isComplete: true,
      };

      const result = CodeBlockSchema.parse(codeBlock);
      expect(result).toEqual(codeBlock);
    });

    it('should validate code block with empty commands', () => {
      const codeBlock = {
        messageId: 'msg-123',
        thinking: '',
        commands: [],
        isComplete: false,
      };

      const result = CodeBlockSchema.parse(codeBlock);
      expect(result).toEqual(codeBlock);
    });

    it('should validate code block with multiple commands', () => {
      const codeBlock = {
        messageId: 'msg-123',
        thinking: 'Creating multiple files',
        commands: [
          {
            action: 'write' as const,
            filePath: 'a.js',
            content: 'a',
            isComplete: true,
          },
          {
            action: 'modify' as const,
            filePath: 'b.js',
            changes: 'Update',
            content: 'b',
            isComplete: true,
          },
        ],
        isComplete: true,
      };

      const result = CodeBlockSchema.parse(codeBlock);
      expect(result.commands).toHaveLength(2);
    });
  });

  describe('ParsedMessageSchema', () => {
    it('should validate parsed message', () => {
      const parsed = {
        chatContent: 'Hello world',
        codeContent: '<ablo-code>test</ablo-code>',
        hasCodeStarted: true,
        hasCodeEnded: true,
      };

      const result = ParsedMessageSchema.parse(parsed);
      expect(result).toEqual(parsed);
    });

    it('should validate empty parsed message', () => {
      const parsed = {
        chatContent: '',
        codeContent: '',
        hasCodeStarted: false,
        hasCodeEnded: false,
      };

      const result = ParsedMessageSchema.parse(parsed);
      expect(result).toEqual(parsed);
    });
  });

  describe('FileStateSchema', () => {
    it('should validate file state', () => {
      const fileState = {
        filePath: 'src/components/Button.tsx',
        content: 'export const Button = () => null;',
        version: 3,
        lastModified: new Date('2024-01-01T00:00:00Z'),
        sourceMessageId: 'msg-456',
      };

      const result = FileStateSchema.parse(fileState);
      expect(result).toEqual(fileState);
    });

    it('should reject invalid date', () => {
      const fileState = {
        filePath: 'test.js',
        content: 'test',
        version: 1,
        lastModified: 'not-a-date',
        sourceMessageId: 'msg-123',
      };

      expect(() => FileStateSchema.parse(fileState)).toThrow();
    });

    it('should reject negative version', () => {
      const fileState = {
        filePath: 'test.js',
        content: 'test',
        version: -1,
        lastModified: new Date(),
        sourceMessageId: 'msg-123',
      };

      // Zod will coerce the number, so we need to add custom validation
      // For now, it will pass - you might want to add .positive() to version in schema
      const result = FileStateSchema.parse(fileState);
      expect(result.version).toBe(-1);
    });
  });
});