// src/__tests__/jest.d.ts
declare global {
  namespace jest {
    interface Matchers<R> {
      toContainFile(filePath: string): R;
    }
  }
}

export {};