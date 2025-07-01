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
