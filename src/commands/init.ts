import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger, config, ensureDir } from '../utils/index.js';
import { stringifyFrontMatter } from '../formats/frontmatter.js';

interface InitOptions {
  global?: boolean;
  dir?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  try {
    const configDir = path.join(os.homedir(), '.opencommands');
    const commandsDir = options.dir || path.join(configDir, 'commands');

    logger.info('Initializing OpenCommands...');

    // Create directories
    await ensureDir(configDir);
    await ensureDir(commandsDir);

    // Create default config
    const defaultConfig = {
      registry: {
        sources: [
          {
            type: 'git',
            url: 'https://github.com/DreamCats/my-commands'
          }
        ],
        namespaces: {}
      },
      settings: {
        defaultModel: 'claude-3-5-sonnet-20241022',
        autoUpdate: true,
        parallelDownloads: 3,
        commandDirectory: commandsDir,
        logLevel: 'info'
      }
    };

    // Save config
    config.set(defaultConfig);
    await config.save();

    // Create example command
    const exampleCommand = {
      name: 'hello',
      description: 'Example command to test OpenCommands',
      version: '1.0.0',
      author: 'OpenCommands',
      tags: ['example', 'test']
    };

    const exampleContent = stringifyFrontMatter(exampleCommand, `
This is an example command that demonstrates OpenCommands functionality.

Usage: /hello [name]

The command will greet the user with the provided name.

$ echo "Hello, $1! Welcome to OpenCommands!"
`);

    await fs.writeFile(
      path.join(commandsDir, 'hello.md'),
      exampleContent,
      'utf-8'
    );

    logger.success('OpenCommands initialized successfully!');
    logger.info(`Configuration directory: ${configDir}`);
    logger.info(`Commands directory: ${commandsDir}`);
    logger.info('');
    logger.info('Try these commands:');
    logger.info('  opencommands list                    # List installed commands');
    logger.info('  opencommands install <git-url>       # Install commands from a Git repository');

  } catch (error) {
    logger.error('Failed to initialize OpenCommands:', error);
    process.exit(1);
  }
}