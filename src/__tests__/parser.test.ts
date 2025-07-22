// src/__tests__/parser.test.ts
import { StreamingParser } from '../parser';
import { Config } from '../types';

describe('StreamingParser', () => {
  const defaultConfig: Config = {
    startTag: '<ablo-code>',
    endTag: '</ablo-code>',
    thinkingTag: 'ablo-thinking',
    writeTag: 'ablo-write',
    modifyTag: 'ablo-modify',
  };

  let parser: StreamingParser;

  beforeEach(() => {
    parser = new StreamingParser(defaultConfig);
  });

  describe('parseMessage', () => {
    it('should parse message without code blocks', () => {
      const content = 'This is a regular message without any code.';
      const result = parser.parseMessage(content);

      expect(result).toEqual({
        chatContent: content,
        codeContent: '',
        hasCodeStarted: false,
        hasCodeEnded: false,
      });
    });

    it('should parse message with complete code block', () => {
      const beforeCode = 'I will create a component for you.';
      const codeBlock = '<ablo-code>console.log("test");</ablo-code>';
      const afterCode = 'The component is ready!';
      const content = `${beforeCode}\n\n${codeBlock}\n\n${afterCode}`;

      const result = parser.parseMessage(content);

      expect(result).toEqual({
        chatContent: `${beforeCode}\n\n${afterCode}`,
        codeContent: codeBlock,
        hasCodeStarted: true,
        hasCodeEnded: true,
      });
    });

    it('should handle streaming incomplete code block', () => {
      const beforeCode = 'Starting to write code...';
      const partialCode = '<ablo-code>console.log("incomplete';
      const content = `${beforeCode}\n\n${partialCode}`;

      const result = parser.parseMessage(content);

      expect(result).toEqual({
        chatContent: beforeCode,
        codeContent: partialCode,
        hasCodeStarted: true,
        hasCodeEnded: false,
      });
    });

    it('should handle empty content before/after code block', () => {
      const codeBlock = '<ablo-code>test</ablo-code>';
      const result = parser.parseMessage(codeBlock);

      expect(result).toEqual({
        chatContent: '',
        codeContent: codeBlock,
        hasCodeStarted: true,
        hasCodeEnded: true,
      });
    });
  });

  describe('parseCodeBlock', () => {
    it('should extract thinking content', () => {
      const codeContent = `<ablo-code>
        <ablo-thinking>
        Planning to create a button component
        </ablo-thinking>
        <ablo-write file_path="Button.tsx">
        export const Button = () => <button>Click me</button>;
        </ablo-write>
      </ablo-code>`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.thinking).toBe('Planning to create a button component');
      expect(result.messageId).toBe('msg-123');
      expect(result.isComplete).toBe(true);
    });

    it('should extract write commands', () => {
      const codeContent = `<ablo-code>
        <ablo-write file_path="components/Button.tsx">
        interface ButtonProps {
          onClick: () => void;
        }
        export const Button = ({ onClick }: ButtonProps) => {
          return <button onClick={onClick}>Click</button>;
        };
        </ablo-write>
      </ablo-code>`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        action: 'write',
        filePath: 'components/Button.tsx',
        content: expect.stringContaining('interface ButtonProps'),
        isComplete: true,
      });
    });

    it('should extract modify commands', () => {
      const codeContent = `<ablo-code>
        <ablo-modify file_path="Button.tsx" changes="Add disabled prop">
        interface ButtonProps {
          onClick: () => void;
          disabled?: boolean;
        }
        </ablo-modify>
      </ablo-code>`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0]).toEqual({
        action: 'modify',
        filePath: 'Button.tsx',
        changes: 'Add disabled prop',
        content: expect.stringContaining('disabled?: boolean'),
        isComplete: true,
      });
    });

    it('should handle multiple commands', () => {
      const codeContent = `<ablo-code>
        <ablo-write file_path="Button.tsx">Button content</ablo-write>
        <ablo-write file_path="Button.css">Button styles</ablo-write>
        <ablo-modify file_path="index.ts" changes="Export Button">export { Button }</ablo-modify>
      </ablo-code>`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.commands).toHaveLength(3);
      expect(result.commands[0].filePath).toBe('Button.tsx');
      expect(result.commands[1].filePath).toBe('Button.css');
      expect(result.commands[2].filePath).toBe('index.ts');
    });

    it('should handle incomplete commands during streaming', () => {
      const codeContent = `<ablo-code>
        <ablo-write file_path="Button.tsx">
        interface ButtonProps {
          onClick: () => void;`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].isComplete).toBe(false);
      expect(result.isComplete).toBe(false);
    });

    it('should handle commands with special characters in file paths', () => {
      const codeContent = `<ablo-code>
        <ablo-write file_path="src/components/@shared/Button.tsx">
        export const Button = () => null;
        </ablo-write>
      </ablo-code>`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.commands[0].filePath).toBe('src/components/@shared/Button.tsx');
    });

    it('should handle missing thinking tag gracefully', () => {
      const codeContent = `<ablo-code>
        <ablo-write file_path="test.js">console.log("test");</ablo-write>
      </ablo-code>`;

      const result = parser.parseCodeBlock(codeContent, 'msg-123');

      expect(result.thinking).toBe('');
      expect(result.commands).toHaveLength(1);
    });
  });

  describe('custom configuration', () => {
    it('should work with custom tags', () => {
      const customConfig: Config = {
        startTag: '<code>',
        endTag: '</code>',
        thinkingTag: 'thinking',
        writeTag: 'write',
        modifyTag: 'modify',
      };

      const customParser = new StreamingParser(customConfig);
      const content = '<code><write file_path="test.js">content</write></code>';

      const parsed = customParser.parseMessage(content);
      const codeBlock = customParser.parseCodeBlock(parsed.codeContent, 'msg-123');

      expect(parsed.hasCodeStarted).toBe(true);
      expect(codeBlock.commands).toHaveLength(1);
      expect(codeBlock.commands[0].filePath).toBe('test.js');
    });
  });
});