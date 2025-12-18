#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from './commands/install.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { initCommand } from './commands/init.js';
import { removeCommand } from './commands/remove.js';
import { syncCommand } from './commands/sync.js';
import { configCommand } from './commands/config.js';
import { logger } from './utils/index.js';

const program = new Command();

program
  .name('opencommands')
  .description('Universal command loader for AI assistants')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      logger.setLevel(3); // DEBUG
    } else if (opts.quiet) {
      logger.setLevel(0); // ERROR only
    }
  });

// Initialize command
program
  .command('init')
  .description('Initialize opencommands configuration')
  .option('-g, --global', 'Initialize global config')
  .option('-d, --dir <directory>', 'Command directory path')
  .action(initCommand);

// Install command
program
  .command('install <source>')
  .description('Install commands from a source (Git repo, local path, or NPM package)')
  .option('-n, --namespace <namespace>', 'Install to specific namespace')
  .option('-g, --global', 'Install to global directory')
  .option('-f, --force', 'Force installation even if command exists')
  .option('-a, --all', 'Install all commands without prompting')
  .action(installCommand);

// List command
program
  .command('list')
  .description('List installed commands')
  .option('-n, --namespace <namespace>', 'Filter by namespace')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-u, --user', 'List commands from user-level directory only')
  .option('--git', 'List commands from configured Git repositories')
  .option('--json', 'Output as JSON')
  .option('--stats', 'Show statistics')
  .action(listCommand);

// Search command
program
  .command('search <query>')
  .description('Search for commands')
  .option('-f, --fuzzy', 'Enable fuzzy search')
  .option('-l, --limit <number>', 'Limit results', '10')
  .option('--json', 'Output as JSON')
  .option('--sync', 'Enable interactive sync of found commands to project directory')
  .action(searchCommand);

// Remove command
program
  .command('remove <command>')
  .alias('rm')
  .description('Remove an installed command')
  .option('-n, --namespace <namespace>', 'Command namespace')
  .option('-f, --force', 'Force removal without confirmation')
  .action(removeCommand);

// Sync command
program
  .command('sync')
  .description('Sync commands with sources')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('--source <source>', 'Sync specific source only')
  .option('--claude', 'Generate Claude Code compatibility files')
  .option('--local-only', 'Only sync local commands, skip remote sources')
  .action(syncCommand);

// Config command
program
  .command('config')
  .description('Manage configuration')
  .option('--get <key>', 'Get configuration value')
  .option('--set <key> <value>', 'Set configuration value')
  .option('--list', 'List all configuration')
  .action(configCommand);

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str))
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Parse arguments
program.parse();