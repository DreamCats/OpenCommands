import { describe, it, expect } from 'vitest';
import { CommandParser } from '../src/core/parser.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('CommandParser', () => {
  const parser = new CommandParser();

  describe('parseContent', () => {
    it('should parse valid command with frontmatter', () => {
      const content = `---
name: test-command
description: A test command
version: 1.0.0
namespace: test
author: test-author
tags: [test, example]
---

This is the command content.`;

      const result = parser.parseContent(content);

      expect(result.metadata.name).toBe('test-command');
      expect(result.metadata.description).toBe('A test command');
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.namespace).toBe('test');
      expect(result.metadata.author).toBe('test-author');
      expect(result.metadata.tags).toEqual(['test', 'example']);
      expect(result.content).toBe('This is the command content.');
    });

    it('should parse command without frontmatter', async () => {
      const content = 'This is a command without frontmatter.';

      // parseContent without validation for content without frontmatter
      const { parseFrontMatter } = await import('../src/formats/frontmatter.js');
      const { attributes, body } = parseFrontMatter(content);

      expect(attributes).toEqual({});
      expect(body).toBe('This is a command without frontmatter.');
    });

    it('should parse command with minimal frontmatter', () => {
      const content = `---
name: minimal
description: Minimal command
---

Command content.`;

      const result = parser.parseContent(content);

      expect(result.metadata.name).toBe('minimal');
      expect(result.metadata.description).toBe('Minimal command');
      expect(result.metadata.version).toBe('1.0.0'); // Default version
      expect(result.content).toBe('Command content.');
    });

    it('should handle args metadata', () => {
      const content = `---
name: test
description: Test command
args:
  - name: input
    required: true
    description: Input file
  - name: output
    required: false
    description: Output file
    default: output.txt
---

Process files.`;

      const result = parser.parseContent(content);

      expect(result.metadata.args).toEqual([
        { name: 'input', required: true, description: 'Input file' },
        { name: 'output', required: false, description: 'Output file', default: 'output.txt' }
      ]);
    });

    it('should handle allowed-tools metadata', () => {
      const content = `---
name: test
description: Test command
allowed-tools:
  - Bash
  - Read
  - Write
---

Command content.`;

      const result = parser.parseContent(content);

      expect(result.metadata.allowedTools).toEqual(['Bash', 'Read', 'Write']);
    });
  });

  describe('validation', () => {
    it('should auto-generate name from filename when missing', () => {
      const content = `---
description: Missing name
---

Content.`;

      const result = parser.parseContent(content, 'test-command.md');
      expect(result.metadata.name).toBe('test-command');
      expect(result.metadata.namespace).toBe('default');
    });

    it('should throw error for invalid command name', () => {
      const content = `---
name: invalid name!
description: Invalid name
---

Content.`;

      expect(() => {
        parser.parseContent(content);
      }).toThrow('Invalid command name');
    });

    it('should throw error for invalid namespace', () => {
      const content = `---
name: test
description: Test
namespace: invalid namespace!
---

Content.`;

      expect(() => {
        parser.parseContent(content);
      }).toThrow('Invalid namespace');
    });
  });
});