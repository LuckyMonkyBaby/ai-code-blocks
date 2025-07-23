// Test for streaming text persistence fix
import { createStreamingStore } from '../store';
import { DEFAULT_CONFIG } from '../types';
import { MemoryStorageAdapter } from '../storage';

describe('Streaming Text Persistence', () => {
  let store: ReturnType<typeof createStreamingStore>;

  beforeEach(() => {
    store = createStreamingStore();
    store.getState().initialize(DEFAULT_CONFIG, new MemoryStorageAdapter());
  });

  it('should preserve text during code streaming', () => {
    const messageId = 'msg-1';
    
    // Initial text only
    const content1 = "Hello, I'll create a file";
    const result1 = store.getState().getCleanedMessage(content1, messageId);
    expect(result1).toBe("Hello, I'll create a file");
    
    // Code starts streaming - should preserve initial text
    const content2 = "Hello, I'll create a file<ablo-code>";
    const result2 = store.getState().getCleanedMessage(content2, messageId);
    expect(result2).toBe("Hello, I'll create a file");
    
    // Code continues streaming - should still preserve initial text
    const content3 = "Hello, I'll create a file<ablo-code><ablo-write file_path=\"test.ts\">";
    const result3 = store.getState().getCleanedMessage(content3, messageId);
    expect(result3).toBe("Hello, I'll create a file");
    
    // Code completes with text after
    const content4 = 'Hello, I\'ll create a file<ablo-code><ablo-write file_path="test.ts">content</ablo-write></ablo-code>Done!';
    const result4 = store.getState().getCleanedMessage(content4, messageId);
    expect(result4).toBe("Hello, I'll create a file\n\nDone!");
  });

  it('should handle messages without code blocks normally', () => {
    const messageId = 'msg-2';
    const content = "This is just a regular message.";
    const result = store.getState().getCleanedMessage(content, messageId);
    expect(result).toBe("This is just a regular message.");
  });

  it('should work without messageId (fallback behavior)', () => {
    const content = "Hello, I'll create a file<ablo-code>";
    const result = store.getState().getCleanedMessage(content);
    expect(result).toBe("Hello, I'll create a file");
  });

  it('should handle empty chat content gracefully', () => {
    const messageId = 'msg-3';
    
    // Code block without any preceding text
    const content = '<ablo-code><ablo-write file_path="test.ts">content</ablo-write>';
    const result = store.getState().getCleanedMessage(content, messageId);
    // Should return original content as fallback when no chat content exists
    expect(result).toBe(content);
  });
});