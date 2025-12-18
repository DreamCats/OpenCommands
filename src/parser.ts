import { readFileSync, readdirSync, statSync } from 'fs';
import { basename, dirname, join } from 'path';

export interface SimpleCommand {
  name: string;
  description: string;
  content: string;
  path: string;
}

/**
 * 简化版命令解析器
 * 只解析基本的 YAML frontmatter 和 Markdown 内容
 */
export function parseCommandFile(filePath: string): SimpleCommand {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 简单的 YAML frontmatter 解析
  if (!lines[0]?.startsWith('---')) {
    throw new Error(`Invalid command file: ${filePath}. Missing YAML frontmatter.`);
  }

  let yamlEndIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      yamlEndIndex = i;
      break;
    }
  }

  if (yamlEndIndex === -1) {
    throw new Error(`Invalid command file: ${filePath}. Unclosed YAML frontmatter.`);
  }

  const yamlLines = lines.slice(1, yamlEndIndex);
  const markdownContent = lines.slice(yamlEndIndex + 1).join('\n').trim();

  // 简单的 YAML 解析（只支持 name 和 description）
  const metadata: Record<string, string> = {};
  for (const line of yamlLines) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      metadata[key.trim()] = value.trim();
    }
  }

  const name = metadata.name || basename(filePath, '.md');
  const description = metadata.description || 'No description';

  return {
    name,
    description,
    content: markdownContent,
    path: filePath
  };
}

/**
 * 从目录加载所有命令
 */
export function loadCommandsFromDir(dirPath: string): SimpleCommand[] {
  const commands: SimpleCommand[] = [];

  try {
    const files = readdirSync(dirPath);

    for (const file of files) {
      const filePath = join(dirPath, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        // 递归子目录
        commands.push(...loadCommandsFromDir(filePath));
      } else if (file.endsWith('.md')) {
        try {
          const command = parseCommandFile(filePath);
          commands.push(command);
        } catch (error: any) {
          console.warn(`Warning: Failed to parse ${filePath}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    // 目录不存在时返回空数组
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return commands;
}