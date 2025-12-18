export interface CommandMetadata {
  name: string;
  namespace?: string;
  version?: string;
  description: string;
  author?: string;
  tags?: string[];
  args?: CommandArgument[];
  allowedTools?: string[];
  model?: string;
  [key: string]: any;
}

export interface CommandArgument {
  name: string;
  required?: boolean;
  description?: string;
  default?: any;
}

export interface Command {
  name: string;
  namespace?: string;
  version: string;
  description: string;
  content: string;
  metadata: CommandMetadata;
  source: CommandSource;
  path: string;
}

export interface CommandSource {
  type: 'git' | 'local' | 'npm' | 'registry';
  url?: string;
  path?: string;
  package?: string;
}

export interface ParsedCommand {
  metadata: CommandMetadata;
  content: string;
  path: string;
}

export interface ListFilters {
  namespace?: string;
  tag?: string;
  type?: 'skill' | 'command';
}

export interface SearchOptions {
  fuzzy?: boolean;
  limit?: number;
}

export interface InstallOptions {
  namespace?: string;
  global?: boolean;
  force?: boolean;
}

export interface ExecuteOptions {
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}