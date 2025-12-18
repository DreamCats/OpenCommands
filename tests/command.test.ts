import { describe, it, expect } from 'vitest';
import { Command } from '../src/core/command.js';

describe('Command', () => {
  describe('constructor', () => {
    it('should create command with required fields', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      expect(command.name).toBe('test');
      expect(command.description).toBe('Test command');
      expect(command.content).toBe('Content');
      expect(command.version).toBe('1.0.0'); // default
      expect(command.namespace).toBeUndefined();
    });

    it('should create command with all fields', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md',
        'ns',
        '2.0.0'
      );

      expect(command.name).toBe('test');
      expect(command.namespace).toBe('ns');
      expect(command.version).toBe('2.0.0');
    });
  });

  describe('fullName', () => {
    it('should return name without namespace', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      expect(command.fullName).toBe('test');
    });

    it('should return namespaced name', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md',
        'ns'
      );

      expect(command.fullName).toBe('ns:test');
    });
  });

  describe('argumentString', () => {
    it('should return empty string without args', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      expect(command.argumentString).toBe('');
    });

    it('should format required args', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        {
          name: 'test',
          description: 'Test command',
          args: [
            { name: 'file', required: true },
            { name: 'output', required: true }
          ]
        },
        { type: 'local' },
        '/test.md'
      );

      expect(command.argumentString).toBe('<file> <output>');
    });

    it('should format optional args', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        {
          name: 'test',
          description: 'Test command',
          args: [
            { name: 'file', required: false },
            { name: 'output', required: false }
          ]
        },
        { type: 'local' },
        '/test.md'
      );

      expect(command.argumentString).toBe('[file] [output]');
    });

    it('should format mixed args', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        {
          name: 'test',
          description: 'Test command',
          args: [
            { name: 'file', required: true },
            { name: 'output', required: false }
          ]
        },
        { type: 'local' },
        '/test.md'
      );

      expect(command.argumentString).toBe('<file> [output]');
    });
  });

  describe('substituteArguments', () => {
    it('should substitute $ARGUMENTS', () => {
      const command = new Command(
        'test',
        'Test command',
        'Run $ARGUMENTS',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      const result = command.substituteArguments(['arg1', 'arg2']);
      expect(result).toBe('Run arg1 arg2');
    });

    it('should substitute positional arguments', () => {
      const command = new Command(
        'test',
        'Test command',
        'Run $1 and $2',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      const result = command.substituteArguments(['file.txt', 'output.txt']);
      expect(result).toBe('Run file.txt and output.txt');
    });

    it('should substitute named arguments', () => {
      const command = new Command(
        'test',
        'Test command',
        'Process $input to $output',
        {
          name: 'test',
          description: 'Test command',
          args: [
            { name: 'input', required: true },
            { name: 'output', required: true }
          ]
        },
        { type: 'local' },
        '/test.md'
      );

      const result = command.substituteArguments(['file.txt', 'result.txt']);
      expect(result).toBe('Process file.txt to result.txt');
    });

    it('should use default values for missing args', () => {
      const command = new Command(
        'test',
        'Test command',
        'Save to $output',
        {
          name: 'test',
          description: 'Test command',
          args: [
            { name: 'output', required: false, default: 'output.txt' }
          ]
        },
        { type: 'local' },
        '/test.md'
      );

      const result = command.substituteArguments([]);
      expect(result).toBe('Save to output.txt');
    });
  });

  describe('validate', () => {
    it('should pass validation for valid command', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      const errors = command.validate();
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing name', () => {
      const command = new Command(
        '',
        'Test command',
        'Content',
        { name: '', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      const errors = command.validate();
      expect(errors).toContain('Command name is required');
    });

    it('should fail validation for invalid name', () => {
      const command = new Command(
        'invalid name!',
        'Test command',
        'Content',
        { name: 'invalid name!', description: 'Test command' },
        { type: 'local' },
        '/test.md'
      );

      const errors = command.validate();
      expect(errors).toContain('Command name must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should fail validation for invalid namespace', () => {
      const command = new Command(
        'test',
        'Test command',
        'Content',
        { name: 'test', description: 'Test command' },
        { type: 'local' },
        '/test.md',
        'invalid namespace!'
      );

      const errors = command.validate();
      expect(errors).toContain('Namespace must contain only alphanumeric characters, hyphens, and underscores');
    });
  });
});