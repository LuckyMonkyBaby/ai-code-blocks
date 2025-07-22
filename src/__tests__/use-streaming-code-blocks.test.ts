// src/__tests__/use-streaming-code-blocks.test.tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamingCodeBlocks } from '../use-streaming-code-blocks';
import { MemoryStorageAdapter } from '../storage';
import { FileState, CodeBlock } from '../types';

// Mock the useChat hook from @ai-sdk/react
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    input: '',
    handleInputChange: jest.fn(),
    handleSubmit: jest.fn(),
    isLoading: false,
    append: jest.fn(),
    reload: jest.fn(),
    stop: jest.fn(),
  })),
}));

import { useChat } from '@ai-sdk/react';

describe('useStreamingCodeBlocks', () => {
  const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderHookWithQueryClient = (callback: () => any) => {
    return renderHook(callback, {
      wrapper: ({ children }) => React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      ),
    });
  };

  it('should initialize with empty state', () => {
    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({ endpoint: '/api/chat' })
    );

    expect(result.current.files).toEqual([]);
    expect(result.current.codeBlocks).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
  });

  it('should process assistant messages with code blocks', async () => {
    const messages = [
      {
        id: 'msg-1',
        role: 'assistant' as const,
        content: `I'll create a component.
        
<ablo-code>
<ablo-write file_path="Button.tsx">
export const Button = () => <button>Click</button>;
</ablo-write>
</ablo-code>

Done!`,
      },
    ];

    mockUseChat.mockReturnValue({
      messages,
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({ endpoint: '/api/chat' })
    );

    // Wait for useEffect to process
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].filePath).toBe('Button.tsx');
    expect(result.current.codeBlocks).toHaveLength(1);
    expect(result.current.messages[0].content).toBe("I'll create a component.\n\nDone!");
  });

  it('should not process user messages', async () => {
    const messages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: '<ablo-code>This should not be processed</ablo-code>',
      },
    ];

    mockUseChat.mockReturnValue({
      messages,
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({ endpoint: '/api/chat' })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.files).toHaveLength(0);
    expect(result.current.messages[0].content).toBe(messages[0].content);
  });

  it('should handle file changes callback', async () => {
    const onFileChanged = jest.fn();
    let currentMessages: any[] = [];

    mockUseChat.mockImplementation(() => ({
      messages: currentMessages,
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    }));

    const { rerender } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({
        endpoint: '/api/chat',
        onFileChanged,
      })
    );

    // Add first message
    currentMessages = [{
      id: 'msg-1',
      role: 'assistant' as const,
      content: '<ablo-code><ablo-write file_path="test.js">v1</ablo-write></ablo-code>',
    }];

    rerender();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onFileChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: 'test.js',
        content: 'v1',
        version: 1,
      })
    );

    // Update file
    currentMessages = [
      ...currentMessages,
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: '<ablo-code><ablo-write file_path="test.js">v2</ablo-write></ablo-code>',
      },
    ];

    rerender();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onFileChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: 'test.js',
        content: 'v2',
        version: 2,
      })
    );
  });

  it('should handle code block completion callback', async () => {
    const onCodeBlockComplete = jest.fn();

    mockUseChat.mockReturnValue({
      messages: [{
        id: 'msg-1',
        role: 'assistant' as const,
        content: '<ablo-code><ablo-write file_path="test.js">content</ablo-write></ablo-code>',
      }],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({
        endpoint: '/api/chat',
        onCodeBlockComplete,
      })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onCodeBlockComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'msg-1',
        isComplete: true,
        commands: expect.arrayContaining([
          expect.objectContaining({
            filePath: 'test.js',
          }),
        ]),
      })
    );
  });

  it('should use custom configuration', async () => {
    const messages = [{
      id: 'msg-1',
      role: 'assistant' as const,
      content: '<code><write file_path="test.js">custom</write></code>',
    }];

    mockUseChat.mockReturnValue({
      messages,
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({
        endpoint: '/api/chat',
        config: {
          startTag: '<code>',
          endTag: '</code>',
          writeTag: 'write',
        },
      })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].content).toBe('custom');
  });

  it('should handle clearAll', () => {
    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({ endpoint: '/api/chat' })
    );

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.codeBlocks).toEqual([]);
  });

  it('should handle getFile', async () => {
    mockUseChat.mockReturnValue({
      messages: [{
        id: 'msg-1',
        role: 'assistant' as const,
        content: '<ablo-code><ablo-write file_path="test.js">content</ablo-write></ablo-code>',
      }],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({ endpoint: '/api/chat' })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const file = result.current.getFile('test.js');
    expect(file).toBeDefined();
    expect(file?.content).toBe('content');

    const nonExistent = result.current.getFile('non-existent.js');
    expect(nonExistent).toBeUndefined();
  });

  it('should persist session when enabled', async () => {
    const storage = new MemoryStorageAdapter();
    const saveSpy = jest.spyOn(storage, 'saveSession');

    mockUseChat.mockReturnValue({
      messages: [{
        id: 'msg-1',
        role: 'assistant' as const,
        content: '<ablo-code><ablo-write file_path="test.js">content</ablo-write></ablo-code>',
      }],
      input: '',
      handleInputChange: jest.fn(),
      handleSubmit: jest.fn(),
      isLoading: false,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({
        endpoint: '/api/chat',
        storage,
        sessionId: 'thread-123',
        persistSession: true,
      })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for debounce
    });

    expect(saveSpy).toHaveBeenCalledWith('thread-123', expect.any(Object));
  });

  it('should load session on mount when persist enabled', async () => {
    const storage = new MemoryStorageAdapter();
    const sessionData = {
      codeBlocks: [],
      // Session data structure for v2.0
      files: { 'existing.js': { content: 'existing' } },
      isStreaming: false,
    };
    
    await storage.saveSession('thread-123', sessionData);
    const loadSpy = jest.spyOn(storage, 'loadSession');

    renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({
        endpoint: '/api/chat',
        storage,
        sessionId: 'thread-123',
        persistSession: true,
      })
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(loadSpy).toHaveBeenCalledWith('thread-123');
  });

  it('should pass through chat interface methods', () => {
    const mockHandleSubmit = jest.fn();
    const mockAppend = jest.fn();

    mockUseChat.mockReturnValue({
      messages: [],
      input: 'test input',
      handleInputChange: jest.fn(),
      handleSubmit: mockHandleSubmit,
      isLoading: true,
      append: mockAppend,
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined,
      setMessages: jest.fn(),
      setInput: jest.fn(),
      experimental_addToolResult: jest.fn(),
      addToolResult: jest.fn(),
    });

    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocks({ endpoint: '/api/chat' })
    );

    expect(result.current.input).toBe('test input');
    expect(result.current.isLoading).toBe(true);
    
    result.current.handleSubmit({} as any);
    expect(mockHandleSubmit).toHaveBeenCalled();

    result.current.append({ role: 'user', content: 'test' });
    expect(mockAppend).toHaveBeenCalled();
  });
});