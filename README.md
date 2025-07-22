# Streaming Code Blocks v2.0

TypeScript library for parsing streaming code blocks from AI chat responses, with automatic file generation and clean message display. Perfect for building AI coding assistants similar to Claude's artifacts system.

## ✨ What's New in v2.0

- 🚀 **Always-on React Query**: Built-in caching and session persistence
- ⚡ **Zustand State Management**: Efficient reactive updates
- 🎯 **Simplified API**: Consistent naming and cleaner interfaces
- 📦 **Minimal Bundle**: Only Zustand as direct dependency (~2.9kb gzipped)
- 🔒 **Strict TypeScript**: Compile-time validation with template literal types
- 🧹 **Clean Architecture**: No backwards compatibility, fresh start

## 🚀 Quick Start

### Installation

```bash
# Install the library
npm install @luckymonkybaby/streaming-code-blocks

# Install peer dependencies (required)
npm install @tanstack/react-query @ai-sdk/react
```

### Basic Usage

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamingCodeBlocks } from '@luckymonkybaby/streaming-code-blocks';

// Create QueryClient (required in v2.0)
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CodeBlocksDemo />
    </QueryClientProvider>
  );
}

function CodeBlocksDemo() {
  const {
    files,           // Generated files (was: currentFiles)
    messages,        // Cleaned chat messages
    codeBlocks,      // Parsed code blocks
    isStreaming,     // Streaming status (was: isCodeMode)
    
    // React Query states (always available in v2.0)
    isLoadingSession,
    isSavingSession, 
    sessionError,
    refetchSession,
  } = useStreamingCodeBlocks({
    endpoint: '/api/chat',        // API endpoint (was: apiEndpoint)
    sessionId: 'my-session',      // Session ID (was: threadId)
    persistSession: true,
    onFileChanged: (file) => {
      console.log(`📝 File updated: ${file.filePath} v${file.version}`);
    },
    onCodeBlockComplete: (block) => {
      console.log(`✅ Code block finished with ${block.commands.length} files`);
    }
  });

  return (
    <div>
      {/* Session Status */}
      {isLoadingSession && <div>Loading session...</div>}
      {isSavingSession && <div>Saving...</div>}
      {sessionError && <div>Error: {sessionError.message}</div>}
      
      {/* Chat Messages (code blocks automatically removed) */}
      <div>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {/* Generated Files */}
      <div>
        <h2>Generated Files ({files.length})</h2>
        {files.map(file => (
          <div key={file.filePath}>
            <h3>{file.filePath} (v{file.version})</h3>
            <pre><code>{file.content}</code></pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
```

## 🤖 AI Response Format

Your AI assistant should return responses with code blocks wrapped in these tags:

```
I'll help you create a React button component.

<ablo-code>
<ablo-thinking>
I need to create a reusable button component with proper TypeScript interfaces.
</ablo-thinking>

<ablo-write file_path="components/Button.tsx">
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
</ablo-write>
</ablo-code>

The button component is ready to use!
```

**Result:**
- **Chat displays**: "I'll help you create a React button component. The button component is ready to use!"
- **Files array contains**: `components/Button.tsx` with the component code
- **Callbacks fire**: `onFileChanged` and `onCodeBlockComplete`

## 🔄 File Modifications

Use `<ablo-modify>` to update existing files:

```
<ablo-modify file_path="components/Button.tsx" changes="Add loading state">
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  loading = false 
}) => {
  return (
    <button 
      className={`btn btn-${variant} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
</ablo-modify>
```

The library automatically increments the file version and triggers `onFileChanged`.

## ⚙️ Configuration

### Custom Tags

```tsx
useStreamingCodeBlocks({
  endpoint: '/api/chat',
  config: {
    startTag: '<code>',
    endTag: '</code>',
    thinkingTag: 'reasoning',
    writeTag: 'create',
    modifyTag: 'update',
  }
});
```

### Custom Storage

```tsx
import { StorageAdapter } from '@luckymonkybaby/streaming-code-blocks';

class DatabaseAdapter implements StorageAdapter {
  async saveSession(sessionId: string, data: any): Promise<void> {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async loadSession(sessionId: string): Promise<any | null> {
    const response = await fetch(`/api/sessions/${sessionId}`);
    return response.ok ? response.json() : null;
  }

  async saveFile(filePath: string, content: string, metadata: any): Promise<void> {
    await fetch(`/api/files/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, metadata })
    });
  }

  async loadFile(filePath: string): Promise<{ content: string; metadata: any } | null> {
    const response = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
    return response.ok ? response.json() : null;
  }

  async deleteFile(filePath: string): Promise<void> {
    await fetch(`/api/files/${encodeURIComponent(filePath)}`, { method: 'DELETE' });
  }
}

// Use custom storage
useStreamingCodeBlocks({
  endpoint: '/api/chat',
  storage: new DatabaseAdapter(),
  sessionId: 'user-123',
  persistSession: true
});
```

## 📖 Examples

Check out the [`examples/`](./examples/) directory for a complete interactive demo showing all library features.

To run the demo:
1. Copy `examples/demo.tsx` to your React project
2. Install dependencies: `npm install @luckymonkybaby/streaming-code-blocks @tanstack/react-query @ai-sdk/react`
3. Import and use the component

## 🔧 API Reference

### Hook Options

```typescript
interface UseStreamingCodeBlocksProps {
  endpoint: string;                    // API endpoint for chat
  sessionId?: string;                  // Session identifier
  config?: ConfigInput;                // Custom tag configuration
  storage?: StorageAdapter;            // Custom storage adapter
  persistSession?: boolean;            // Enable session persistence
  onFileChanged?: (file: FileState) => void;
  onCodeBlockComplete?: (codeBlock: CodeBlock) => void;
}
```

### Hook Return Value

```typescript
interface StreamingCodeBlocksResult {
  // State (readonly arrays)
  files: readonly FileState[];        // Generated files
  codeBlocks: readonly CodeBlock[];   // Parsed code blocks
  isStreaming: boolean;               // Currently processing code
  
  // Chat interface (from @ai-sdk/react)
  messages: readonly Message[];      // Cleaned messages
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  append: (message: { role: 'user' | 'assistant'; content: string }) => void;
  reload: () => void;
  stop: () => void;
  
  // Operations
  getFile: (path: string) => FileState | undefined;
  clearAll: () => void;
  
  // React Query states (always present in v2.0)
  isLoadingSession: boolean;
  isSavingSession: boolean;
  sessionError: Error | null;
  refetchSession: () => void;
}
```

### Data Types

```typescript
interface FileState {
  readonly filePath: string;
  readonly content: string;
  readonly version: number;
  readonly lastModified: Date;
  readonly sourceMessageId: `msg-${string}`;
}

interface CodeBlock {
  readonly messageId: `msg-${string}`;
  readonly thinking: string;
  readonly commands: readonly FileCommand[];
  readonly isComplete: boolean;
}

interface Config {
  readonly startTag: string;    // Default: '<ablo-code>'
  readonly endTag: string;      // Default: '</ablo-code>'
  readonly thinkingTag: string; // Default: 'ablo-thinking'
  readonly writeTag: string;    // Default: 'ablo-write'
  readonly modifyTag: string;   // Default: 'ablo-modify'
}
```

## 🏗️ Architecture

### Built on Modern Stack
- **[Zustand](https://github.com/pmndrs/zustand)**: Reactive state management (~2.9kb)
- **[React Query](https://tanstack.com/query)**: Server state caching and persistence
- **[@ai-sdk/react](https://sdk.vercel.ai/docs)**: Chat interface integration
- **TypeScript**: Strict type safety with template literal types

### Key Benefits
- ⚡ **Automatic Updates**: No manual re-renders needed
- 🔄 **Smart Caching**: React Query handles all server state
- 🎯 **Type Safety**: Compile-time validation prevents runtime errors
- 📦 **Minimal Bundle**: Only essential dependencies
- 🛠️ **DevTools**: Built-in debugging with Redux DevTools
- 🔌 **Extensible**: Custom storage adapters and configurations

## 🚀 Migration from v1.x

v2.0 is a **clean break release** with no backwards compatibility:

### API Changes
- `apiEndpoint` → `endpoint`
- `threadId` → `sessionId`
- `currentFiles` → `files`
- `isCodeMode` → `isStreaming`
- React Query now required (peer dependency)
- Zod runtime validation removed (TypeScript only)

### Breaking Changes
- StreamingStateManager class removed
- ReactQueryStorageAdapter wrapper removed
- All conditional React Query logic removed
- Runtime schema validation removed

### Quick Migration
1. Update package: `npm install @luckymonkybaby/streaming-code-blocks@2`
2. Install peer dependencies: `npm install @tanstack/react-query @ai-sdk/react`
3. Wrap app with `QueryClientProvider`
4. Update hook props to new API
5. Update property names in your components

## 📦 Bundle Size

v2.0 is optimized for minimal bundle size:
- **Direct dependency**: Zustand only (~2.9kb gzipped)
- **Peer dependencies**: React Query and @ai-sdk/react (likely already in your app)
- **No runtime validation**: Zod removed, TypeScript compile-time only
- **Tree-shakeable**: Import only what you use

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Made with ❤️ for the AI coding assistant community**