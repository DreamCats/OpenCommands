# OpenCommands

一个为 AI 助手设计的通用命令加载器，灵感来源于 Claude Code 的斜杠命令系统。

## 功能特性

- 🚀 **通用命令管理**：从各种来源安装和管理命令
- 📦 **多源支持**：支持 Git 仓库、本地文件和 NPM 包
- 🔍 **智能搜索**：使用模糊搜索和过滤功能查找命令，支持项目级和用户级多层级搜索
- 🎯 **Claude Code 兼容**：生成与 Claude Code 兼容的输出
- 📝 **Markdown 格式**：简单的 YAML 前置元数据 + Markdown 内容
- 🎨 **交互式 CLI**：用户友好的命令行界面，支持交互式同步和选择
- 🔧 **可扩展**：插件架构支持自定义源
- 🔄 **智能同步**：检测版本差异，支持交互式选择同步内容
- 📁 **多级目录**：优先搜索项目级 `.claude/commands`，然后搜索用户级目录

## 安装

```bash
npm install -g opencommands
```

## 快速开始

```bash
# 初始化 OpenCommands
opencommands init

# 从 Git 仓库安装命令
opencommands install https://github.com/DreamCats/my-commands

# 列出可用命令
opencommands list

# 搜索命令
opencommands search git
```

## 命令格式

命令使用带有 YAML 前置元数据的 Markdown 文件定义：

```markdown
---
name: commit
namespace: git
description: 创建 git 提交
author: opencommands
tags: [git, vcs]
args:
  - name: message
    required: true
    description: 提交信息
allowed-tools:
  - Bash
  - Git
---

创建带有提供信息的 git 提交。

用法：
  git commit -m "$message"
```

## CLI 命令

### `init`
初始化 OpenCommands 配置并创建默认目录。

```bash
opencommands init [选项]

选项：
  -g, --global    初始化全局配置
  -d, --dir       命令目录路径
```

### `install`
从源（Git 仓库、本地路径或 NPM 包）安装命令。

```bash
opencommands install <源> [选项]

选项：
  -n, --namespace <名称>  安装到指定命名空间
  -g, --global            安装到全局目录
  -f, --force             强制安装
  -a, --all               安装所有命令（不提示选择）
```

### `list`
列出已安装的命令，支持过滤选项。

```bash
opencommands list [选项]

选项：
  -n, --namespace <名称>  按命名空间过滤
  -t, --tag <标签>       按标签过滤
  -u, --user             只显示用户级命令（不搜索项目级）
  --json                 输出为 JSON
  --stats                显示统计信息
```

### `search`
按名称、描述或标签搜索命令。优先搜索项目级 `.claude/commands` 目录，然后搜索用户级目录，最后搜索远程源。

```bash
opencommands search <查询> [选项]

选项：
  -f, --fuzzy     启用模糊搜索
  -l, --limit     限制结果数量（默认：10）
  --json          输出为 JSON
  --sync          交互式同步搜索到的命令到项目目录
```

### `remove`
移除已安装的命令。

```bash
opencommands remove <命令> [选项]

选项：
  -n, --namespace <名称>  命令命名空间
  -f, --force            强制移除
```

### `sync`
与源同步命令。支持交互式选择同步内容，自动检测版本差异。

```bash
opencommands sync [选项]

选项：
  --dry-run              显示将要同步的内容（不实际执行）
  --source <源>          仅同步指定源
  --claude               生成 Claude Code 兼容文件
```

同步功能会自动检测版本差异，显示可更新的命令列表，用户可以选择性地同步命令到项目目录。

### `config`
管理配置。

```bash
opencommands config [选项]

选项：
  --get <键>      获取配置值
  --set <键> <值>  设置配置值
  --list           列出所有配置
```

## 配置

配置存储在 `~/.opencommands/config.yaml`：

```yaml
registry:
  sources:
    - type: git
      url: https://github.com/DreamCats/my-commands
  namespaces: {}

settings:
  defaultModel: claude-3-5-sonnet-20241022
  autoUpdate: true
  parallelDownloads: 3
  logLevel: info
```

注意：`commandDirectory` 配置项已被移除，系统会自动使用项目级 `.claude/commands` 目录（如果存在），否则使用用户级目录 `~/.opencommands/commands`。

## Claude Code 集成

生成 Claude Code 兼容文件：

```bash
# 生成 AGENTS.md 和 .claude/commands/
opencommands sync --claude
```

这会创建：
- `AGENTS.md` 文件，包含 `<available_skills>` XML 块
- `.claude/commands/` 目录，包含 Claude 兼容的命令文件

## 开发

```bash
# 克隆仓库
git clone https://github.com/opencommands/opencommands.git
cd opencommands

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 开发模式运行
npm run dev
```

## API 使用

```typescript
import { CommandParser, CommandRegistry, LocalSource } from 'opencommands';

// 解析命令文件
const parser = new CommandParser();
const command = await parser.parse('./my-command.md', {
  type: 'local',
  path: './my-command.md'
});

// 创建注册表
const registry = new CommandRegistry();
registry.register(command);

// 从目录加载
const source = new LocalSource();
const commands = await source.fetch('./commands');
commands.forEach(cmd => registry.register(cmd));

// 查找命令
const found = registry.find('my-command');
if (found) {
  console.log('找到命令:', found.name);
}
```

## 贡献

1. Fork 仓库
2. 创建功能分支：`git checkout -b feature-name`
3. 进行修改并添加测试
4. 运行测试：`npm test`
5. 提交修改：`git commit -am 'Add feature'`
6. 推送到分支：`git push origin feature-name`
7. 提交拉取请求

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 社区

- [GitHub 仓库](https://github.com/opencommands/opencommands)
- [问题跟踪](https://github.com/opencommands/opencommands/issues)
- [讨论区](https://github.com/opencommands/opencommands/discussions)