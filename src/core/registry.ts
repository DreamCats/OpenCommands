import type { Command, ListFilters, SearchOptions } from '../types/index.js';

export interface RegisteredCommand extends Command {
  registeredAt: Date;
  lastUsed?: Date;
  useCount: number;
}

export class CommandRegistry {
  private commands = new Map<string, RegisteredCommand>();
  private aliases = new Map<string, string>();
  private tags = new Map<string, Set<string>>();

  register(command: Command): void {
    const key = this.getCommandKey(command);

    // Check for duplicates
    if (this.commands.has(key)) {
      throw new Error(`Command already registered: ${key}`);
    }

    const registered: RegisteredCommand = {
      ...command,
      registeredAt: new Date(),
      useCount: 0
    };

    this.commands.set(key, registered);

    // Add namespace alias
    if (command.namespace) {
      const alias = `${command.namespace}:${command.name}`;
      this.aliases.set(alias, key);
    }

    // Index by tags
    if (command.metadata.tags) {
      for (const tag of command.metadata.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(key);
      }
    }
  }

  unregister(key: string): boolean {
    const command = this.commands.get(key);
    if (!command) {
      return false;
    }

    // Remove from main registry
    this.commands.delete(key);

    // Remove aliases
    for (const [alias, target] of this.aliases.entries()) {
      if (target === key) {
        this.aliases.delete(alias);
      }
    }

    // Remove from tag index
    if (command.metadata.tags) {
      for (const tag of command.metadata.tags) {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(key);
          if (tagSet.size === 0) {
            this.tags.delete(tag);
          }
        }
      }
    }

    return true;
  }

  find(name: string): RegisteredCommand | undefined {
    // Try direct lookup
    const direct = this.commands.get(name);
    if (direct) return direct;

    // Try alias lookup
    const aliased = this.aliases.get(name);
    if (aliased) return this.commands.get(aliased);

    // Try simple name lookup (without namespace)
    const matches = Array.from(this.commands.values()).filter(cmd =>
      cmd.name === name || (cmd.namespace ? `${cmd.namespace}:${cmd.name}` : cmd.name) === name
    );

    if (matches.length === 1) {
      return matches[0];
    }

    return undefined;
  }

  findAll(filters?: ListFilters): RegisteredCommand[] {
    let commands = Array.from(this.commands.values());

    if (filters?.namespace) {
      commands = commands.filter(cmd => cmd.namespace === filters.namespace);
    }

    if (filters?.tag) {
      const tagged = this.tags.get(filters.tag);
      if (tagged) {
        commands = commands.filter(cmd => tagged.has(this.getCommandKey(cmd)));
      } else {
        commands = [];
      }
    }

    if (filters?.type) {
      commands = commands.filter(cmd => cmd.metadata.type === filters.type);
    }

    return commands;
  }

  search(query: string, options: SearchOptions = {}): RegisteredCommand[] {
    const allCommands = Array.from(this.commands.values());
    const lowercaseQuery = query.toLowerCase();

    // Simple search
    let results = allCommands.filter(cmd => {
      const searchable = [
        cmd.name,
        cmd.namespace || '',
        cmd.description,
        ...(cmd.metadata.tags || [])
      ].join(' ').toLowerCase();

      return searchable.includes(lowercaseQuery);
    });

    // If fuzzy search is enabled and no exact matches
    if (options.fuzzy && results.length === 0) {
      results = allCommands.filter(cmd => {
        const searchable = [
          cmd.name,
          cmd.namespace || '',
          cmd.description
        ].join(' ').toLowerCase();

        // Simple fuzzy matching (character by character)
        let queryIndex = 0;
        for (let i = 0; i < searchable.length && queryIndex < lowercaseQuery.length; i++) {
          if (searchable[i] === lowercaseQuery[queryIndex]) {
            queryIndex++;
          }
        }

        return queryIndex === lowercaseQuery.length;
      });
    }

    // Sort by relevance (commands that start with query first)
    results.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lowercaseQuery);
      const bStarts = b.name.toLowerCase().startsWith(lowercaseQuery);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.name.localeCompare(b.name);
    });

    // Apply limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  listNamespaces(): string[] {
    const namespaces = new Set<string>();
    for (const command of this.commands.values()) {
      if (command.namespace) {
        namespaces.add(command.namespace);
      }
    }
    return Array.from(namespaces).sort();
  }

  listTags(): string[] {
    return Array.from(this.tags.keys()).sort();
  }

  getStats(): RegistryStats {
    const commands = Array.from(this.commands.values());
    const namespaces = this.listNamespaces();
    const tags = this.listTags();

    return {
      totalCommands: commands.length,
      totalNamespaces: namespaces.length,
      totalTags: tags.length,
      mostUsed: commands
        .filter(cmd => cmd.useCount > 0)
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, 5),
      recentlyAdded: commands
        .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
        .slice(0, 5)
    };
  }

  recordUsage(key: string): void {
    const command = this.commands.get(key);
    if (command) {
      command.useCount++;
      command.lastUsed = new Date();
    }
  }

  clear(): void {
    this.commands.clear();
    this.aliases.clear();
    this.tags.clear();
  }

  private getCommandKey(command: Command | RegisteredCommand): string {
    return command.namespace ? `${command.namespace}:${command.name}` : command.name;
  }
}

export interface RegistryStats {
  totalCommands: number;
  totalNamespaces: number;
  totalTags: number;
  mostUsed: RegisteredCommand[];
  recentlyAdded: RegisteredCommand[];
}