import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export interface Config {
  registry: {
    sources: SourceConfig[];
    namespaces: Record<string, NamespaceConfig>;
  };
  settings: {
    defaultModel?: string;
    autoUpdate?: boolean;
    parallelDownloads?: number;
    commandDirectory?: string;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
  };
}

export interface SourceConfig {
  type: 'git' | 'local' | 'npm' | 'registry';
  url?: string;
  path?: string;
  package?: string;
}

export interface NamespaceConfig {
  source: string;
  default?: boolean;
}

export class ConfigManager {
  private configPath: string;
  private config: Config;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = this.getDefaultConfig();
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = this.mergeConfig(this.config, parseYaml(content));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Config doesn't exist, use defaults
    }
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, stringifyYaml(this.config), 'utf-8');
  }

  get(): Config {
    return this.config;
  }

  set(config: Partial<Config>): void {
    this.config = this.mergeConfig(this.config, config);
  }

  getCommandDirectory(): string {
    // If commandDirectory is explicitly set in config, use it
    if (this.config.settings.commandDirectory) {
      return this.config.settings.commandDirectory;
    }

    // Check for project-level .claude/commands directory
    const projectCommandsDir = path.join(process.cwd(), '.claude', 'commands');
    try {
      const fs = require('fs');
      if (fs.existsSync(projectCommandsDir)) {
        return projectCommandsDir;
      }
    } catch (error) {
      // If we can't check, fall back to default
    }

    // Fall back to default user directory
    return this.getDefaultCommandDirectory();
  }

  getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
    return this.config.settings.logLevel || 'info';
  }

  addSource(source: SourceConfig): void {
    if (!this.config.registry.sources.find(s => s.url === source.url && s.path === source.path)) {
      this.config.registry.sources.push(source);
    }
  }

  removeSource(url?: string, path?: string): boolean {
    const index = this.config.registry.sources.findIndex(
      s => s.url === url && s.path === path
    );
    if (index !== -1) {
      this.config.registry.sources.splice(index, 1);
      return true;
    }
    return false;
  }

  private getDefaultConfigPath(): string {
    return path.join(os.homedir(), '.opencommands', 'config.yaml');
  }

  private getDefaultCommandDirectory(): string {
    return path.join(os.homedir(), '.opencommands', 'commands');
  }

  private getDefaultConfig(): Config {
    return {
      registry: {
        sources: [
          {
            type: 'git',
            url: 'https://github.com/DreamCats/my-commands'
          }
        ],
        namespaces: {}
      },
      settings: {
        defaultModel: '',
        autoUpdate: true,
        parallelDownloads: 3,
        commandDirectory: this.getDefaultCommandDirectory(),
        logLevel: 'info'
      }
    };
  }

  private mergeConfig(target: Config, source: Partial<Config>): Config {
    return {
      registry: {
        sources: source.registry?.sources || target.registry.sources,
        namespaces: { ...target.registry.namespaces, ...source.registry?.namespaces }
      },
      settings: { ...target.settings, ...source.settings }
    };
  }
}

export const config = new ConfigManager();