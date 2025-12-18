import { spawn } from 'child_process';
import { promisify } from 'util';
import type { Command as CommandType, ExecuteOptions } from '../types/index.js';
import { Command } from './command.js';

export class CommandExecutor {
  async execute(command: Command, options: ExecuteOptions = {}): Promise<ExecutionResult> {
    const { args = [], cwd = process.cwd(), env = {} } = options;

    // Substitute arguments in command content
    const processedContent = command.substituteArguments(args);

    // Parse the command to determine execution method
    const lines = processedContent.split('\n').filter(line => line.trim());
    const firstLine = lines[0];

    // Check if it's a shell command (starts with ! or contains shell syntax)
    if (firstLine.startsWith('!')) {
      return this.executeShell(firstLine.slice(1).trim(), { cwd, env });
    }

    // Check if it's a file reference (starts with @)
    if (firstLine.startsWith('@')) {
      return this.processFileReferences(processedContent);
    }

    // Default: return the processed content for AI processing
    return {
      success: true,
      output: processedContent,
      exitCode: 0,
      type: 'content'
    };
  }

  private async executeShell(command: string, options: { cwd: string; env: Record<string, string> }): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const child = spawn('bash', ['-c', command], {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: stderr,
          exitCode: code || 0,
          type: 'shell'
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: error.message,
          exitCode: 1,
          type: 'shell'
        });
      });
    });
  }

  private processFileReferences(content: string): ExecutionResult {
    const lines = content.split('\n');
    const processedLines: string[] = [];
    const fileReferences: string[] = [];

    for (const line of lines) {
      // Find file references (@filename)
      const fileRefs = line.match(/@(\S+)/g);
      if (fileRefs) {
        fileReferences.push(...fileRefs.map((ref: string) => ref.slice(1)));
      }

      // Keep the line for processing
      processedLines.push(line);
    }

    return {
      success: true,
      output: processedLines.join('\n'),
      fileReferences,
      type: 'file-ref'
    };
  }

  validateArguments(command: Command, args: string[]): ValidationResult {
    if (!command.metadata.args || command.metadata.args.length === 0) {
      return { valid: true };
    }

    const errors: string[] = [];
    const requiredArgs = command.metadata.args.filter(arg => arg.required);

    // Check required arguments
    for (let i = 0; i < requiredArgs.length; i++) {
      if (i >= args.length || !args[i]) {
        errors.push(`Missing required argument: ${requiredArgs[i].name}`);
      }
    }

    // Validate argument count
    if (args.length > command.metadata.args.length) {
      errors.push(`Too many arguments. Expected ${command.metadata.args.length}, got ${args.length}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  type: 'content' | 'shell' | 'file-ref';
  fileReferences?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}