// src/__tests__/use-streaming-code-blocks-react-query.test.tsx
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamingCodeBlocksWithReactQuery } from '../use-streaming-code-blocks-react-query';

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

describe('useStreamingCodeBlocksWithReactQuery', () => {
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
      useStreamingCodeBlocksWithReactQuery({ endpoint: '/api/chat' })
    );

    expect(result.current.files).toEqual([]);
    expect(result.current.codeBlocks).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.isLoadingSession).toBe(false);
    expect(result.current.isSavingSession).toBe(false);
    expect(result.current.sessionError).toBe(null);
    expect(typeof result.current.refetchSession).toBe('function');
    expect(typeof result.current.isSessionStale).toBe('boolean');
    expect(result.current.lastSessionUpdate).toBe(null);
  });

  it('should throw error when QueryClient is not available', () => {
    // Mock console.error to suppress expected error output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() =>
        useStreamingCodeBlocksWithReactQuery({ endpoint: '/api/chat' })
      );
    }).toThrow('ai-code-blocks: No QueryClient found');
    
    consoleSpy.mockRestore();
  });

  it('should provide enhanced React Query features', () => {
    const { result } = renderHookWithQueryClient(() =>
      useStreamingCodeBlocksWithReactQuery({ 
        endpoint: '/api/chat',
        sessionId: 'test-session',
        persistSession: true
      })
    );

    // Should have all the base functionality
    expect(result.current.files).toEqual([]);
    expect(result.current.codeBlocks).toEqual([]);
    expect(result.current.isStreaming).toBe(false);
    
    // Should have enhanced React Query features
    expect(typeof result.current.isSessionStale).toBe('boolean');
    expect(result.current.lastSessionUpdate).toBe(null);
    expect(typeof result.current.refetchSession).toBe('function');
  });
});