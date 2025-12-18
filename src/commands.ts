import { SimpleCommand, loadCommandsFromDir } from './parser.js';
import { join } from 'path';
import { homedir } from 'os';

// 固定的命令目录
const COMMANDS_DIR = '.claude/commands';

/**
 * 简化的命令管理器
 * 使用简单的 Map 结构，无复杂索引和统计功能
 */
export class SimpleCommandManager {
  private commands: Map<string, SimpleCommand> = new Map();
  private initialized = false;

  /**
   * 初始化命令管理器，加载所有命令
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // 加载项目级命令
    const projectCommands = loadCommandsFromDir(join(process.cwd(), COMMANDS_DIR));

    // 加载用户级命令
    const userCommands = loadCommandsFromDir(join(homedir(), COMMANDS_DIR));

    // 合并命令（项目级优先）
    const allCommands = [...userCommands, ...projectCommands];

    for (const cmd of allCommands) {
      this.commands.set(cmd.name, cmd);
    }

    this.initialized = true;
  }

  /**
   * 获取所有命令
   */
  getAllCommands(): SimpleCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 根据名称获取命令
   */
  getCommand(name: string): SimpleCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * 简单搜索（字符串包含匹配）
   */
  search(query: string): SimpleCommand[] {
    const q = query.toLowerCase();
    return this.getAllCommands().filter(cmd =>
      cmd.name.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q)
    );
  }

  /**
   * 添加命令（用于安装）
   */
  addCommand(command: SimpleCommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * 删除命令
   */
  removeCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * 获取命令数量
   */
  get size(): number {
    return this.commands.size;
  }
}

// 单例实例
let instance: SimpleCommandManager | undefined;

export function getCommandManager(): SimpleCommandManager {
  if (!instance) {
    instance = new SimpleCommandManager();
  }
  return instance;
}