// src/__tests__/integration.test.ts
import { StreamingStateManager } from '../state-manager';
import { MemoryStorageAdapter } from '../storage';
import { Config } from '../types';

describe('Integration Tests', () => {
  const config: Config = {
    startTag: '<ablo-code>',
    endTag: '</ablo-code>',
    thinkingTag: 'ablo-thinking',
    writeTag: 'ablo-write',
    modifyTag: 'ablo-modify',
  };

  describe('Full streaming workflow', () => {
    it('should handle complete conversation flow', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new StreamingStateManager(config, storage, 'thread-123');

      // Message 1: Create initial file
      await manager.processMessage('msg-1', `
I'll create a React component for you.

<ablo-code>
<ablo-thinking>
Creating a Button component with TypeScript
</ablo-thinking>
<ablo-write file_path="components/Button.tsx">
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  );
};
</ablo-write>
</ablo-code>

The Button component is ready to use!`);

      // Check state after first message
      let state = manager.getState();
      expect(state.codeBlocks).toHaveLength(1);
      expect(state.currentFiles.size).toBe(1);
      
      const buttonFile = manager.getFile('components/Button.tsx');
      expect(buttonFile?.version).toBe(1);
      expect(buttonFile?.content).toContain('interface ButtonProps');

      // Message 2: Modify the file
      await manager.processMessage('msg-2', `
Let me add a variant prop to the button.

<ablo-code>
<ablo-thinking>
Adding variant prop for different button styles
</ablo-thinking>
<ablo-modify file_path="components/Button.tsx" changes="Add variant prop">
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick} 
      className={\`btn btn-\${variant}\`}
    >
      {children}
    </button>
  );
};
</ablo-modify>
</ablo-code>

I've added the variant prop with three options.`);

      // Check state after modification
      state = manager.getState();
      expect(state.codeBlocks).toHaveLength(2);
      
      const updatedFile = manager.getFile('components/Button.tsx');
      expect(updatedFile?.version).toBe(2);
      expect(updatedFile?.content).toContain('variant?:');
      expect(updatedFile?.sourceMessageId).toBe('msg-2');

      // Message 3: Add styles file
      await manager.processMessage('msg-3', `
Now let's add the styles for the button.

<ablo-code>
<ablo-write file_path="components/Button.css">
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}
</ablo-write>
</ablo-code>

The styles are now ready!`);

      // Final state check
      state = manager.getState();
      expect(state.currentFiles.size).toBe(2);
      expect(manager.getCurrentFiles().map(f => f.filePath).sort()).toEqual([
        'components/Button.css',
        'components/Button.tsx',
      ]);

      // Test persistence
      await manager.saveToStorage('thread-123');
      const savedData = await storage.loadSession('thread-123');
      expect(Object.keys(savedData.currentFiles)).toHaveLength(2);
    });

    it('should handle streaming incomplete messages', async () => {
      const manager = new StreamingStateManager(config, new MemoryStorageAdapter());

      // Simulate streaming chunks
      const chunks = [
        'I will create a config file.\n\n<ablo-code>\n<ablo-write file_path="config.js">\nexp',
        'I will create a config file.\n\n<ablo-code>\n<ablo-write file_path="config.js">\nexport const config = {\n  api',
        'I will create a config file.\n\n<ablo-code>\n<ablo-write file_path="config.js">\nexport const config = {\n  apiUrl: "https://api.example.com",\n  timeout: 5000\n};\n</ablo-write>\n</ablo-code>',
      ];

      // Process chunks
      for (const chunk of chunks) {
        await manager.processMessage('msg-stream', chunk);
        const state = manager.getState();
        
        if (chunk === chunks[0] || chunk === chunks[1]) {
          expect(state.isCodeMode).toBe(true);
          expect(state.currentFiles.size).toBe(0); // Not complete yet
        } else {
          expect(state.isCodeMode).toBe(false);
          expect(state.currentFiles.size).toBe(1);
          expect(manager.getFile('config.js')?.content).toContain('apiUrl');
        }
      }
    });

    it('should handle multiple files in single code block', async () => {
      const manager = new StreamingStateManager(config, new MemoryStorageAdapter());

      await manager.processMessage('msg-multi', `
Creating a component with tests and styles.

<ablo-code>
<ablo-thinking>
Creating a complete component package with component, styles, and tests
</ablo-thinking>
<ablo-write file_path="Card.tsx">
export const Card = ({ title, content }) => (
  <div className="card">
    <h2>{title}</h2>
    <p>{content}</p>
  </div>
);
</ablo-write>
<ablo-write file_path="Card.css">
.card {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
}
</ablo-write>
<ablo-write file_path="Card.test.tsx">
import { render } from '@testing-library/react';
import { Card } from './Card';

test('renders card with title', () => {
  const { getByText } = render(<Card title="Test" content="Content" />);
  expect(getByText('Test')).toBeInTheDocument();
});
</ablo-write>
</ablo-code>

All files created successfully!`);

      const files = manager.getCurrentFiles();
      expect(files).toHaveLength(3);
      expect(files.map(f => f.filePath).sort()).toEqual([
        'Card.css',
        'Card.test.tsx',
        'Card.tsx',
      ]);
    });

    it('should handle errors gracefully', async () => {
      const storage = new MemoryStorageAdapter();
      const manager = new StreamingStateManager(config, storage);

      // Malformed code block
      await manager.processMessage('msg-error', `
<ablo-code>
<ablo-write>Missing file_path attribute
</ablo-write>
</ablo-code>`);

      // Should not crash, files should be empty
      expect(manager.getCurrentFiles()).toHaveLength(0);
    });

    it('should clean messages correctly throughout conversation', async () => {
      const manager = new StreamingStateManager(config, new MemoryStorageAdapter());

      const messages = [
        {
          id: 'msg-1',
          content: 'Hello! I can help you create components.',
          expected: 'Hello! I can help you create components.',
        },
        {
          id: 'msg-2',
          content: `Sure! Here's a button:\n\n<ablo-code>\n<ablo-write file_path="Button.js">const Button = () => <button>Click</button>;</ablo-write>\n</ablo-code>\n\nYou can use it now!`,
          expected: "Sure! Here's a button:\n\nYou can use it now!",
        },
        {
          id: 'msg-3',
          content: 'Let me start working on that...\n\n<ablo-code>\n<ablo-write file_path="incomplete.js">function test() {',
          expected: '', // Incomplete code block
        },
      ];

      for (const msg of messages) {
        await manager.processMessage(msg.id, msg.content);
        const cleaned = manager.getCleanedMessage(msg.content);
        expect(cleaned).toBe(msg.expected);
      }
    });
  });

  describe('Canvas-specific scenarios from prompt', () => {
    it('should handle fabric.js canvas JSON structure', async () => {
      const manager = new StreamingStateManager(config, new MemoryStorageAdapter());

      const canvasMessage = `
I'll create a blue circle on your canvas.

<ablo-code>
<ablo-thinking>
Current canvas analysis:
- Need to add a circle object to the existing objects array
- Position at center coordinates (0, 0) 
- Use blue fill color with appropriate radius
</ablo-thinking>
<ablo-write file_path="canvas.json">
{
  "version": "5.3.0",
  "objects": [
    {
      "type": "circle",
      "version": "5.3.0",
      "originX": "left",
      "originY": "top",
      "left": -75,
      "top": -75,
      "radius": 75,
      "fill": "#3b82f6",
      "stroke": null,
      "strokeWidth": 1,
      "scaleX": 1,
      "scaleY": 1,
      "angle": 0,
      "opacity": 1,
      "shadow": {
        "color": "rgba(59, 130, 246, 0.4)",
        "blur": 20,
        "offsetX": 10,
        "offsetY": 10
      }
    }
  ],
  "background": "#ffffff"
}
</ablo-write>
</ablo-code>

Added a blue circle with shadow to the center of your canvas.`;

      await manager.processMessage('canvas-msg', canvasMessage);

      const canvasFile = manager.getFile('canvas.json');
      expect(canvasFile).toBeDefined();
      expect(canvasFile?.content).toContain('"type": "circle"');
      expect(canvasFile?.content).toContain('"fill": "#3b82f6"');

      // Parse JSON to ensure it's valid
      const canvasData = JSON.parse(canvasFile!.content);
      expect(canvasData.version).toBe('5.3.0');
      expect(canvasData.objects).toHaveLength(1);
      expect(canvasData.objects[0].type).toBe('circle');
    });

    it('should handle ablo-modify for canvas updates', async () => {
      const manager = new StreamingStateManager(config, new MemoryStorageAdapter());

      // First create canvas
      await manager.processMessage('msg-1', `
<ablo-code>
<ablo-write file_path="canvas.json">
{
  "version": "5.3.0",
  "objects": [],
  "background": "#ffffff"
}
</ablo-write>
</ablo-code>`);

      // Then modify it
      await manager.processMessage('msg-2', `
<ablo-code>
<ablo-modify file_path="canvas.json" changes="Add blue rectangle to canvas">
{
  "version": "5.3.0",
  "objects": [
    {
      "type": "rect",
      "left": -100,
      "top": -75,
      "width": 200,
      "height": 150,
      "fill": "#3b82f6"
    }
  ],
  "background": "#ffffff"
}
</ablo-modify>
</ablo-code>`);

      const canvasFile = manager.getFile('canvas.json');
      expect(canvasFile?.version).toBe(2);
      expect(canvasFile?.content).toContain('"type": "rect"');
    });
  });
});