#!/usr/bin/env node

import { Command } from 'commander';
import { getCommandManager } from './commands.js';
import { installFromGit } from './install.js';
import { executeCommand } from './executor.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('opencommands')
  .description('Simple command loader for AI coding agents')
  .version('2.0.0');

/**
 * 列出所有命令
 */
program
  .command('list')
  .alias('ls')
  .description('List all available commands')
  .action(async () => {
    const manager = getCommandManager();
    await manager.init();

    const commands = manager.getAllCommands();

    if (commands.length === 0) {
      console.log(chalk.yellow('No commands found.'));
      console.log('Install commands with: opencommands install <git-repo>');
      return;
    }

    console.log(chalk.bold(`\nAvailable commands (${commands.length}):\n`));

    for (const cmd of commands) {
      console.log(`  ${chalk.green(cmd.name.padEnd(20))} ${chalk.gray(cmd.description)}`);
    }

    console.log('');
  });

/**
 * 搜索命令
 */
program
  .command('search <query>')
  .alias('find')
  .description('Search for commands')
  .action(async (query: string) => {
    const manager = getCommandManager();
    await manager.init();

    const results = manager.search(query);

    if (results.length === 0) {
      console.log(chalk.yellow(`No commands found matching "${query}"`));
      return;
    }

    console.log(chalk.bold(`\nFound ${results.length} command(s):\n`));

    for (const cmd of results) {
      console.log(`  ${chalk.green(cmd.name.padEnd(20))} ${chalk.gray(cmd.description)}`);
    }

    console.log('');
  });

/**
 * 安装命令
 */
program
  .command('install <git-url>')
  .description('Install commands from Git repository')
  .option('-g, --global', 'Install to user directory')
  .option('-y, --yes', 'Skip interactive selection, install all commands found')
  .action(async (gitUrl: string, options: { global?: boolean; yes?: boolean }) => {
    try {
      await installFromGit(gitUrl, { global: options.global, yes: options.yes });
    } catch (error: any) {
      console.error(chalk.red('Installation failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * 执行命令
 */
program
  .command('run <command>')
  .alias('exec')
  .description('Execute a command')
  .allowUnknownOption()
  .action(async (commandName: string, _, cmd: Command) => {
    const manager = getCommandManager();
    await manager.init();

    const command = manager.getCommand(commandName);

    if (!command) {
      console.error(chalk.red(`Command "${commandName}" not found.`));
      console.log('Use "opencommands list" to see available commands.');
      process.exit(1);
    }

    try {
      await executeCommand(command, process.argv.slice(4));
    } catch (error: any) {
      console.error(chalk.red('Execution failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * 显示命令内容（供AI使用）
 */
program
  .command('show <command>')
  .description('Show command content')
  .action(async (commandName: string) => {
    const manager = getCommandManager();
    await manager.init();

    const command = manager.getCommand(commandName);

    if (!command) {
      console.error(chalk.red(`Command "${commandName}" not found.`));
      process.exit(1);
    }

    console.log(command.content);
  });

// 错误处理
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  if (err.code === 'commander.missingArgument') {
    console.error(chalk.red('Error:'), err.message);
    process.exit(1);
  }
  process.exit(err.exitCode || 1);
});

program.parse();