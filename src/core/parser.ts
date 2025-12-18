import { readFile } from 'fs/promises';
import { parseFrontMatter } from '../formats/frontmatter.js';
import { Command } from './command.js';
import type { ParsedCommand, CommandMetadata, CommandSource } from '../types/index.js';
import path from 'path';

export class CommandParser {
  async parse(filePath: string, source: CommandSource): Promise<Command> {
    const content = await readFile(filePath, 'utf-8');
    const parsed = this.parseContent(content, filePath);

    // Validate required fields
    this.validateMetadata(parsed.metadata, filePath);

    return new Command(
      parsed.metadata.name,
      parsed.metadata.description,
      parsed.content,
      parsed.metadata,
      source,
      filePath,
      parsed.metadata.namespace,
      parsed.metadata.version
    );
  }

  parseContent(content: string, filePath?: string): ParsedCommand {
    const { attributes, body } = parseFrontMatter(content);

    // Generate default name and namespace from file path if not provided
    let name = attributes.name;
    let namespace = attributes.namespace;

    // First, handle name with colons (like "OpenSpec: Proposal")
    if (name && name.includes(':') && !namespace) {
      // For names like "OpenSpec: Proposal", use first part as namespace
      const parts = name.split(':');
      if (parts.length >= 2) {
        namespace = parts[0].trim();
        name = parts.slice(1).join(':').trim();
      }
    }

    // Then, fall back to file path parsing if still missing
    if (filePath && (!name || !namespace)) {
      const parsedPath = this.parseFilePath(filePath);
      name = name || parsedPath.name;
      namespace = namespace || parsedPath.namespace;
    }

    // Normalize metadata
    const metadata: CommandMetadata = {
      name: name,
      namespace: namespace,
      version: attributes.version || '1.0.0',
      description: attributes.description || 'No description provided',
      author: attributes.author,
      tags: this.normalizeTags(attributes.tags),
      args: this.normalizeArgs(attributes.args),
      allowedTools: this.normalizeArray(attributes['allowed-tools']),
      model: attributes.model,
      ...this.extractCustomFields(attributes)
    };

    // Validate metadata
    this.validateMetadata(metadata, filePath || 'content');

    return {
      metadata,
      content: body,
      path: '' // Will be set by caller
    };
  }

  private validateMetadata(metadata: CommandMetadata, filePath: string): void {
    const errors: string[] = [];

    // Name is now auto-generated from filename, so we just validate format
    if (metadata.name && !this.isValidCommandName(metadata.name)) {
      errors.push(`Invalid command name: ${metadata.name}. Must contain only alphanumeric characters, hyphens, and underscores`);
    }

    if (metadata.namespace && !this.isValidCommandName(metadata.namespace)) {
      errors.push(`Invalid namespace: ${metadata.namespace}. Must contain only alphanumeric characters, hyphens, and underscores`);
    }

    if (metadata.args) {
      for (const arg of metadata.args) {
        if (!arg.name) {
          errors.push('Argument name is required');
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid command metadata in ${filePath}:\n${errors.join('\n')}`);
    }
  }

  private normalizeTags(tags: any): string[] | undefined {
    if (!tags) return undefined;
    if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string');
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim());
    return undefined;
  }

  private normalizeArgs(args: any): CommandMetadata['args'] {
    if (!args) return undefined;
    if (!Array.isArray(args)) return undefined;

    return args.map(arg => {
      if (typeof arg === 'string') {
        return { name: arg, required: false };
      }
      return {
        name: arg.name,
        required: arg.required ?? false,
        description: arg.description,
        default: arg.default
      };
    });
  }

  private normalizeArray(value: any): string[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
    if (typeof value === 'string') return value.split(',').map(v => v.trim());
    return undefined;
  }

  private extractCustomFields(attributes: Record<string, any>): Record<string, any> {
    const standardFields = ['name', 'namespace', 'version', 'description', 'author', 'tags', 'args', 'allowed-tools', 'model'];
    const custom: Record<string, any> = {};

    for (const [key, value] of Object.entries(attributes)) {
      if (!standardFields.includes(key)) {
        custom[key] = value;
      }
    }

    return custom;
  }

  private isValidCommandName(name: string): boolean {
    // Allow alphanumeric, hyphens, underscores, and colons (for names like "OpenSpec: Proposal")
    return /^[a-zA-Z0-9_: -]+$/.test(name);
  }

  private parseFilePath(filePath: string): { name: string; namespace: string } {
    const parsed = path.parse(filePath);

    // Get command name from filename (without extension)
    const name = parsed.name;

    // For Claude compatibility, check if we're in .claude/commands directory
    const dirName = path.dirname(filePath);
    let namespace = 'default';

    // If in .claude/commands, use 'claude' as namespace
    if (dirName.includes('.claude' + path.sep + 'commands')) {
      namespace = 'claude';
    }
    // If in .opencommands/commands, use 'user' as namespace
    else if (dirName.includes('.opencommands' + path.sep + 'commands')) {
      namespace = 'user';
    }
    // Otherwise, use directory name as namespace if it's meaningful
    else if (path.basename(dirName) !== 'commands' && path.basename(dirName) !== '.') {
      namespace = path.basename(dirName);
    }

    return { name, namespace };
  }
}