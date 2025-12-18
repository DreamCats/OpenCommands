# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build the project
npm run build

# Development mode with watch
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Run a single test file
npm test -- src/core/parser.test.ts

# Run tests matching a pattern
npm test -- --grep "search"

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

## Architecture Overview

OpenCommands is a universal command loader for AI assistants that follows a modular, plugin-based architecture. Commands are stored as Markdown files with YAML frontmatter and can be loaded from multiple sources.

### Core Components

1. **Command Flow**: Source → Parser → Registry → Execution
   - Commands originate from sources (Git, local, NPM)
   - Parsed from Markdown+YAML format into Command objects
   - Registered in a central CommandRegistry
   - Executed with argument substitution

2. **Key Abstractions**:
   - **BaseSource**: Abstract interface for command sources
   - **CommandParser**: Handles Markdown+YAML parsing
   - **CommandRegistry**: Central registry with search capabilities
   - **CommandExecutor**: Handles execution with argument substitution

3. **Source Architecture**:
   - Sources are plugins that fetch commands from different locations
   - Each source implements the BaseSource interface
   - Sources return Command objects that are registered globally

4. **Command Format**:
   - Frontmatter contains metadata (name, namespace, description, tags, args)
   - Body contains the command content
   - Special prefixes: `!` for shell commands, `@` for file references

5. **Namespace System**:
   - Commands can be organized into namespaces
   - Prevents naming conflicts
   - Allows grouping related commands

### Important Patterns

- **Auto-generation**: Command names derived from filenames if not specified
- **Conflict Detection**: Registry checks for existing commands before registration
- **Interactive Selection**: Install command uses inquirer for user selection
- **Fuzzy Search**: Uses Fuse.js for intelligent command search
- **YAML Filtering**: Empty/undefined fields are filtered from output
- **Multi-level Search**: Project-level `.claude/commands` takes precedence over user-level
- **Version-aware Sync**: Detects version differences and allows selective updates

### Integration Points

- **Claude Code**: Generates AGENTS.md and .claude/commands/ directory
- **Configuration**: YAML-based config in ~/.opencommands/config.yaml
- **Default Repository**: https://github.com/DreamCats/my-commands

## Code Architecture Details

### Command Loading Priority
1. Project-level `.claude/commands` directory (if exists)
2. User-level `~/.opencommands/commands` directory
3. Remote sources from configuration

### Interactive Features
- **sync command**: Detects version differences, shows update candidates with interactive selection
- **search command**: `--sync` flag allows syncing found commands to project directory
- **install command**: Interactive checkbox selection for multiple commands

### Testing Patterns
- Use temporary directories for isolated tests
- Mock file system operations when testing core logic
- Test both success and error paths
- Coverage includes integration tests for end-to-end scenarios

### Error Handling
- Commands continue loading even if individual commands fail
- User-friendly error messages with actionable suggestions
- Graceful degradation for missing dependencies or network issues

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->