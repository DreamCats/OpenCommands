import type { Command } from '../types/index.js';

export class ClaudeIntegration {
  /**
   * Generate XML registry format compatible with Claude Code
   */
  generateXMLRegistry(commands: Command[]): string {
    const skills = commands.map(cmd => {
      const name = cmd.namespace ? `${cmd.namespace}:${cmd.name}` : cmd.name;
      return `  <skill>${name}: ${cmd.description}</skill>`;
    }).join('\n');

    return `<available_skills>\n${skills}\n</available_skills>`;
  }

  /**
   * Generate command help in Claude Code format
   */
  generateCommandsHelp(commands: Command[]): string {
    return commands.map(cmd => {
      const name = cmd.namespace ? `${cmd.namespace}:${cmd.name}` : cmd.name;
      const args = cmd.metadata.args?.map(arg =>
        arg.required ? `<${arg.name}>` : `[${arg.name}]`
      ).join(' ') || '';
      return `/${name} ${args} - ${cmd.description}`;
    }).join('\n');
  }

  /**
   * Generate AGENTS.md content with commands
   */
  generateAgentsMd(commands: Command[]): string {
    const xmlRegistry = this.generateXMLRegistry(commands);
    const commandsHelp = this.generateCommandsHelp(commands);

    return `<!-- OPENSKILLS:START -->
${xmlRegistry}
<!-- OPENSKILLS:END -->

## Available Commands

${commandsHelp}

## Usage

Use slash commands to quickly access these capabilities:
- Type "/" to see available commands
- Use Tab for autocompletion
- Commands support arguments and options
`;
  }

  /**
   * Convert OpenCommands format to Claude Code command format
   */
  toClaudeCommandFormat(command: Command): string {
    const frontmatter = {
      'allowed-tools': command.metadata.allowedTools,
      'argument-hint': command.argumentString,
      'description': command.description,
      'model': command.metadata.model
    };

    // Remove undefined values
    Object.keys(frontmatter).forEach(key => {
      if (frontmatter[key as keyof typeof frontmatter] === undefined) {
        delete frontmatter[key as keyof typeof frontmatter];
      }
    });

    const yaml = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `---\n${yaml}\n---\n\n${command.content}`;
  }

  /**
   * Parse Claude Code command format to OpenCommands format
   */
  fromClaudeCommandFormat(content: string): Partial<Command> {
    const lines = content.split('\n');
    const frontmatter: Record<string, any> = {};
    let inFrontmatter = false;
    let bodyStart = 0;

    // Parse frontmatter
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '---') {
        if (inFrontmatter) {
          bodyStart = i + 1;
          break;
        } else {
          inFrontmatter = true;
          continue;
        }
      }

      if (inFrontmatter && line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        try {
          frontmatter[key.trim()] = JSON.parse(value);
        } catch {
          frontmatter[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }

    const body = lines.slice(bodyStart).join('\n').trim();

    return {
      description: frontmatter.description || '',
      content: body,
      metadata: {
        name: '', // Will be set by caller
        description: frontmatter.description || '',
        allowedTools: frontmatter['allowed-tools'],
        model: frontmatter.model
      }
    };
  }
}