import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { CommandParser } from './parser.js';
import type { Command, CommandSource } from '../types/index.js';

export class CommandLoader {
  private parser = new CommandParser();

  async loadFromDirectory(dirPath: string, source: CommandSource): Promise<Command[]> {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }
    } catch (error) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    // Find all markdown files, excluding README and other non-command files
    const pattern = path.join(dirPath, '**/*.md');
    const files = await glob(pattern, {
      ignore: [
        'node_modules/**',
        '**/README.md',
        '**/readme.md',
        '**/README.markdown',
        '**/readme.markdown'
      ]
    });

    const commands: Command[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const command = await this.parser.parse(file, source);
        commands.push(command);
      } catch (error) {
        errors.push(`Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Some commands failed to load:', errors);
    }

    return commands;
  }

  async loadFromFile(filePath: string, source: CommandSource): Promise<Command> {
    return this.parser.parse(filePath, source);
  }

  async loadFromFiles(filePaths: string[], source: CommandSource): Promise<Command[]> {
    const commands: Command[] = [];
    const errors: string[] = [];

    for (const filePath of filePaths) {
      try {
        const command = await this.loadFromFile(filePath, source);
        commands.push(command);
      } catch (error) {
        errors.push(`Failed to load ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Some files failed to load:', errors);
    }

    return commands;
  }

  async saveCommand(command: Command, filePath: string): Promise<void> {
    const { stringifyFrontMatter } = await import('../formats/frontmatter.js');

    const content = stringifyFrontMatter(command.metadata, command.content);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async deleteCommand(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async getCommandInfo(filePath: string): Promise<CommandInfo> {
    const stats = await fs.stat(filePath);
    const parser = new CommandParser();
    const { metadata } = parser.parseContent(await fs.readFile(filePath, 'utf-8'));

    return {
      path: filePath,
      name: metadata.name,
      namespace: metadata.namespace,
      description: metadata.description,
      size: stats.size,
      modified: stats.mtime
    };
  }

  async scanDirectory(dirPath: string): Promise<CommandInfo[]> {
    const pattern = path.join(dirPath, '**/*.md');
    const files = await glob(pattern, {
      ignore: [
        'node_modules/**',
        '**/README.md',
        '**/readme.md',
        '**/README.markdown',
        '**/readme.markdown'
      ]
    });

    const infos: CommandInfo[] = [];

    for (const file of files) {
      try {
        const info = await this.getCommandInfo(file);
        infos.push(info);
      } catch (error) {
        console.warn(`Failed to scan ${file}:`, error);
      }
    }

    return infos;
  }
}

export interface CommandInfo {
  path: string;
  name: string;
  namespace?: string;
  description: string;
  size: number;
  modified: Date;
}