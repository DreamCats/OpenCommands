import { logger, config } from '../utils/index.js';
import { CommandRegistry } from '../core/registry.js';
import { LocalSource } from '../sources/local.js';
import chalk from 'chalk';
import path from 'path';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import { stringifyFrontMatter } from '../formats/frontmatter.js';

interface SearchOptions {
  fuzzy?: boolean;
  limit?: string;
  json?: boolean;
  sync?: boolean;
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  try {
    await config.load();
    const registry = new CommandRegistry();
    const localSource = new LocalSource();
    let totalLoaded = 0;

    // Track commands by source for sync functionality
    const commandsBySource = new Map<string, any[]>();
    const projectCommandsDir = path.join(process.cwd(), '.claude', 'commands');

    // 1. First, search project-level .claude/commands
    try {
      if (await localSource.validate(projectCommandsDir)) {
        const commands = await localSource.fetch(projectCommandsDir);
        commands.forEach(cmd => registry.register(cmd));
        totalLoaded += commands.length;
        commandsBySource.set('project', commands);
        logger.debug(`Loaded ${commands.length} commands from project directory`);
      }
    } catch (error) {
      logger.debug(`Project commands directory not found: ${projectCommandsDir}`);
    }

    // 2. Then, search configured commandDirectory (if different from project)
    const configCommandsDir = config.getCommandDirectory();
    if (configCommandsDir !== projectCommandsDir) {
      try {
        if (await localSource.validate(configCommandsDir)) {
          const commands = await localSource.fetch(configCommandsDir);
          commands.forEach(cmd => {
            try {
              registry.register(cmd);
              totalLoaded++;
            } catch (err) {
              // Command already exists, skip
            }
          });
          commandsBySource.set('config', commands);
          logger.debug(`Loaded ${commands.length} commands from config directory`);
        }
      } catch (error) {
        logger.debug(`Config commands directory not found: ${configCommandsDir}`);
      }
    }

    // 3. Finally, search remote sources from config
    const remoteSources = config.get().registry.sources.filter(s => s.type === 'git');
    if (remoteSources.length > 0) {
      const { GitSource } = await import('../sources/git.js');
      for (const sourceConfig of remoteSources) {
        try {
          const gitSource = new GitSource();
          const commands = await gitSource.fetch(sourceConfig.url!);
          commands.forEach(cmd => {
            try {
              registry.register(cmd);
              totalLoaded++;
            } catch (err) {
              // Command already exists, skip
            }
          });
          commandsBySource.set(`remote:${sourceConfig.url}`, commands);
          logger.debug(`Loaded ${commands.length} commands from remote source: ${sourceConfig.url}`);
        } catch (error) {
          logger.debug(`Failed to load from remote source: ${sourceConfig.url}`);
        }
      }
    }

    if (totalLoaded === 0) {
      logger.info('No commands found in any source');
      return;
    }

    // Perform search
    const limit = options.limit ? parseInt(options.limit, 10) : 10;
    const results = registry.search(query, {
      fuzzy: options.fuzzy,
      limit
    });

    if (results.length === 0) {
      logger.info(`No commands found matching "${query}"`);
      if (options.fuzzy) {
        logger.info('Try searching without --fuzzy for exact matches');
      }
      return;
    }

    if (options.json) {
      displayJson(results);
    } else {
      displayResults(results, query);
    }

    // Offer sync option if enabled and there are non-project commands
    if (options.sync) {
      await offerSyncOptions(results, commandsBySource, projectCommandsDir, registry);
    }

  } catch (error) {
    logger.error('Search failed:', error);
    process.exit(1);
  }
}

function displayResults(commands: any[], query: string): void {
  logger.info(`Found ${commands.length} command(s) matching "${query}":\n`);

  commands.forEach((cmd, index) => {
    const name = cmd.namespace ? `${cmd.namespace}:${cmd.name}` : cmd.name;
    const highlight = (text: string) => text.replace(
      new RegExp(query, 'gi'),
      match => chalk.yellow(match)
    );

    console.log(`${index + 1}. ${chalk.green(name)}`);
    console.log(`   ${highlight(cmd.description)}`);

    if (cmd.metadata.tags && cmd.metadata.tags.length > 0) {
      const highlightedTags = cmd.metadata.tags.map((tag: string) =>
        tag.toLowerCase().includes(query.toLowerCase()) ? chalk.yellow(tag) : chalk.gray(tag)
      );
      console.log(`   Tags: ${highlightedTags.join(', ')}`);
    }

    if (cmd.metadata.author) {
      console.log(`   Author: ${chalk.gray(cmd.metadata.author)}`);
    }

    console.log();
  });

  console.log(chalk.gray('Use "opencommands execute <command>" to run a command'));
}

async function offerSyncOptions(
  results: any[],
  commandsBySource: Map<string, any[]>,
  projectCommandsDir: string,
  registry: CommandRegistry
): Promise<void> {
  if (results.length === 0) {
    return;
  }

  // Build choices with source information and existing status
  const choices = results.map(cmd => {
    let source = 'unknown';
    let isProjectCommand = false;

    // Check if this command is from project source
    const projectCommands = commandsBySource.get('project') || [];
    isProjectCommand = projectCommands.some((c: any) => c.name === cmd.name);

    // Find the actual source
    for (const [src, commands] of commandsBySource.entries()) {
      if (commands.some((c: any) => c.name === cmd.name)) {
        source = src.startsWith('remote:') ? 'remote' : src;
        break;
      }
    }

    const name = cmd.namespace ? `${cmd.namespace}:${cmd.name}` : cmd.name;
    const status = isProjectCommand ? chalk.green('[已存在]') : chalk.gray(`[${source}]`);

    return {
      name: `${name} - ${cmd.description} ${status}`,
      value: { ...cmd, isProjectCommand, source },
      short: name
    };
  });

  console.log('\n' + chalk.cyan('═'.repeat(50)));
  logger.info('Select commands to sync to your project (.claude/commands):');
  logger.info(chalk.gray('Commands already in project will be overwritten if selected.\n'));

  const { selectedCommands } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedCommands',
      message: 'Use space to select, a to toggle all, enter to confirm:',
      choices,
      pageSize: 10,
      validate: (input) => input.length > 0 || 'Please select at least one command'
    }
  ]);

  if (selectedCommands.length === 0) {
    logger.info('No commands selected for sync.');
    return;
  }

  // Confirm overwrite for existing commands
  const existingCommands = selectedCommands.filter((cmd: any) => cmd.isProjectCommand);
  if (existingCommands.length > 0) {
    const { confirmOverwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmOverwrite',
        message: `You are about to overwrite ${existingCommands.length} existing command(s) in your project. Continue?`,
        default: false
      }
    ]);

    if (!confirmOverwrite) {
      logger.info('Sync cancelled.');
      return;
    }
  }

  // Ensure project directory exists
  await fs.mkdir(projectCommandsDir, { recursive: true });

  // Sync selected commands
  let syncedCount = 0;
  let overwrittenCount = 0;

  for (const cmd of selectedCommands) {
    try {
      let filePath: string;

      if (cmd.namespace) {
        // Create namespace directory and save command inside it
        const namespaceDir = path.join(projectCommandsDir, cmd.namespace);
        await fs.mkdir(namespaceDir, { recursive: true });
        filePath = path.join(namespaceDir, `${cmd.name}.md`);
      } else {
        // Save directly in project commands directory
        filePath = path.join(projectCommandsDir, `${cmd.name}.md`);
      }

      // Check if overwriting
      const isOverwriting = cmd.isProjectCommand;

      // Write command file
      const content = stringifyFrontMatter(cmd.metadata, cmd.content || cmd.body || '');
      await fs.writeFile(filePath, content, 'utf-8');

      if (isOverwriting) {
        overwrittenCount++;
        logger.info(`Overwritten ${cmd.namespace ? cmd.namespace + ':' : ''}${cmd.name}`);
      } else {
        syncedCount++;
        logger.success(`Synced ${cmd.namespace ? cmd.namespace + ':' : ''}${cmd.name} from ${cmd.source}`);
      }
    } catch (error) {
      logger.error(`Failed to sync ${cmd.name}:`, error);
    }
  }

  if (syncedCount > 0 || overwrittenCount > 0) {
    logger.success(`\nSync complete!`);
    if (syncedCount > 0) {
      logger.info(`- ${syncedCount} new command(s) synced`);
    }
    if (overwrittenCount > 0) {
      logger.info(`- ${overwrittenCount} command(s) overwritten`);
    }
    logger.info(`Commands are now available in: ${projectCommandsDir}`);
  }
}

function displayJson(commands: any[]): void {
  const output = commands.map(cmd => ({
    name: cmd.name,
    namespace: cmd.namespace,
    fullName: cmd.fullName,
    description: cmd.description,
    version: cmd.version,
    author: cmd.metadata.author,
    tags: cmd.metadata.tags,
    score: calculateScore(cmd),
    path: cmd.path
  }));

  console.log(JSON.stringify(output, null, 2));
}

function calculateScore(command: any): number {
  // Simple relevance scoring based on usage and recency
  let score = 0;

  if (command.useCount > 0) {
    score += Math.min(command.useCount * 10, 50); // Cap at 50
  }

  if (command.lastUsed) {
    const daysSinceLastUse = (Date.now() - command.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - daysSinceLastUse); // Recent usage bonus
  }

  return score;
}