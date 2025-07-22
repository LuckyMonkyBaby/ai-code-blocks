// examples/demo.tsx - Complete demo showing streaming-code-blocks v2.0 usage
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamingCodeBlocks } from '@luckymonkybaby/streaming-code-blocks';

// Create a QueryClient instance (required for v2.0)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

const StreamingCodeBlocksDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileChangeLog, setFileChangeLog] = useState<string[]>([]);
  
  const {
    files,
    messages, 
    codeBlocks,
    isStreaming,
    processMessage,
    clearAll,
    // React Query states (always available in v2.0)
    isLoadingSession,
    isSavingSession,
    sessionError,
  } = useStreamingCodeBlocks({
    endpoint: '/api/chat',
    sessionId: 'demo-session',
    persistSession: true,
    onFileChanged: (file) => {
      setFileChangeLog(prev => [...prev, 
        `📝 ${file.filePath} updated (v${file.version}) - ${new Date().toLocaleTimeString()}`
      ]);
    },
    onCodeBlockComplete: (codeBlock) => {
      console.log('✅ Code block completed:', codeBlock.messageId, 
                  `with ${codeBlock.commands.length} commands`);
    }
  });

  // Sample messages that demonstrate the library
  const demoMessages = [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Can you create a React button component with TypeScript?'
    },
    {
      id: 'msg-2', 
      role: 'assistant' as const,
      content: `I'll help you create a React button component with TypeScript. Let me build that for you.

<ablo-code>
<ablo-thinking>
I need to create a reusable button component with proper TypeScript interfaces. It should support different variants and be flexible for various use cases.
</ablo-thinking>

<ablo-write file_path="components/Button.tsx">
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  size = 'md'
}) => {
  const baseClasses = 'rounded font-medium transition-colors focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500', 
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button 
      className={\`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${disabled ? 'opacity-50 cursor-not-allowed' : ''}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
</ablo-write>
</ablo-code>

Perfect! I've created a flexible Button component with TypeScript. It includes different variants (primary, secondary, danger), sizes, and proper accessibility features.`
    },
    {
      id: 'msg-3',
      role: 'user' as const,
      content: 'Great! Can you also add a loading state to the button?'
    },
    {
      id: 'msg-4',
      role: 'assistant' as const,
      content: `I'll add a loading state to the button component for you.

<ablo-code>
<ablo-thinking>
I need to modify the existing button component to add a loading state. This should include a loading prop, disable the button when loading, and show a spinner icon.
</ablo-thinking>

<ablo-modify file_path="components/Button.tsx" changes="Add loading state with spinner">
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md'
}) => {
  const baseClasses = 'rounded font-medium transition-colors focus:outline-none focus:ring-2 flex items-center justify-center';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base', 
    lg: 'px-6 py-3 text-lg'
  };

  const isDisabled = disabled || loading;

  return (
    <button 
      className={\`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]} \${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}\`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
};
</ablo-modify>
</ablo-code>

Excellent! I've updated the button component to include a loading state. Now it shows a spinner when loading and automatically disables the button to prevent multiple clicks.`
    },
    {
      id: 'msg-5',
      role: 'user' as const,
      content: 'Can you also create a simple test file for this component?'
    },
    {
      id: 'msg-6',
      role: 'assistant' as const,
      content: `I'll create a test file for the Button component using React Testing Library.

<ablo-code>
<ablo-thinking>
I should create a comprehensive test file that covers all the button variants, sizes, states, and interactions. This will help ensure the component works correctly.
</ablo-thinking>

<ablo-write file_path="components/__tests__/Button.test.tsx">
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-base');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles loading state', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(screen.getByRole('button')).toContainHTML('svg');
  });

  it('prevents clicks when loading', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Loading</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('uses default props when not specified', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-blue-600'); // primary variant
    expect(button).toHaveClass('px-4', 'py-2', 'text-base'); // md size
    expect(button).not.toBeDisabled(); // not disabled
  });
});
</ablo-write>
</ablo-code>

Perfect! I've created a comprehensive test suite for the Button component that covers all the variants, sizes, states, and user interactions. The tests ensure the component behaves correctly in all scenarios.`
    }
  ];

  const handleNextStep = () => {
    if (currentStep < demoMessages.length) {
      // Simulate processing a message (in real usage, this would come from useChat)
      const message = demoMessages[currentStep];
      
      // You would normally not call processMessage directly - 
      // it's called internally when new messages arrive from useChat
      console.log(`Processing message ${currentStep + 1}:`, message);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setFileChangeLog([]);
    clearAll();
  };

  const handleDownloadFile = (file: any) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filePath.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Streaming Code Blocks v2.0</h1>
        <p className="text-gray-600 text-lg">
          Parse AI assistant responses containing code blocks into files and clean messages
        </p>
      </div>

      {/* Session Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Session Status</h3>
        <div className="flex gap-4 text-sm">
          <span className={`px-2 py-1 rounded ${isLoadingSession ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
            {isLoadingSession ? 'Loading Session...' : 'Session Ready'}
          </span>
          <span className={`px-2 py-1 rounded ${isSavingSession ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
            {isSavingSession ? 'Saving...' : 'Saved'}
          </span>
          {sessionError && (
            <span className="px-2 py-1 rounded bg-red-200 text-red-800">
              Error: {sessionError.message}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={handleNextStep}
          disabled={currentStep >= demoMessages.length}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentStep === 0 ? '🚀 Start Demo' : `Step ${currentStep + 1}: ${demoMessages[currentStep]?.role === 'user' ? '👤 User' : '🤖 Assistant'}`}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          🔄 Reset
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chat Messages */}
        <div className="bg-white border rounded-xl shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              💬 Clean Chat Messages
              <span className="text-sm font-normal text-gray-500">
                ({messages.length} messages)
              </span>
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-gray-500 italic text-center py-8">
                  Click "Start Demo" to see cleaned messages appear here...
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'bg-green-50 border-l-4 border-green-500'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-600 mb-2">
                      {message.role === 'user' ? '👤 User' : '🤖 Assistant'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Generated Files */}
        <div className="bg-white border rounded-xl shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📁 Generated Files
              <span className="text-sm font-normal text-gray-500">
                ({files.length} files)
              </span>
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {files.length === 0 ? (
                <p className="text-gray-500 italic text-center py-8">
                  Files will appear here when code blocks are processed...
                </p>
              ) : (
                files.map((file, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                      <h3 className="font-mono text-sm font-semibold text-blue-600">
                        {file.filePath}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          v{file.version}
                        </span>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </div>
                    <pre className="text-xs bg-gray-800 text-green-400 p-4 overflow-x-auto max-h-48">
                      <code>{file.content}</code>
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📄 Files Created</h3>
          <p className="text-3xl font-bold text-blue-600">{files.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">🔧 Code Blocks</h3>
          <p className="text-3xl font-bold text-green-600">{codeBlocks.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">💬 Messages</h3>
          <p className="text-3xl font-bold text-purple-600">{messages.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-6 text-center shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-2">⚡ Status</h3>
          <p className={`text-lg font-semibold ${isStreaming ? 'text-yellow-600' : 'text-gray-600'}`}>
            {isStreaming ? 'Streaming' : 'Ready'}
          </p>
        </div>
      </div>

      {/* File Change Log */}
      {fileChangeLog.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold">📋 File Change Log</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {fileChangeLog.map((log, index) => (
                <div key={index} className="text-sm text-green-700 font-mono bg-green-50 px-3 py-1 rounded">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border rounded-xl shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold">🚀 Quick Start Guide</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">1. Install the package</h3>
              <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                <code>npm install @luckymonkybaby/streaming-code-blocks</code>
              </pre>
            </div>
            <div>
              <h3 className="font-semibold mb-3">2. Install peer dependencies</h3>
              <pre className="text-sm bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                <code>npm install @tanstack/react-query @ai-sdk/react</code>
              </pre>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">3. Basic usage</h3>
            <pre className="text-sm bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
              <code>{`import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamingCodeBlocks } from '@luckymonkybaby/streaming-code-blocks';

const queryClient = new QueryClient();

function MyApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <CodeBlocksDemo />
    </QueryClientProvider>
  );
}

function CodeBlocksDemo() {
  const { files, messages, codeBlocks, isStreaming } = useStreamingCodeBlocks({
    endpoint: '/api/chat',
    sessionId: 'my-session',
    onFileChanged: (file) => console.log('File updated:', file.filePath),
    onCodeBlockComplete: (block) => console.log('Code block done:', block.messageId)
  });

  return (
    <div>
      <h2>Generated Files ({files.length})</h2>
      {files.map(file => (
        <div key={file.filePath}>
          <h3>{file.filePath}</h3>
          <pre><code>{file.content}</code></pre>
        </div>
      ))}
    </div>
  );
}`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App component with QueryClientProvider
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StreamingCodeBlocksDemo />
    </QueryClientProvider>
  );
};

export default App;