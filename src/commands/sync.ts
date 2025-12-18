import { logger, config } from '../utils/index.js';
import { LocalSource } from '../sources/local.js';
import { GitSource } from '../sources/git.js';
import { ClaudeIntegration } from '../integrations/claude.js';
import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { stringifyFrontMatter } from '../formats/frontmatter.js';

interface SyncOptions {
  dryRun?: boolean;
  source?: string;
  claude?: boolean;
  localOnly?: boolean;
  noExit?: boolean; // For testing purposes
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  try {
    await config.load();
    const cfg = config.get();

    logger.info('Syncing commands...');

    if (options.dryRun) {
      logger.info('Running in dry-run mode - no changes will be made');
    }

    // Load all commands from local directory
    const localSource = new LocalSource();
    const commandsDir = config.getCommandDirectory();
    let allCommands: any[] = [];

    if (await localSource.validate(commandsDir)) {
      allCommands = await localSource.fetch(commandsDir);
      logger.info(`Found ${allCommands.length} local commands`);
    }

    // Filter sources if specified
    const sources = options.source
      ? cfg.registry.sources.filter(s => s.url === options.source || s.path === options.source)
      : cfg.registry.sources;

    let hasErrors = false;
    const syncCandidates: Array<{
      command: any;
      action: 'update' | 'new';
      source: string;
      oldVersion?: string;
      newVersion?: string;
    }> = [];

    if (options.localOnly) {
      logger.info('Local-only sync requested, skipping remote sources');
    } else if (sources.length === 0) {
      logger.info('No remote sources configured, syncing local commands only');
    } else {
      // Sync from remote sources
      logger.info(`Syncing from ${sources.length} source(s)...`);

      for (const source of sources) {
        logger.info(`Syncing from ${source.type} source...`);

        try {
          let remoteCommands;

          switch (source.type) {
            case 'git':
              if (!source.url) {
                logger.warn('Git source missing URL');
                continue;
              }
              const gitSource = new GitSource();
              remoteCommands = await gitSource.fetch(source.url);
              break;

            case 'local':
              if (!source.path) {
                logger.warn('Local source missing path');
                continue;
              }
              remoteCommands = await localSource.fetch(source.path);
              break;

            default:
              logger.warn(`Unsupported source type: ${source.type}`);
              continue;
          }

          logger.info(`Found ${remoteCommands.length} commands in ${source.type} source`);

          // Collect sync candidates
          for (const remoteCmd of remoteCommands) {
            const existing = allCommands.find(cmd =>
              cmd.name === remoteCmd.name && cmd.namespace === remoteCmd.namespace
            );

            if (existing) {
              // Check if update is needed
              const remoteVersion = remoteCmd.version || '1.0.0';
              const localVersion = existing.version || '1.0.0';

              if (remoteVersion !== localVersion) {
                syncCandidates.push({
                  command: remoteCmd,
                  action: 'update',
                  source: source.type!,
                  oldVersion: localVersion,
                  newVersion: remoteVersion
                });
              }
            } else {
              syncCandidates.push({
                command: remoteCmd,
                action: 'new',
                source: source.type!
              });
            }
          }

        } catch (error) {
          logger.error(`Failed to sync from ${source.type} source:`, error instanceof Error ? error.message : String(error));
          hasErrors = true;
        }
      }
    }

    // If we have sync candidates, let user choose what to sync
    if (syncCandidates.length > 0) {
      logger.info(`\nFound ${syncCandidates.length} command(s) to sync:`);

      // Display candidates
      syncCandidates.forEach((candidate, index) => {
        const name = candidate.command.namespace
          ? `${candidate.command.namespace}:${candidate.command.name}`
          : candidate.command.name;

        if (candidate.action === 'update') {
          logger.info(`${index + 1}. [更新] ${name} (${candidate.oldVersion} → ${candidate.newVersion}) - ${candidate.command.description}`);
        } else {
          logger.info(`${index + 1}. [新增] ${name} - ${candidate.command.description}`);
        }
      });

      if (!options.dryRun) {
        // Ask user to select commands to sync
        const { selectedIndices } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedIndices',
            message: '选择要同步的命令（空格键选择，a键全选，回车确认）：',
            choices: syncCandidates.map((candidate, index) => {
              const name = candidate.command.namespace
                ? `${candidate.command.namespace}:${candidate.command.name}`
                : candidate.command.name;
              return {
                name: `${candidate.action === 'update' ? '🔄' : '✨'} ${name} - ${candidate.command.description}`,
                value: index,
                checked: true
              };
            }),
            pageSize: 10
          }
        ]);

        if (selectedIndices.length === 0) {
          logger.info('未选择任何命令，同步已取消。');
          return;
        }

        // Sync selected commands
        let updatedCount = 0;
        let newCount = 0;

        for (const index of selectedIndices) {
          const candidate = syncCandidates[index];

          try {
            if (candidate.action === 'update') {
              // Update existing command
              const existingIndex = allCommands.findIndex(cmd =>
                cmd.name === candidate.command.name && cmd.namespace === candidate.command.namespace
              );

              if (existingIndex !== -1) {
                // Replace the command
                allCommands[existingIndex] = candidate.command;

                // Save to file
                await saveCommandToFile(candidate.command, commandsDir);
                updatedCount++;
                logger.success(`已更新: ${candidate.command.fullName}`);
              }
            } else {
              // Add new command
              allCommands.push(candidate.command);

              // Save to file
              await saveCommandToFile(candidate.command, commandsDir);
              newCount++;
              logger.success(`已新增: ${candidate.command.fullName}`);
            }
          } catch (error) {
            logger.error(`同步失败: ${candidate.command.fullName}`, error);
          }
        }

        logger.info(`\n同步完成！`);
        logger.info(`- 更新: ${updatedCount} 个命令`);
        logger.info(`- 新增: ${newCount} 个命令`);
      }
    } else {
      logger.info('没有发现需要同步的命令。');
    }

    // Generate Claude Code compatibility files if requested
    if (options.claude) {
      logger.info('Generating Claude Code compatibility files...');
      await generateClaudeCompatibility(allCommands, options);
    }

    logger.info('');
    logger.success('Sync completed');

    if (options.dryRun) {
      logger.info('\nRun without --dry-run to apply these changes');
    }

    if (hasErrors) {
      logger.warn('Some sources failed to sync');
    }

  } catch (error) {
    logger.error('Sync failed:', error instanceof Error ? error.message : String(error));
    if (!options.noExit) {
      process.exit(1);
    }
    throw error;
  }
}

async function saveCommandToFile(command: any, commandsDir: string): Promise<void> {
  try {
    let filePath: string;

    if (command.namespace) {
      // Create namespace directory and save command inside it
      const namespaceDir = path.join(commandsDir, command.namespace);
      await fs.mkdir(namespaceDir, { recursive: true });
      filePath = path.join(namespaceDir, `${command.name}.md`);
    } else {
      // Save directly in commands directory
      filePath = path.join(commandsDir, `${command.name}.md`);
    }

    // Convert command to markdown format with frontmatter
    const content = stringifyFrontMatter(command.metadata, command.content || command.body || '');
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    logger.error(`Failed to save command ${command.fullName}:`, error);
    throw error;
  }
}

async function generateClaudeCompatibility(commands: any[], options: SyncOptions): Promise<void> {
  const claude = new ClaudeIntegration();

  // Generate AGENTS.md
  const agentsContent = claude.generateAgentsMd(commands);
  const agentsPath = path.join(process.cwd(), 'AGENTS.md');

  if (options.dryRun) {
    logger.info(`Would create: ${agentsPath}`);
  } else {
    await fs.writeFile(agentsPath, agentsContent, 'utf-8');
    logger.success(`Created: ${agentsPath}`);
  }

  // Generate .claude/commands directory
  const claudeCommandsDir = path.join(process.cwd(), '.claude', 'commands');

  if (!options.dryRun) {
    await fs.mkdir(claudeCommandsDir, { recursive: true });
  }

  // Convert commands to Claude format
  for (const command of commands) {
    const claudeContent = claude.toClaudeCommandFormat(command);
    const claudePath = path.join(claudeCommandsDir, `${command.name}.md`);

    if (options.dryRun) {
      logger.info(`Would create: ${claudePath}`);
    } else {
      await fs.writeFile(claudePath, claudeContent, 'utf-8');
    }
  }

  if (!options.dryRun) {
    logger.success(`Created ${commands.length} Claude-compatible commands in ${claudeCommandsDir}`);
  }
}