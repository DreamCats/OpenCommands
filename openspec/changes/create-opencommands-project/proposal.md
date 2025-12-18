# Change: Create OpenCommands Project

## Why
We need to create a universal command loader system similar to Claude Code's slash commands but as an independent open-source project. This will provide a flexible, extensible command management system that can work with various AI assistants and development tools.

## What Changes
- Create a new TypeScript-based CLI tool called "opencommands"
- Implement command parsing and execution system
- Support multiple command sources (Git, local, NPM)
- Provide compatibility layer for Claude Code slash commands
- Build interactive CLI with search and filtering
- Create extensible plugin architecture

## Impact
- Affected specs: project (new), command-management (new), cli-interface (new)
- Affected code: Entire new codebase structure