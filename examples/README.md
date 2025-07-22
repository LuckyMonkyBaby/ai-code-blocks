# Examples

This directory contains examples demonstrating how to use the ai-code-blocks library.

## Available Examples

### `demo.tsx` - Interactive Demo
A complete React component that demonstrates all the key features of the library:
- Processing AI assistant messages with code blocks
- File generation and updates
- Clean message display
- Session persistence with React Query
- Real-time callbacks for file changes

To run this example:
1. Copy the demo.tsx file to your React project
2. Install the required dependencies:
   ```bash
   npm install ai-code-blocks @tanstack/react-query @ai-sdk/react
   ```
3. Import and use the component in your app

## Key Features Demonstrated

- **Modern API**: Uses consistent naming (`endpoint`, `sessionId`, `files`, `isStreaming`)
- **React Query Integration**: Always-on session persistence and caching
- **Zustand State Management**: Efficient reactive state updates
- **File Operations**: `<ablo-write>` and `<ablo-modify>` tag processing
- **Clean Messages**: Automatic stripping of code blocks from chat display
- **TypeScript Support**: Full type safety with template literal types
- **Callbacks**: Real-time notifications for file changes and code block completion

## Usage Pattern

The examples show the typical usage pattern:

1. **Setup QueryClient**: Required for the library
2. **Initialize Hook**: Configure endpoint and callbacks
3. **Process Messages**: Library automatically handles AI assistant responses
4. **Render Results**: Display files and cleaned messages
5. **Handle Updates**: React to file changes and code block completion

For more details, see the main README.md file in the project root.