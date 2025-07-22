# Testing Documentation

This directory contains comprehensive tests for the streaming-code-blocks library.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Unit Tests

- **`parser.test.ts`** - Tests for the StreamingParser class
  - Message parsing with and without code blocks
  - Code block extraction (thinking, write, modify commands)
  - Streaming/incomplete content handling
  - Custom configuration support

- **`storage.test.ts`** - Tests for storage adapters
  - MemoryStorageAdapter implementation
  - Session save/load functionality
  - File management operations
  - Error handling

- **`state-manager.test.ts`** - Tests for StreamingStateManager
  - Message processing workflow
  - File versioning and updates
  - State persistence
  - Message cleaning for display

- **`types.test.ts`** - Tests for Zod schemas
  - Schema validation
  - Default value application
  - Error cases

### Integration Tests

- **`integration.test.ts`** - End-to-end workflow tests
  - Complete conversation flows
  - Multi-file operations
  - Streaming simulation
  - Canvas/fabric.js specific scenarios

### Hook Tests

- **`use-streaming-code-blocks.test.tsx`** - React hook tests
  - Hook initialization and state
  - Message processing
  - Callbacks (onFileChanged, onCodeBlockComplete)  
  - Storage integration
  - Error handling

### Example Tests

- **`example-usage.test.tsx`** - Examples for users
  - Testing components that use the hook
  - Custom storage adapter usage
  - Error scenario handling

## Test Utilities

The `test-utils.ts` file provides helpful utilities:

```typescript
// Create mock messages
const message = createMockMessage('id', 'assistant', 'content');

// Create code block content
const codeBlock = createCodeBlockContent({
  thinking: 'Planning implementation',
  commands: [{
    action: 'write',
    filePath: 'test.js',
    content: 'console.log("test");'
  }]
});

// Mock storage for testing
const storage = new MockStorageAdapter();

// Simulate streaming
for (const chunk of streamContent(fullContent, 50)) {
  await processChunk(chunk);
}
```

## Writing Tests for Your Implementation

When using this library in your project, you can test your components:

```typescript
import { renderHook } from '@testing-library/react';
import { useStreamingCodeBlocks } from '@luckymonkybaby/streaming-code-blocks';
import { createCodeBlockContent, MockStorageAdapter } from '@luckymonkybaby/streaming-code-blocks/test-utils';

// Mock the AI SDK
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn()
}));

test('my component handles code blocks', async () => {
  const storage = new MockStorageAdapter();
  
  const { result } = renderHook(() => 
    useStreamingCodeBlocks({
      apiEndpoint: '/api/chat',
      storage,
      onFileChanged: (file) => {
        console.log(`File updated: ${file.filePath}`);
      }
    })
  );

  // Test your implementation...
});
```

## Coverage Goals

The library aims for 80%+ coverage across:
- Branches
- Functions  
- Lines
- Statements

Run `npm run test:coverage` to see current coverage report.

## Testing Best Practices

1. **Test both happy paths and edge cases**
   - Complete code blocks
   - Incomplete/streaming content
   - Malformed input
   - Empty states

2. **Use test utilities for consistency**
   - Mock data generators
   - Storage adapters
   - Async helpers

3. **Test integration points**
   - React hook lifecycle
   - Storage persistence
   - Callback invocations

4. **Simulate real scenarios**
   - Streaming messages
   - File versioning
   - Multi-file operations
   - Canvas/fabric.js JSON structures