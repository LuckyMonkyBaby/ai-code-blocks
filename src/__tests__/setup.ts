// src/__tests__/setup.ts
import '@testing-library/jest-dom';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Add custom matchers if needed
expect.extend({
  toContainFile(received: Map<string, any>, filePath: string) {
    const pass = received.has(filePath);
    const message = pass
      ? () => `expected Map not to contain file "${filePath}"`
      : () => `expected Map to contain file "${filePath}"`;

    return { pass, message };
  },
});