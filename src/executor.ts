import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

/**
 * 执行命令内容
 * 支持两种格式：
 * 1. Shell 命令（以 ! 开头）
 * 2. 文件引用（以 @ 开头）
 * 3. 普通文本（直接输出）
 */
export async function executeCommand(command: { name: string; content: string; path: string }, args: string[]): Promise<void> {
  const content = command.content;
  const baseDir = dirname(command.path);

  // 处理参数替换
  let processedContent = content;
  args.forEach((arg, index) => {
    processedContent = processedContent.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
  });

  const lines = processedContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Shell 命令（以 ! 开头）
    if (trimmed.startsWith('!')) {
      const command = trimmed.slice(1).trim();
      console.log(`> ${command}`);
      await runShellCommand(command);
    }
    // 文件引用（以 @ 开头）
    else if (trimmed.startsWith('@')) {
      const filePath = trimmed.slice(1).trim();
      const fullPath = join(baseDir, filePath);
      try {
        const content = readFileSync(fullPath, 'utf-8');
        console.log(content);
      } catch (error) {
        throw new Error(`Cannot read file: ${filePath}`);
      }
    }
    // 普通文本（直接输出）
    else {
      console.log(trimmed);
    }
  }
}

/**
 * 执行 shell 命令
 */
function runShellCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      stdio: 'inherit',
      shell: true
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