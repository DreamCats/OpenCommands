import { logger, config } from '../utils/index.js';
import { CommandRegistry } from '../core/registry.js';
import { LocalSource } from '../sources/local.js';
import chalk from 'chalk';

interface ListOptions {
  namespace?: string;
  tag?: string;
  json?: boolean;
  stats?: boolean;
  user?: boolean;
  git?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  try {
    await config.load();
    const registry = new CommandRegistry();

    // If --git flag is set, only load from configured Git repositories
    if (options.git) {
      const remoteSources = config.get().registry.sources.filter(s => s.type === 'git');
      if (remoteSources.length === 0) {
        logger.info('未配置 Git 仓库源');
        return;
      }

      const { GitSource } = await import('../sources/git.js');
      let totalLoaded = 0;

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
          logger.info(`从 Git 仓库 ${sourceConfig.url} 加载了 ${commands.length} 个命令`);
        } catch (error) {
          logger.error(`从 Git 仓库 ${sourceConfig.url} 加载命令失败:`, error);
        }
      }

      if (totalLoaded === 0) {
        logger.info('未从 Git 仓库找到任何命令');
        return;
      }
    } else {
      // Load commands from local directory
      const localSource = new LocalSource();

      // If --user flag is set, only load from user-level directory
      if (options.user) {
        const commandsDir = config.getCommandDirectory();
        if (await localSource.validate(commandsDir)) {
          const commands = await localSource.fetch(commandsDir);
          commands.forEach(cmd => registry.register(cmd));
          logger.info(`从用户目录 ${commandsDir} 加载了 ${commands.length} 个命令`);
        }
      } else {
        // Default behavior: check project-level first, then fall back to user-level
        const projectCommandsDir = '.claude/commands';
        let loadedFromProject = false;

        if (await localSource.validate(projectCommandsDir)) {
          const commands = await localSource.fetch(projectCommandsDir);
          commands.forEach(cmd => registry.register(cmd));
          loadedFromProject = true;
          logger.info(`从项目目录 ${projectCommandsDir} 加载了 ${commands.length} 个命令`);
        }

        // If no project-level commands, fall back to user-level directory
        if (!loadedFromProject) {
          const commandsDir = config.getCommandDirectory();
          if (await localSource.validate(commandsDir)) {
            const commands = await localSource.fetch(commandsDir);
            commands.forEach(cmd => registry.register(cmd));
            logger.info(`从用户目录 ${commandsDir} 加载了 ${commands.length} 个命令`);
          }
        }
      }
    }

    // Get filtered commands
    const filters = {
      namespace: options.namespace,
      tag: options.tag
    };

    const commands = registry.findAll(filters);

    if (options.stats) {
      displayStats(registry);
      return;
    }

    if (options.json) {
      displayJson(commands);
      return;
    }

    displayTable(commands, options);

  } catch (error) {
    logger.error('列出命令失败：', error);
    process.exit(1);
  }
}

function displayTable(commands: any[], options: ListOptions): void {
  if (commands.length === 0) {
    logger.info('未找到命令');
    if (!options.namespace && !options.tag) {
      logger.info('尝试使用以下命令安装一些命令：opencommands install <source>');
    }
    return;
  }

  logger.info(`找到 ${commands.length} 个命令：\n`);

  // Group by namespace
  const byNamespace = new Map<string, any[]>();
  commands.forEach(cmd => {
    const ns = cmd.namespace || 'default';
    if (!byNamespace.has(ns)) {
      byNamespace.set(ns, []);
    }
    byNamespace.get(ns)!.push(cmd);
  });

  // Display commands grouped by namespace
  for (const [namespace, cmds] of byNamespace) {
    console.log(chalk.bold.blue(`${namespace}/`));

    cmds.forEach(cmd => {
      const name = cmd.namespace ? `${cmd.namespace}:${cmd.name}` : cmd.name;
      const args = cmd.metadata.args?.map((a: any) =>
        a.required ? `<${a.name}>` : `[${a.name}]`
      ).join(' ') || '';

      console.log(`  ${chalk.green(name)} ${chalk.gray(args)}`);
      console.log(`    ${cmd.description}`);

      if (cmd.metadata.tags && cmd.metadata.tags.length > 0) {
        console.log(`    ${chalk.gray('Tags:')} ${cmd.metadata.tags.join(', ')}`);
      }

      if (cmd.metadata.author) {
        console.log(`    ${chalk.gray('Author:')} ${cmd.metadata.author}`);
      }

      console.log();
    });
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
    args: cmd.metadata.args,
    path: cmd.path
  }));

  console.log(JSON.stringify(output, null, 2));
}

function displayStats(registry: CommandRegistry): void {
  const stats = registry.getStats();

  console.log(chalk.bold('命令注册表统计\n'));

  console.log(`${chalk.blue('总命令数：')} ${stats.totalCommands}`);
  console.log(`${chalk.blue('总命名空间：')} ${stats.totalNamespaces}`);
  console.log(`${chalk.blue('总标签数：')} ${stats.totalTags}`);
  console.log();

  if (stats.mostUsed.length > 0) {
    console.log(chalk.bold('最常用的命令：'));
    stats.mostUsed.forEach(cmd => {
      console.log(`  ${chalk.green(cmd.fullName)} - ${cmd.useCount} 次使用`);
    });
    console.log();
  }

  if (stats.recentlyAdded.length > 0) {
    console.log(chalk.bold('最近添加：'));
    stats.recentlyAdded.forEach(cmd => {
      console.log(`  ${chalk.green(cmd.fullName)} - ${cmd.registeredAt.toLocaleDateString()}`);
    });
  }
}