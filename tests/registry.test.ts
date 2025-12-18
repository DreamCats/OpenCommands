import { describe, it, expect, beforeEach } from 'vitest';
import { CommandRegistry } from '../src/core/registry.js';
import { Command } from '../src/core/command.js';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local', path: '/test.md' },
        '/test.md'
      );

      registry.register(command);

      const found = registry.find('test');
      expect(found).toBeDefined();
      expect(found?.name).toBe('test');
    });

    it('should register command with namespace', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command', namespace: 'ns' },
        { type: 'local', path: '/test.md' },
        '/test.md',
        'ns'
      );

      registry.register(command);

      const found = registry.find('ns:test');
      expect(found).toBeDefined();
      expect(found?.namespace).toBe('ns');
    });

    it('should throw error for duplicate command', () => {
      const command1 = new Command(
        'test',
        'Test command 1',
        'Content 1',
        { name: 'test', description: 'Test command 1' },
        { type: 'local', path: '/test1.md' },
        '/test1.md'
      );

      const command2 = new Command(
        'test',
        'Test command 2',
        'Content 2',
        { name: 'test', description: 'Test command 2' },
        { type: 'local', path: '/test2.md' },
        '/test2.md'
      );

      registry.register(command1);

      expect(() => {
        registry.register(command2);
      }).toThrow('Command already registered: test');
    });
  });

  describe('find', () => {
    beforeEach(() => {
      const command1 = new Command(
        'test1',
        'Test command 1',
        'Content 1',
        { name: 'test1', description: 'Test command 1' },
        { type: 'local', path: '/test1.md' },
        '/test1.md'
      );

      const command2 = new Command(
        'test2',
        'Test command 2',
        'Content 2',
        { name: 'test2', description: 'Test command 2', namespace: 'ns' },
        { type: 'local', path: '/test2.md' },
        '/test2.md',
        'ns'
      );

      registry.register(command1);
      registry.register(command2);
    });

    it('should find command by name', () => {
      const found = registry.find('test1');
      expect(found).toBeDefined();
      expect(found?.name).toBe('test1');
    });

    it('should find command by full name', () => {
      const found = registry.find('ns:test2');
      expect(found).toBeDefined();
      expect(found?.name).toBe('test2');
      expect(found?.namespace).toBe('ns');
    });

    it('should return undefined for non-existent command', () => {
      const found = registry.find('nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      const commands = [
        new Command('test1', 'Test 1', 'Content 1', { name: 'test1', description: 'Test 1' }, { type: 'local' }, '/test1.md'),
        new Command('test2', 'Test 2', 'Content 2', { name: 'test2', description: 'Test 2', namespace: 'ns' }, { type: 'local' }, '/test2.md', 'ns'),
        new Command('test3', 'Test 3', 'Content 3', { name: 'test3', description: 'Test 3', tags: ['tag1'] }, { type: 'local' }, '/test3.md')
      ];

      commands.forEach(cmd => registry.register(cmd));
    });

    it('should return all commands', () => {
      const all = registry.findAll();
      expect(all).toHaveLength(3);
    });

    it('should filter by namespace', () => {
      const filtered = registry.findAll({ namespace: 'ns' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('test2');
    });

    it('should filter by tag', () => {
      const filtered = registry.findAll({ tag: 'tag1' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('test3');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      const commands = [
        new Command('git-commit', 'Create git commit', 'Content', { name: 'git-commit', description: 'Create git commit' }, { type: 'local' }, '/git-commit.md'),
        new Command('docker-build', 'Build Docker image', 'Content', { name: 'docker-build', description: 'Build Docker image' }, { type: 'local' }, '/docker-build.md'),
        new Command('test-run', 'Run tests', 'Content', { name: 'test-run', description: 'Run tests' }, { type: 'local' }, '/test-run.md')
      ];

      commands.forEach(cmd => registry.register(cmd));
    });

    it('should find commands by name', () => {
      const results = registry.search('git');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('git-commit');
    });

    it('should find commands by description', () => {
      const results = registry.search('build');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('docker-build');
    });

    it('should respect limit option', () => {
      const results = registry.search('test', { limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('unregister', () => {
    it('should remove command', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      registry.register(command);
      expect(registry.find('test')).toBeDefined();

      const removed = registry.unregister('test');
      expect(removed).toBe(true);
      expect(registry.find('test')).toBeUndefined();
    });

    it('should return false for non-existent command', () => {
      const removed = registry.unregister('nonexistent');
      expect(removed).toBe(false);
    });
  });
});