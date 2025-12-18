import path from 'path';
import { logger, config } from '../utils/index.js';
import { CommandRegistry } from '../core/registry.js';
import { LocalSource } from '../sources/local.js';
import { GitSource } from '../sources/git.js';
import { ensureDir } from '../utils/file.js';
import type { InstallOptions } from '../types/index.js';

interface ExtendedInstallOptions extends InstallOptions {
  global?: boolean;
  all?: boolean;
}

export async function installCommand(source: string, options: ExtendedInstallOptions): Promise<void> {
  try {
    logger.info(`Installing commands from: ${source}`);

    // Load configuration
    await config.load();

    // Determine target directory
    const targetDir = options.global
      ? path.join(config.getCommandDirectory(), options.namespace || '')
      : path.join(process.cwd(), '.claude', 'commands', options.namespace || '');

    await ensureDir(targetDir);

    // Create registry
    const registry = new CommandRegistry();

    // Determine source type and fetch commands
    let commands;

    if (isGitUrl(source)) {
      logger.info('Detected Git repository');
      const gitSource = new GitSource();

      // 如果是 GitHub 简写格式，转换为完整 URL
      let gitUrl = source;
      if (/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/.test(source)) {
        gitUrl = `https://github.com/${source}.git`;
        logger.info(`Converted shorthand to: ${gitUrl}`);
      }

      commands = await gitSource.fetch(gitUrl);
    } else if (await isLocalPath(source)) {
      logger.info('Detected local path');
      const localSource = new LocalSource();
      commands = await localSource.fetch(source);
    } else {
      logger.error('Unknown source type. Please provide a Git URL or local path.');
      process.exit(1);
    }

    if (commands.length === 0) {
      logger.warn('No commands found in the source');
      return;
    }

    logger.info(`Found ${commands.length} command(s)`);

    // Let user select commands to install (unless --all is specified)
    let selectedCommands = commands;

    if (!options.all && commands.length > 0) {
      const inquirer = await import('inquirer');

      logger.info('');
      logger.info('选择要安装的命令（按空格选择，回车确认）：');

      const choices = commands.map(cmd => ({
        name: `${cmd.fullName} - ${cmd.description || '无描述'}`,
        value: cmd,
        checked: false
      }));

      try {
        const answers = await inquirer.default.prompt([
          {
            type: 'checkbox',
            name: 'selectedCommands',
            message: '命令列表',
            choices: choices,
            pageSize: 10,
            validate: (input) => {
              if (input.length === 0) {
                return '请至少选择一个命令';
              }
              return true;
            }
          }
        ]);

        selectedCommands = answers.selectedCommands;
      } catch (error) {
        logger.info('取消安装');
        return;
      }

      if (selectedCommands.length === 0) {
        logger.warn('未选择任何命令');
        return;
      }
    }

    // Apply namespace if specified
    if (options.namespace) {
      selectedCommands.forEach(cmd => {
        cmd.namespace = options.namespace;
      });
    }

    // Check for conflicts
    const conflicts: string[] = [];
    for (const command of selectedCommands) {
      const key = command.namespace ? `${command.namespace}:${command.name}` : command.name;
      if (registry.find(key)) {
        conflicts.push(key);
      }
    }

    if (conflicts.length > 0 && !options.force) {
      logger.error('Command conflicts detected:');
      conflicts.forEach(name => logger.error(`  - ${name}`));
      logger.info('Use --force to overwrite existing commands');
      process.exit(1);
    }

    // Save commands to files
    const savedCommands: string[] = [];

    for (const command of selectedCommands) {
      const fileName = `${command.name}.md`;
      let filePath: string;

      if (command.namespace) {
        // Create namespace directory
        const namespaceDir = path.join(targetDir, command.namespace);
        await ensureDir(namespaceDir);
        filePath = path.join(namespaceDir, fileName);
      } else {
        filePath = path.join(targetDir, fileName);
      }

      try {
        // Save command file
        await saveCommandFile(command, filePath);
        savedCommands.push(command.fullName);
        logger.success(`已安装: ${command.fullName}`);
      } catch (error) {
        logger.error(`安装 ${command.fullName} 失败:`, error);
      }
    }

    logger.info('');
    logger.success(`成功安装 ${savedCommands.length} 个命令`);

    if (savedCommands.length > 0) {
      logger.info('');
      logger.info('安装位置:');
      logger.info(`  ${targetDir}`);
      logger.info('');
      logger.info('试试这些命令:');
      logger.info(`  opencommands list                    # 列出所有命令`);
      logger.info(`  opencommands execute ${savedCommands[0]}  # 执行命令`);
    }

  } catch (error) {
    logger.error('Installation failed:', error);
    process.exit(1);
  }
}

function isGitUrl(url: string): boolean {
  // 支持 GitHub 简写格式（如 DreamCats/my-commands）
  if (/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/.test(url)) {
    return true;
  }

  return /^https?:\/\/.*\.git$/.test(url) ||
         /^git@.*:.*\.git$/.test(url) ||
         /^https?:\/\/github\.com\//.test(url) ||
         /^https?:\/\/gitlab\.com\//.test(url);
}

async function isLocalPath(path: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function saveCommandFile(command: any, filePath: string): Promise<void> {
  const { stringifyFrontMatter } = await import('../formats/frontmatter.js');
  const { promises: fs } = await import('fs');
  const content = stringifyFrontMatter(command.metadata, command.content);
  await fs.writeFile(filePath, content, 'utf-8');
}