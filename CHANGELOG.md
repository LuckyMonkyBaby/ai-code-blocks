# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-07-22

### 🎉 Major Release - Clean Break Architecture

This is a complete rewrite with no backwards compatibility. v2.0 provides a modern, efficient, and type-safe foundation for building AI coding assistants.

### ✨ Added
- **Always-on React Query**: Built-in caching and session persistence (now required)
- **Zustand State Management**: Efficient reactive updates with minimal bundle size
- **Template Literal Types**: Enhanced type safety with `msg-${string}` validation
- **Interactive Demo**: Complete example in `examples/demo.tsx`
- **DevTools Integration**: Built-in debugging support
- **Strict TypeScript**: Compile-time validation only, no runtime overhead
- **Bundle Optimization**: Only Zustand as direct dependency (~2.9kb gzipped)

### 🔄 Changed
- **API Naming**: Consistent naming throughout
  - `apiEndpoint` → `endpoint`
  - `threadId` → `sessionId`
  - `currentFiles` → `files`
  - `isCodeMode` → `isStreaming`
- **Dependencies**: React Query and @ai-sdk/react are now peer dependencies
- **State Management**: All logic consolidated in single Zustand store

### ❌ Removed - Breaking Changes
- **StreamingStateManager class**: All functionality moved to Zustand store
- **ReactQueryStorageAdapter wrapper**: React Query integration is now direct
- **Conditional React Query logic**: Always enabled in v2.0
- **Zod runtime validation**: TypeScript-only validation for better performance
- **Backwards compatibility**: Clean break for modern architecture

### 🏗️ Architecture
- **Built on modern stack**: Zustand + React Query + TypeScript
- **Peer dependencies pattern**: Minimal bundle with maximum flexibility
- **Type-safe interfaces**: Template literal types and readonly properties
- **Automatic updates**: No manual re-renders needed
- **Smart caching**: React Query handles all server state

### 📖 Documentation
- **Complete README rewrite**: v2.0 API documentation
- **Migration guide**: Clear upgrade path from v1.x
- **Interactive examples**: Full demo with step-by-step walkthrough
- **API reference**: Complete TypeScript interfaces

### 🧪 Testing
- **40 comprehensive tests**: All passing with React Query integration
- **Quality gates**: Pre-publish hooks ensure code quality
- **Type checking**: Strict TypeScript compilation
- **Bundle validation**: Optimized output verification

---

## Previous Versions

This is the first public release. Previous versions were internal development iterations.