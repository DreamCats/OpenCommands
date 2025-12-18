import { tmpdir } from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { CommandLoader } from '../core/loader.js';
import { BaseSource } from './base.js';
import type { Command } from '../types/index.js';

export class GitSource extends BaseSource {
  readonly type = 'git' as const;
  private loader = new CommandLoader();
  private git: SimpleGit;

  constructor() {
    super();
    this.git = simpleGit();
  }

  async fetch(url: string): Promise<Command[]> {
    const tempDir = await this.createTempDirectory();

    try {
      // Clone repository
      await this.git.clone(url, tempDir, ['--depth', '1']);

      // Load commands from cloned repository
      const commands = await this.loader.loadFromDirectory(tempDir, {
        type: 'git',
        url
      });

      return commands;
    } catch (error) {
      await this.cleanupTempDirectory(tempDir);
      throw this.handleError(error, `clone repository ${url}`);
    }
  }

  async fetchFromPath(url: string, filePath: string): Promise<Command[]> {
    const tempDir = await this.createTempDirectory();

    try {
      // Clone repository
      await this.git.clone(url, tempDir, ['--depth', '1']);

      // Load specific file or directory
      const fullPath = path.join(tempDir, filePath);
      const commands = await this.loader.loadFromDirectory(fullPath, {
        type: 'git',
        url
      });

      return commands;
    } catch (error) {
      await this.cleanupTempDirectory(tempDir);
      throw this.handleError(error, `fetch from ${url}/${filePath}`);
    }
  }

  async validate(url: string): Promise<boolean> {
    try {
      // Test if URL is accessible
      await this.git.listRemote([url]);
      return true;
    } catch {
      return false;
    }
  }

  private async createTempDirectory(): Promise<string> {
    const tempDir = path.join(tmpdir(), `opencommands-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  private async cleanupTempDirectory(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}