# OpenCommands Simple

一个极简的命令加载器，专为 AI 编码代理设计。

## 为什么重构？

原版 OpenCommands 有 3,101 行代码，过于复杂。新版本遵循 "做一件事并做好" 的原则：

- ✅ **代码量减少 86%**：3,101 行 → 440 行
- ✅ **文件减少 76%**：29 个 → 7 个
- ✅ **依赖减少 75%**：8 个 → 2 个
- ✅ **核心功能完整保留**

## 功能

- `install` - 从 Git 仓库安装命令
- `list` - 列出所有可用命令
- `search` - 简单搜索命令
- `run` - 执行命令
- `show` - 显示命令内容（供 AI 使用）

## 安装

```bash
npm install -g @dreamcats/opencommands
```

## 使用

### 1. 安装命令

```bash
# 从 GitHub 安装
opencommands install user/repo

# 安装到用户目录（全局）
opencommands install user/repo --global
```

### 2. 列出命令

```bash
opencommands list
```

### 3. 搜索命令

```bash
opencommands search build
```

### 4. 执行命令

```bash
opencommands run hello-world
```

### 5. 显示命令内容

```bash
opencommands show hello-world
```

## 命令格式

命令使用 Markdown + YAML 格式：

```markdown
---
name: hello-world
description: A simple hello world command
---

# Hello World

This command says hello.

! echo "Hello, World!"
```

### 支持的语法

- `! command` - 执行 shell 命令
- `@filename` - 引用文件内容
- 普通文本 - 直接输出

## 目录结构

```
.claude/commands/
├── hello-world.md
├── build-project.md
└── deploy/
    └── production.md
```

## 移除了什么？

原版中过度设计的功能：

- ❌ 模糊搜索（Fuse.js）
- ❌ 复杂的配置系统
- ❌ 使用统计和热门排序
- ❌ 版本检测和交互式同步
- ❌ NPM 包支持
- ❌ 多数据源层级
- ❌ AGENTS.md 生成
- ❌ 复杂的错误处理

## 技术栈

- TypeScript
- Commander.js（CLI 框架）
- Chalk（颜色输出）

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 测试
npm test

# 运行演示
node dist/demo.js
```

## 许可证

Apache 2.0
