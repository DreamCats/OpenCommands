import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { mkdirSync, cpSync, rmSync, readdirSync, statSync, existsSync, copyFileSync, readFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { checkbox, confirm } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';

interface InstallOptions {
  global?: boolean;
  yes?: boolean;
}

/**
 * 从Git仓库安装命令
 * 支持交互式选择
 */
export async function installFromGit(gitUrl: string, options: InstallOptions = {}): Promise<void> {
  const targetDir = options.global
    ? join(homedir(), '.claude/commands')
    : join(process.cwd(), '.claude/commands');

  // 处理 GitHub 简写格式 (user/repo)
  let fullGitUrl = gitUrl;
  if (!gitUrl.startsWith('http') && !gitUrl.startsWith('git@') && gitUrl.includes('/')) {
    fullGitUrl = `https://github.com/${gitUrl}.git`;
  }

  console.log(chalk.blue(`Installing from ${fullGitUrl}...`));

  // 创建临时目录
  const tmpDir = join('/tmp', `opencommands-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    // 克隆仓库（带spinner）
    const spinner = ora('Cloning repository...').start();
    try {
      await runCommand('git', ['clone', '--depth', '1', '--quiet', fullGitUrl, tmpDir]);
      spinner.succeed('Repository cloned');
    } catch (error) {
      spinner.fail('Failed to clone repository');
      throw error;
    }

    // 查找命令目录
    const commandsDir = findCommandsDir(tmpDir);
    if (!commandsDir) {
      throw new Error('No commands found in repository. Looking for: commands/, .claude/commands/, or markdown files');
    }

    // 扫描所有命令
    const commands = scanCommands(commandsDir);
    if (commands.length === 0) {
      throw new Error('No valid command files found');
    }

    console.log(chalk.dim(`\nFound ${commands.length} command(s)\n`));


    // 交互式选择（除非 -y 标志）
    let commandsToInstall = commands;
    if (!options.yes && commands.length > 1) {
      try {
        const choices = commands.map((cmd) => {
          const displayName = cmd.relativePath; // 使用相对路径作为显示名
          const desc = cmd.description || 'No description';
          // 先计算纯文本长度，再添加颜色
          const paddedName = displayName.padEnd(30);
          return {
            name: `${chalk.green(paddedName)} ${chalk.dim(desc)}`,
            value: cmd.relativePath, // 使用相对路径作为值
            checked: true, // 默认全选
          };
        });

        const selected = await checkbox({
          message: 'Select commands to install',
          choices,
          pageSize: 15,
        });

        if (selected.length === 0) {
          console.log(chalk.yellow('No commands selected. Installation cancelled.'));
          return;
        }

        commandsToInstall = commands.filter((cmd) => selected.includes(cmd.relativePath));
      } catch (error) {
        if (error instanceof ExitPromptError) {
          console.log(chalk.yellow('\n\nCancelled by user'));
          process.exit(0);
        }
        throw error;
      }
    }

    // 确保目标目录存在
    mkdirSync(targetDir, { recursive: true });

    // 安装选中的命令（保持文件夹结构）
    let installedCount = 0;
    for (const cmd of commandsToInstall) {
      // 计算目标路径（保持相对路径结构）
      const targetPath = join(targetDir, cmd.relativePath);
      const targetDirPath = dirname(targetPath);

      // 确保目标目录存在
      mkdirSync(targetDirPath, { recursive: true });

      // 检查是否已存在
      if (existsSync(targetPath)) {
        if (!options.yes) {
          try {
            const shouldOverwrite = await confirm({
              message: chalk.yellow(`Command '${cmd.relativePath}' already exists. Overwrite?`),
              default: false,
            });
            if (!shouldOverwrite) {
              console.log(chalk.yellow(`Skipped: ${cmd.relativePath}`));
              continue;
            }
          } catch (error) {
            if (error instanceof ExitPromptError) {
              console.log(chalk.yellow('\n\nCancelled by user'));
              process.exit(0);
            }
            throw error;
          }
        }
      }

      copyFileSync(cmd.filePath, targetPath);
      installedCount++;
    }

    console.log(chalk.green(`\n✅ Installation complete: ${installedCount} command(s) installed`));

    if (installedCount > 0) {
      console.log('\nInstalled commands:');
      for (const cmd of commandsToInstall) {
        console.log(`  - ${chalk.green(cmd.relativePath)}`);
      }
    }

  } finally {
    // 清理临时目录
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * 扫描命令文件
 */
function scanCommands(dir: string): Array<{name: string; filePath: string; description?: string; relativePath: string}> {
  const commands: Array<{name: string; filePath: string; description?: string; relativePath: string}> = [];

  function scanRecursive(currentDir: string, basePath: string = '') {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      const relativePath = basePath ? join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        // 跳过隐藏文件夹（以.开头的文件夹）
        if (!entry.name.startsWith('.')) {
          scanRecursive(fullPath, relativePath);
        }
      } else if (entry.name.endsWith('.md')) {
        // 过滤掉 README.md 和其他非命令文件
        if (entry.name.toLowerCase() === 'readme.md' || entry.name.toLowerCase().startsWith('readme.')) {
          continue;
        }

        const name = entry.name.replace('.md', '');
        // 从 frontmatter 或内容中提取描述
        let description: string | undefined;
        try {
          const content = readFileSync(fullPath, 'utf-8');

          // 首先尝试从 YAML frontmatter 获取 description
          const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (yamlMatch) {
            const yamlContent = yamlMatch[1];
            // 匹配 description: 开头的内容（单行）
            const descMatch = yamlContent.match(/^description:\s*(.+)$/m);
            if (descMatch && descMatch[1]) {
              // 清理引号并截断
              description = descMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 60);
            }
          }

          // 如果没有找到，从内容第一行获取
          if (!description) {
            const lines = content.split('\n');
            for (const line of lines) {
              if (line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
                description = line.trim().slice(0, 60);
                break;
              }
            }
          }
        } catch {}

        commands.push({ name, filePath: fullPath, description, relativePath });
      }
    }
  }

  scanRecursive(dir);
  return commands;
}

/**
 * 查找命令目录
 */
function findCommandsDir(repoPath: string): string | null {
  // 检查常见位置
  const possibleDirs = [
    join(repoPath, 'commands'),
    join(repoPath, '.claude/commands'),
  ];

  for (const dir of possibleDirs) {
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      return dir;
    }
  }

  // 如果没有专门的目录，查找根目录下的 markdown 文件
  const files = readdirSync(repoPath);
  const hasMarkdownFiles = files.some(file => file.endsWith('.md'));

  if (hasMarkdownFiles) {
    return repoPath;
  }

  return null;
}

/**
 * 执行 shell 命令
 */
function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}