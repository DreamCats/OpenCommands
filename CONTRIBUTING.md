# Contributing to OpenCommands

Thank you for your interest in contributing to OpenCommands! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/opencommands.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature-name`

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Project Structure

```
src/
├── core/           # Core functionality (parser, registry, executor)
├── formats/        # File format handlers (frontmatter)
├── sources/        # Command source implementations
├── commands/       # CLI command implementations
├── utils/          # Utility functions
├── integrations/   # External integrations (Claude Code)
└── types/          # TypeScript type definitions
```

## Adding New Features

1. Check existing issues and PRs to avoid duplicates
2. Create an issue describing the feature
3. Implement the feature with tests
4. Update documentation
5. Submit a pull request

## Writing Tests

- All new features must include tests
- Tests should be placed in the `tests/` directory
- Use descriptive test names
- Test both success and error cases
- Aim for high code coverage

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { MyFeature } from '../src/core/my-feature.js';

describe('MyFeature', () => {
  it('should handle success case', () => {
    const feature = new MyFeature();
    const result = feature.doSomething('input');
    expect(result).toBe('expected output');
  });

  it('should handle error case', () => {
    const feature = new MyFeature();
    expect(() => {
      feature.doSomething('invalid input');
    }).toThrow('Expected error');
  });
});
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Command Format Guidelines

When creating new commands:

1. Use clear, descriptive names
2. Include comprehensive descriptions
3. Add relevant tags
4. Document arguments with descriptions
5. Provide usage examples
6. Test the command thoroughly

Example command format:

```markdown
---
name: my-command
namespace: tools
description: Does something useful
author: your-name
tags: [tool, utility]
args:
  - name: input
    required: true
    description: Input file path
  - name: output
    required: false
    description: Output file path
    default: output.txt
---

Detailed description of what the command does.

## Usage
\`\`\`bash
opencommands execute tools:my-command input.txt output.txt
\`\`\`

## Examples
Provide practical examples here.
```

## Submitting Pull Requests

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear description of changes
4. Reference any related issues
5. Keep PRs focused and reasonably sized

## Reporting Issues

When reporting issues:

1. Use the issue templates when available
2. Provide clear reproduction steps
3. Include relevant system information
4. Add error messages and stack traces
5. Suggest potential solutions if you have ideas

## Community Guidelines

- Be respectful and constructive
- Help newcomers learn and contribute
- Share knowledge and best practices
- Celebrate contributions of all sizes

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion
- Reach out to maintainers

Thank you for contributing to OpenCommands!