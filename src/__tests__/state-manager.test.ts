// src/__tests__/state-manager.test.ts
import { StreamingStateManager } from '../state-manager';
import { Config } from '../types';
import { MemoryStorageAdapter } from '../storage';

describe('StreamingStateManager', () => {
  const defaultConfig: Config = {
    startTag: '<ablo-code>',
    endTag: '</ablo-code>',
    thinkingTag: 'ablo-thinking',
    writeTag: 'ablo-write',
    modifyTag: 'ablo-modify',
  };

  let manager: StreamingStateManager;
  let storage: MemoryStorageAdapter;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    manager = new StreamingStateManager(defaultConfig, storage);
  });

  describe('processMessage', () => {
    it('should process message without code blocks', async () => {
      const messageId = 'msg-1';
      const content = 'This is a regular message.';

      await manager.processMessage(messageId, content);
      const state = manager.getState();

      expect(state.codeBlocks).toHaveLength(0);
      expect(state.currentFiles.size).toBe(0);
      expect(state.isCodeMode).toBe(false);
    });

    it('should process message with complete code block', async () => {
      const messageId = 'msg-1';
      const content = `I'll create a button component.
      
<ablo-code>
<ablo-thinking>Creating Button component</ablo-thinking>
<ablo-write file_path="Button.tsx">
export const Button = () => <button>Click me</button>;
</ablo-write>
</ablo-code>

The component is ready!`;

      await manager.processMessage(messageId, content);
      const state = manager.getState();

      expect(state.codeBlocks).toHaveLength(1);
      expect(state.codeBlocks[0].messageId).toBe(messageId);
      expect(state.codeBlocks[0].thinking).toBe('Creating Button component');
      expect(state.currentFiles.size).toBe(1);
      expect(state.currentFiles.has('Button.tsx')).toBe(true);
      expect(state.isCodeMode).toBe(false);
    });

    it('should handle streaming incomplete code block', async () => {
      const messageId = 'msg-1';
      const content = `Starting to write code...

<ablo-code>
<ablo-write file_path="App.tsx">
function App() {
  return <div>`;

      await manager.processMessage(messageId, content);
      const state = manager.getState();

      expect(state.isCodeMode).toBe(true);
      expect(state.codeBlocks).toHaveLength(1);
      expect(state.codeBlocks[0].isComplete).toBe(false);
      expect(state.currentFiles.size).toBe(0); // Not saved until complete
    });

    it('should update existing code block on subsequent messages', async () => {
      const messageId = 'msg-1';
      const content1 = '<ablo-code><ablo-write file_path="test.js">console.log("';
      const content2 = '<ablo-code><ablo-write file_path="test.js">console.log("hello");</ablo-write></ablo-code>';

      await manager.processMessage(messageId, content1);
      await manager.processMessage(messageId, content2);

      const state = manager.getState();
      expect(state.codeBlocks).toHaveLength(1);
      expect(state.currentFiles.size).toBe(1);
      expect(state.currentFiles.get('test.js')?.content).toBe('console.log("hello");');
    });
  });

  describe('file management', () => {
    it('should track file versions', async () => {
      const messageId1 = 'msg-1';
      const messageId2 = 'msg-2';

      // First version
      await manager.processMessage(messageId1, `
<ablo-code>
<ablo-write file_path="config.js">
export const config = { version: 1 };
</ablo-write>
</ablo-code>`);

      const file1 = manager.getFile('config.js');
      expect(file1?.version).toBe(1);

      // Second version
      await manager.processMessage(messageId2, `
<ablo-code>
<ablo-modify file_path="config.js" changes="Update version">
export const config = { version: 2 };
</ablo-modify>
</ablo-code>`);

      const file2 = manager.getFile('config.js');
      expect(file2?.version).toBe(2);
      expect(file2?.sourceMessageId).toBe(messageId2);
    });

    it('should not increment version if content unchanged', async () => {
      const content = 'const x = 1;';
      
      await manager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="test.js">${content}</ablo-write>
</ablo-code>`);

      const version1 = manager.getFile('test.js')?.version;

      await manager.processMessage('msg-2', `
<ablo-code>
<ablo-write file_path="test.js">${content}</ablo-write>
</ablo-code>`);

      const version2 = manager.getFile('test.js')?.version;
      expect(version2).toBe(version1);
    });

    it('should save files to storage', async () => {
      const spy = jest.spyOn(storage, 'saveFile');

      await manager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="test.js">const test = true;</ablo-write>
</ablo-code>`);

      expect(spy).toHaveBeenCalledWith(
        'test.js',
        'const test = true;',
        expect.objectContaining({
          version: 1,
          sourceMessageId: 'msg-1',
        })
      );
    });
  });

  describe('getCleanedMessage', () => {
    it('should remove complete code blocks from message', () => {
      const content = `Here's your component:

<ablo-code>
<ablo-write file_path="Button.tsx">
export const Button = () => <button>Click</button>;
</ablo-write>
</ablo-code>

You can now use it!`;

      const cleaned = manager.getCleanedMessage(content);
      expect(cleaned).toBe("Here's your component:\n\nYou can now use it!");
      expect(cleaned).not.toContain('<ablo-code>');
      expect(cleaned).not.toContain('Button.tsx');
    });

    it('should return empty string for incomplete code blocks', () => {
      const content = `Starting...

<ablo-code>
<ablo-write file_path="test.js">
incomplete`;

      const cleaned = manager.getCleanedMessage(content);
      expect(cleaned).toBe('');
    });

    it('should return original content if no code blocks', () => {
      const content = 'Just a regular message without any code.';
      const cleaned = manager.getCleanedMessage(content);
      expect(cleaned).toBe(content);
    });
  });

  describe('state persistence', () => {
    it('should save state to storage', async () => {
      await manager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="index.js">console.log("test");</ablo-write>
</ablo-code>`);

      const sessionId = 'test-session';
      await manager.saveToStorage(sessionId);

      const savedData = await storage.loadSession(sessionId);
      expect(savedData).toBeDefined();
      expect(savedData.codeBlocks).toHaveLength(1);
      expect(savedData.currentFiles['index.js']).toBeDefined();
    });

    it('should load state from storage', async () => {
      const sessionId = 'test-session';
      const sessionData = {
        codeBlocks: [{
          messageId: 'old-msg',
          thinking: 'Previous thinking',
          commands: [],
          isComplete: true,
        }],
        currentFiles: {
          'old-file.js': {
            filePath: 'old-file.js',
            content: 'old content',
            version: 3,
            lastModified: new Date(),
            sourceMessageId: 'old-msg',
          }
        },
        isCodeMode: false,
      };

      await storage.saveSession(sessionId, sessionData);
      await manager.loadFromStorage(sessionId);

      const state = manager.getState();
      expect(state.codeBlocks).toHaveLength(1);
      expect(state.currentFiles.get('old-file.js')?.version).toBe(3);
    });
  });

  describe('getCurrentFiles', () => {
    it('should return array of current files', async () => {
      await manager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="a.js">const a = 1;</ablo-write>
<ablo-write file_path="b.js">const b = 2;</ablo-write>
</ablo-code>`);

      const files = manager.getCurrentFiles();
      expect(files).toHaveLength(2);
      expect(files.map(f => f.filePath).sort()).toEqual(['a.js', 'b.js']);
    });
  });

  describe('clear', () => {
    it('should reset all state', async () => {
      await manager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="test.js">content</ablo-write>
</ablo-code>`);

      manager.clear();
      const state = manager.getState();

      expect(state.codeBlocks).toHaveLength(0);
      expect(state.currentFiles.size).toBe(0);
      expect(state.isCodeMode).toBe(false);
    });
  });

  describe('with threadId', () => {
    it('should include threadId in file metadata', async () => {
      const threadManager = new StreamingStateManager(defaultConfig, storage, 'thread-123');
      const spy = jest.spyOn(storage, 'saveFile');

      await threadManager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="test.js">content</ablo-write>
</ablo-code>`);

      expect(spy).toHaveBeenCalledWith(
        'test.js',
        'content',
        expect.objectContaining({
          threadId: 'thread-123',
        })
      );
    });
  });
});