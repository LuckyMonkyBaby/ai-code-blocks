import '@testing-library/jest-dom';

// Custom matchers
expect.extend({
  toContainFile(received: any, filePath: string) {
    const pass = received && received.some((file: any) => file.path === filePath);
    return {
      message: () => `expected ${received} to contain file with path ${filePath}`,
      pass,
    };
  },
});