import type { Command } from '../types/index.js';

export interface CommandSource {
  type: 'git' | 'local' | 'npm' | 'registry';
  fetch(location: string): Promise<Command[]>;
  validate(location: string): Promise<boolean>;
}

export abstract class BaseSource implements CommandSource {
  abstract readonly type: CommandSource['type'];

  abstract fetch(location: string): Promise<Command[]>;
  abstract validate(location: string): Promise<boolean>;

  protected async handleError(error: unknown, context: string): Promise<never> {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to ${context}: ${message}`);
  }
}