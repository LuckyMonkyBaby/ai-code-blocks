# Streaming Code Blocks

TypeScript library for parsing streaming code blocks from AI chat responses, similar to Claude's artifacts system.

## Installation

```bash
npm install @yourusername/streaming-code-blocks
```

## Quick Start

```tsx
import { useStreamingCodeBlocks } from "@yourusername/streaming-code-blocks";

export function App() {
  const {
    currentFiles,
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isCodeMode,
  } = useStreamingCodeBlocks({
    apiEndpoint: "/api/chat",
  });

  return (
    <div>
      {/* Chat UI */}
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}

      {/* Files */}
      {currentFiles.map((file) => (
        <div key={file.filePath}>
          <h3>
            {file.filePath} (v{file.version})
          </h3>
          <pre>{file.content}</pre>
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Features

- ✅ Real-time streaming code block extraction
- ✅ File versioning with modify support
- ✅ Pluggable storage adapters
- ✅ TypeScript + Zod validation
- ✅ Thread-based sessions

## API Format

Your AI responses should include code blocks:

```
I'll create a React component for you.

<ablo-code>
  <ablo-thinking>
  Creating a simple button component with TypeScript
  </ablo-thinking>

  <ablo-write file_path="components/Button.tsx">
  interface ButtonProps {
    children: React.ReactNode;
    onClick: () => void;
  }

  export function Button({ children, onClick }: ButtonProps) {
    return <button onClick={onClick}>{children}</button>;
  }
  </ablo-write>
</ablo-code>

The component is ready to use!
```

**Result:**

- Chat shows: "I'll create a React component for you. The component is ready to use!"
- Files panel shows: `components/Button.tsx` with the code

## Modify Support

```
<ablo-modify file_path="components/Button.tsx" changes="Add styling">
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  const className = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return <button className={className} onClick={onClick}>{children}</button>;
}
</ablo-modify>
```

## Storage Adapters

### Memory (default)

```tsx
useStreamingCodeBlocks({ apiEndpoint: "/api/chat" });
```

### Custom Storage

```tsx
import { StorageAdapter } from "@yourusername/streaming-code-blocks";

class DatabaseAdapter implements StorageAdapter {
  async saveFile(filePath: string, content: string, metadata: any) {
    // Save to your database
  }
  // ... implement other methods
}

useStreamingCodeBlocks({
  apiEndpoint: "/api/chat",
  storage: new DatabaseAdapter(),
  threadId: "user_123",
  persistSession: true,
});
```

## Configuration

```tsx
useStreamingCodeBlocks({
  apiEndpoint: "/api/chat",
  config: {
    startTag: "<code>",
    endTag: "</code>",
    thinkingTag: "reasoning",
    writeTag: "file",
    modifyTag: "update",
  },
});
```

## Architecture & Performance

This library is built on **Zustand** for reactive state management and optionally integrates with **React Query** for server state caching and optimistic updates.

### Why Zustand?
- 🚀 **Automatic Updates**: No more manual re-renders - state changes automatically trigger React updates
- 🔧 **DevTools Support**: Time travel debugging with Redux DevTools
- ⚡ **Performance**: ~2KB bundle, optimized for React
- 🧩 **Simple API**: Easy to understand and extend

## React Query Integration

For enhanced performance, caching, and optimistic updates, you can enable React Query integration with a simplified API:

### Basic Setup (Simplified API)

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useStreamingCodeBlocks } from "@yourusername/streaming-code-blocks";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatInterface />
    </QueryClientProvider>
  );
}

function ChatInterface() {
  const {
    currentFiles,
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isCodeMode,
    // React Query states (automatically available when QueryClientProvider exists)
    isLoadingSession,
    isSavingSession,
    sessionError,
    refetchSession,
    invalidateSession,
  } = useStreamingCodeBlocks({
    apiEndpoint: "/api/chat",
    threadId: "user_123",
    persistSession: true,
    reactQuery: true, // 🎉 Simple boolean flag - auto-detects QueryClientProvider!
  });

  if (sessionError) {
    return <div>Error loading session: {sessionError.message}</div>;
  }

  return (
    <div>
      {isLoadingSession && <div>Loading session...</div>}
      {isSavingSession && <div>Saving...</div>}
      
      {/* Your chat UI here */}
    </div>
  );
}
```

### Advanced Configuration

```tsx
function ChatInterface() {
  const {
    currentFiles,
    // ... other props
  } = useStreamingCodeBlocks({
    apiEndpoint: "/api/chat",
    threadId: "user_123", 
    persistSession: true,
    reactQuery: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes  
      retry: 3,
    },
  });

  return <div>{/* Your UI */}</div>;
}
```

### Advanced Usage with Custom Storage

```tsx
import { 
  useStreamingCodeBlocks,
  ReactQueryStorageAdapter,
  MemoryStorageAdapter 
} from "@yourusername/streaming-code-blocks";

class DatabaseAdapter implements StorageAdapter {
  async saveSession(sessionId: string, data: any) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
  
  async loadSession(sessionId: string) {
    const response = await fetch(`/api/sessions/${sessionId}`);
    return response.ok ? response.json() : null;
  }
  
  // ... implement other methods
}

function ChatWithDatabase() {
  const queryClient = useQueryClient();
  const baseStorage = new DatabaseAdapter();
  
  // Wrap with React Query for caching and optimistic updates
  const reactQueryStorage = new ReactQueryStorageAdapter(
    baseStorage,
    queryClient,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 3,
    }
  );

  const streamingHook = useStreamingCodeBlocks({
    apiEndpoint: "/api/chat",
    storage: reactQueryStorage,
    threadId: "user_123",
    persistSession: true,
  });

  return <div>{/* Your UI */}</div>;
}
```

### Convenience Hooks

Use specialized hooks for specific operations:

```tsx
import {
  useFileQuery,
  useSessionMutation,
  useStreamingQueries,
} from "@yourusername/streaming-code-blocks";

function FileViewer({ filePath }: { filePath: string }) {
  const storage = useContext(StorageContext);
  
  const {
    data: file,
    isLoading,
    error,
    refetch,
  } = useFileQuery(filePath, {
    storage,
    enabled: !!filePath,
    staleTime: 30000,
  });

  if (isLoading) return <div>Loading file...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!file) return <div>File not found</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <pre>{file.content}</pre>
    </div>
  );
}

function SessionManager({ sessionId }: { sessionId: string }) {
  const storage = useContext(StorageContext);
  const { invalidateSession, invalidateAllFiles } = useStreamingQueries();
  
  const saveSessionMutation = useSessionMutation({
    storage,
    onSuccess: () => {
      console.log('Session saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save session:', error);
    },
  });

  const handleSave = (sessionData: any) => {
    saveSessionMutation.mutate({ sessionId, sessionData });
  };

  const handleRefresh = () => {
    invalidateSession(sessionId);
    invalidateAllFiles();
  };

  return (
    <div>
      <button 
        onClick={() => handleSave(/* session data */)}
        disabled={saveSessionMutation.isPending}
      >
        {saveSessionMutation.isPending ? 'Saving...' : 'Save Session'}
      </button>
      <button onClick={handleRefresh}>Refresh Data</button>
    </div>
  );
}
```

### Benefits of React Query Integration

- **Intelligent Caching**: Reduce unnecessary API calls with automatic caching
- **Optimistic Updates**: UI updates immediately, reverting on errors
- **Background Refetching**: Keep data fresh automatically
- **Error Handling**: Built-in retry logic and error states
- **Loading States**: Track loading/saving states across your app
- **Offline Support**: Automatic retry when connection returns
- **Request Deduplication**: Multiple identical requests are automatically merged

## Advanced: Direct Zustand Store Usage

For maximum flexibility, you can use the underlying Zustand store directly:

```tsx
import { createStreamingStore } from "@yourusername/streaming-code-blocks";

// Create your own store instance
const streamingStore = createStreamingStore();

function useCustomStreamingLogic() {
  // Initialize the store
  useEffect(() => {
    streamingStore.getState().initialize(config, storage, threadId);
  }, []);

  // Subscribe to specific state slices
  const files = streamingStore((state) => state.currentFiles);
  const isCodeMode = streamingStore((state) => state.isCodeMode);
  
  // Use store actions directly
  const processMessage = streamingStore((state) => state.processMessage);
  const clearAll = streamingStore((state) => state.clear);

  return { files, isCodeMode, processMessage, clearAll };
}
```

### Store Actions & State

```typescript
interface StreamingStore {
  // State
  codeBlocks: CodeBlock[]
  currentFiles: Map<string, FileState>
  isCodeMode: boolean
  
  // Actions  
  initialize: (config, storage, threadId) => void
  processMessage: (messageId, content) => Promise<void>
  updateFile: (filePath, updates) => void
  addFile: (file) => void
  removeFile: (filePath) => void
  clear: () => void
  
  // Session Management
  loadFromStorage: (sessionId) => Promise<void>
  saveToStorage: (sessionId) => Promise<void>
}
```

### Migration Guide

**v1.x users**: Your existing code continues to work unchanged! The new Zustand integration runs automatically under the hood.

To enable React Query's enhanced features:

1. Install `@tanstack/react-query` (if not already installed)
2. Wrap your app with `QueryClientProvider`  
3. Add `reactQuery: true` to your hook options
4. Enjoy automatic caching, optimistic updates, and enhanced loading states!

## Callbacks

```tsx
useStreamingCodeBlocks({
  apiEndpoint: "/api/chat",
  onFileChanged: (file) => {
    console.log(`File updated: ${file.filePath} v${file.version}`);
    // Auto-save to external system
  },
  onCodeBlockComplete: (codeBlock) => {
    console.log(`Generated ${codeBlock.commands.length} files`);
  },
});
```

## API Reference

### useStreamingCodeBlocks

Returns:

- `currentFiles: FileState[]` - Latest version of each file
- `codeBlocks: CodeBlock[]` - All code block sessions
- `isCodeMode: boolean` - Currently streaming code
- `messages` - Chat messages with code blocks removed
- `input, handleInputChange, handleSubmit` - Chat form controls
- `totalFiles: number` - Total file count
- `getFile(path): FileState` - Get specific file
- `clearAll()` - Clear all data

### FileState

```typescript
interface FileState {
  filePath: string;
  content: string;
  version: number;
  lastModified: Date;
  sourceMessageId: string;
}
```

### StorageAdapter

```typescript
interface StorageAdapter {
  saveSession(sessionId: string, data: any): Promise<void>;
  loadSession(sessionId: string): Promise<any | null>;
  saveFile(filePath: string, content: string, metadata: any): Promise<void>;
  loadFile(
    filePath: string
  ): Promise<{ content: string; metadata: any } | null>;
  deleteFile(filePath: string): Promise<void>;
}
```

## License

MIT
