import path from 'path';
import { promises as fs } from 'fs';
import { CommandLoader } from '../core/loader.js';
import { BaseSource } from './base.js';
import type { Command } from '../types/index.js';

export class LocalSource extends BaseSource {
  readonly type = 'local' as const;
  private loader = new CommandLoader();

  async fetch(location: string): Promise<Command[]> {
    try {
      // Check if location exists
      const stats = await fs.stat(location);

      if (stats.isFile()) {
        // Single file
        return [await this.loader.loadFromFile(location, {
          type: 'local',
          path: location
        })];
      } else if (stats.isDirectory()) {
        // Directory
        return await this.loader.loadFromDirectory(location, {
          type: 'local',
          path: location
        });
      } else {
        throw new Error(`Invalid location: ${location}. Must be a file or directory.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Location not found: ${location}`);
      }
      throw error;
    }
  }

  async validate(location: string): Promise<boolean> {
    try {
      const stats = await fs.stat(location);
      return stats.isFile() || stats.isDirectory();
    } catch {
      return false;
    }
  }

  async scanDirectory(dirPath: string): Promise<CommandInfo[]> {
    return this.loader.scanDirectory(dirPath);
  }

  async getCommandInfo(filePath: string): Promise<CommandInfo> {
    return this.loader.getCommandInfo(filePath);
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