import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { CommandParser } from '../src/core/parser.js';
import { CommandRegistry } from '../src/core/registry.js';
import { LocalSource } from '../src/sources/local.js';

describe('Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opencommands-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('LocalSource', () => {
    it('should load commands from directory', async () => {
      // Create test command files
      const command1 = `---
name: test1
description: Test command 1
---
Content 1`;

      const command2 = `---
name: test2
description: Test command 2
namespace: ns
---
Content 2`;

      await fs.writeFile(path.join(tempDir, 'test1.md'), command1);
      await fs.mkdir(path.join(tempDir, 'ns'));
      await fs.writeFile(path.join(tempDir, 'ns', 'test2.md'), command2);

      const source = new LocalSource();
      const commands = await source.fetch(tempDir);

      expect(commands).toHaveLength(2);
      expect(commands[0].name).toBe('test1');
      expect(commands[1].name).toBe('test2');
      expect(commands[1].namespace).toBe('ns');
    });

    it('should load single command file', async () => {
      const command = `---
name: single
description: Single command
---
Single content`;

      const filePath = path.join(tempDir, 'single.md');
      await fs.writeFile(filePath, command);

      const source = new LocalSource();
      const commands = await source.fetch(filePath);

      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('single');
    });

    it('should handle command files with missing metadata', async () => {
      const commandWithoutMetadata = `---
# Missing name and description
---
Content`;

      await fs.writeFile(path.join(tempDir, 'test-command.md'), commandWithoutMetadata);

      const source = new LocalSource();
      const commands = await source.fetch(tempDir);

      expect(commands).toHaveLength(1); // Commands with missing metadata are now auto-generated
      expect(commands[0].name).toBe('test-command');
      expect(commands[0].description).toBe('No description provided');
    });
  });

  describe('End-to-End Command Flow', () => {
    it('should parse, register, and find commands', async () => {
      // Create test command
      const commandContent = `---
name: e2e-test
description: End-to-end test command
namespace: test
tags: [test, e2e]
args:
  - name: input
    required: true
    description: Input file
---
Process $input file`;

      const filePath = path.join(tempDir, 'e2e-test.md');
      await fs.writeFile(filePath, commandContent);

      // Parse command
      const parser = new CommandParser();
      const command = await parser.parse(filePath, {
        type: 'local',
        path: filePath
      });

      expect(command.name).toBe('e2e-test');
      expect(command.namespace).toBe('test');
      expect(command.metadata.args).toHaveLength(1);

      // Register command
      const registry = new CommandRegistry();
      registry.register(command);

      // Find command
      const found = registry.find('test:e2e-test');
      expect(found).toBeDefined();
      expect(found?.name).toBe('e2e-test');

      // Test argument substitution
      const result = command.substituteArguments(['file.txt']);
      expect(result).toBe('Process file.txt file');
    });
  });

  describe('Command Search', () => {
    it('should search commands by various criteria', async () => {
      const commands = [
        `---
name: git-commit
description: Create git commit
tags: [git, vcs]
---
Commit content`,
        `---
name: docker-build
description: Build Docker image
tags: [docker, build]
---
Build content`,
        `---
name: test-run
description: Run tests
tags: [test, ci]
---
Test content`
      ];

      for (let i = 0; i < commands.length; i++) {
        await fs.writeFile(path.join(tempDir, `cmd${i}.md`), commands[i]);
      }

      const source = new LocalSource();
      const loadedCommands = await source.fetch(tempDir);

      const registry = new CommandRegistry();
      loadedCommands.forEach(cmd => registry.register(cmd));

      // Search by name
      const gitResults = registry.search('git');
      expect(gitResults).toHaveLength(1);
      expect(gitResults[0].name).toBe('git-commit');

      // Search by description
      const buildResults = registry.search('build');
      expect(buildResults).toHaveLength(1);
      expect(buildResults[0].name).toBe('docker-build');

      // Search by tag
      const allCommands = registry.findAll();
      const testCommands = allCommands.filter(cmd =>
        cmd.metadata.tags?.includes('test')
      );
      expect(testCommands).toHaveLength(1);
      expect(testCommands[0].name).toBe('test-run');
    });
  });
});