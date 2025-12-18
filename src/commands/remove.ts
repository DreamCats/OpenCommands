import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { logger, config } from '../utils/index.js';
import { LocalSource } from '../sources/local.js';

interface RemoveOptions {
  namespace?: string;
  force?: boolean;
}

export async function removeCommand(commandName: string, options: RemoveOptions): Promise<void> {
  try {
    await config.load();

    // Determine the command file path
    const commandsDir = config.getCommandDirectory();
    const fileName = `${commandName}.md`;
    const filePath = options.namespace
      ? path.join(commandsDir, options.namespace, fileName)
      : path.join(commandsDir, fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      logger.error(`Command not found: ${commandName}`);
      if (options.namespace) {
        logger.info(`Checked: ${filePath}`);
      } else {
        logger.info('Use --namespace if the command is in a namespace');
      }
      process.exit(1);
    }

    // Load command info
    const localSource = new LocalSource();
    const commandInfo = await localSource.getCommandInfo(filePath);

    // Confirm removal
    if (!options.force) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Remove command "${commandInfo.name}" (${commandInfo.description})?`,
          default: false
        }
      ]);

      if (!confirmed) {
        logger.info('Removal cancelled');
        return;
      }
    }

    // Remove the file
    await fs.unlink(filePath);

    logger.success(`Command removed: ${commandName}`);

    // Check if namespace directory is empty
    if (options.namespace) {
      const namespaceDir = path.join(commandsDir, options.namespace);
      try {
        const files = await fs.readdir(namespaceDir);
        if (files.length === 0) {
          await fs.rmdir(namespaceDir);
          logger.info(`Removed empty namespace directory: ${options.namespace}`);
        }
      } catch {
        // Ignore errors checking namespace directory
      }
    }

  } catch (error) {
    logger.error('Failed to remove command:', error);
    process.exit(1);
  }
}