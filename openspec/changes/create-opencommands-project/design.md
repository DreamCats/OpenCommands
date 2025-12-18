## Context
OpenCommands is a new project to create a universal command loader system inspired by Claude Code's slash commands. It needs to be independent, extensible, and support multiple command sources while maintaining compatibility with existing command formats.

## Goals / Non-Goals
**Goals:**
- Create a standalone command management system
- Support multiple command sources (Git, local, NPM)
- Provide Claude Code compatibility layer
- Build interactive CLI with search capabilities
- Design extensible plugin architecture

**Non-Goals:**
- Replace openskills (separate project)
- Support non-markdown command formats initially
- Implement complex dependency resolution
- Create GUI interface (CLI only for now)

## Decisions
- **Language**: TypeScript for type safety and ecosystem
- **CLI Framework**: Commander.js for robust command parsing
- **Build Tool**: tsup for fast TypeScript bundling
- **Testing**: Vitest for modern testing experience
- **Storage**: JSON registry with file-based commands
- **Format**: Markdown with YAML frontmatter (like Claude Code)

## Risks / Trade-offs
- **Risk**: Complexity of supporting multiple sources → Mitigation: Clear abstraction layer
- **Risk**: Performance with large command sets → Mitigation: Local caching and indexing
- **Risk**: Compatibility maintenance → Mitigation: Versioned interfaces

## Migration Plan
This is a new project, no migration needed. Future versions will need migration guides.

## Open Questions
- Should we support command versioning and updates?
- How to handle command conflicts (same name from different sources)?
- Do we need authentication for private command repositories?