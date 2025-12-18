import type { CommandMetadata, CommandSource } from '../types/index.js';

export class Command {
  constructor(
    public name: string,
    public description: string,
    public content: string,
    public metadata: CommandMetadata,
    public source: CommandSource,
    public path: string,
    public namespace?: string,
    public version: string = '1.0.0'
  ) {}

  get fullName(): string {
    return this.namespace ? `${this.namespace}:${this.name}` : this.name;
  }

  get argumentString(): string {
    if (!this.metadata.args || this.metadata.args.length === 0) {
      return '';
    }

    return this.metadata.args.map(arg =>
      arg.required ? `<${arg.name}>` : `[${arg.name}]`
    ).join(' ');
  }

  substituteArguments(args: string[]): string {
    let content = this.content;

    // Replace $ARGUMENTS with all arguments
    content = content.replace(/\$ARGUMENTS/g, args.join(' '));

    // Replace positional arguments $1, $2, etc.
    args.forEach((arg, index) => {
      content = content.replace(new RegExp(`\\$${index + 1}`, 'g'), arg);
    });

    // Replace named arguments if defined
    if (this.metadata.args) {
      this.metadata.args.forEach((arg, index) => {
        const value = args[index] || arg.default || '';
        content = content.replace(new RegExp(`\\$${arg.name}`, 'g'), value);
      });
    }

    return content;
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('Command name is required');
    }

    if (!this.description || this.description.trim() === '') {
      errors.push('Command description is required');
    }

    if (!this.content || this.content.trim() === '') {
      errors.push('Command content is required');
    }

    // Validate name format (alphanumeric, hyphens, and underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(this.name)) {
      errors.push('Command name must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate namespace if present
    if (this.namespace && !/^[a-zA-Z0-9_-]+$/.test(this.namespace)) {
      errors.push('Namespace must contain only alphanumeric characters, hyphens, and underscores');
    }

    return errors;
  }
}