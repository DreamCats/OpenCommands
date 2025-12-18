# OpenCommands 重构计划：做一件事并做好

## 现状分析
- 当前代码量：3,101 行
- 过度设计功能：模糊搜索、配置系统、使用统计、版本检测等
- 核心问题：解决了20%的需求却用了80%的代码

## 重构目标
- 目标代码量：< 500 行（减少85%）
- 核心功能：Git仓库命令安装、基本搜索、命令执行
- 设计原则：KISS（Keep It Simple, Stupid）

## 新架构设计

### 1. 极简文件结构
```
src/
├── cli.ts          # CLI入口 (50行)
├── commands/
│   ├── install.ts  # Git安装 (80行)
│   ├── list.ts     # 列表显示 (30行)
│   ├── search.ts   # 简单搜索 (40行)
│   └── run.ts      # 命令执行 (60行)
├── core/
│   ├── parser.ts   # YAML解析 (60行)
│   └── executor.ts # 命令执行 (50行)
└── utils/
    ├── git.ts      # Git操作 (40行)
    └── file.ts     # 文件操作 (30行)
```
**总计：~440行**

### 2. 核心功能简化

#### 保留的功能（20%解决80%需求）
1. **install**: 从Git仓库安装命令
2. **list**: 显示已安装命令
3. **search**: 简单文本搜索
4. **run**: 执行命令

#### 移除的功能（过度设计）
- ❌ 模糊搜索（Fuse.js）→ 简单字符串匹配
- ❌ 配置系统（YAML）→ 固定目录结构
- ❌ 使用统计→ 无统计
- ❌ 版本检测→ 简单覆盖
- ❌ NPM支持→ 仅Git
- ❌ 交互式界面→ 简单CLI参数
- ❌ 多数据源→ 单一目录
- ❌ AGENTS.md生成→ 专注命令管理

### 3. 具体实现策略

#### 命令解析简化
```typescript
// 当前复杂实现
class Command {
  name: string;
  namespace?: string;
  description: string;
  tags?: string[];
  aliases?: string[];
  // ...更多字段
}

// 简化后
interface Command {
  name: string;
  description: string;
  content: string;
}
```

#### 搜索简化
```typescript
// 当前：310行，支持模糊匹配、高亮、排序等
// 简化后：40行
function search(query: string, commands: Command[]): Command[] {
  const q = query.toLowerCase();
  return commands.filter(cmd =>
    cmd.name.toLowerCase().includes(q) ||
    cmd.description.toLowerCase().includes(q)
  );
}
```

#### 存储简化
```typescript
// 当前：多层级目录、配置驱动
// 简化后：固定目录
const COMMANDS_DIR = '.claude/commands';
```

### 4. 重构步骤

#### 第一阶段：核心简化（Week 1）
1. 移除所有依赖（只保留最小必要依赖）
2. 创建新的简化文件结构
3. 实现基础 parser.ts
4. 实现简单的 install.ts

#### 第二阶段：功能迁移（Week 2）
1. 实现 list.ts 和 search.ts
2. 实现 run.ts 和 executor.ts
3. 简化 CLI 接口
4. 基础测试覆盖

#### 第三阶段：清理优化（Week 3）
1. 移除旧代码
2. 更新文档
3. 性能优化
4. 发布新版本

### 5. 预期收益

#### 代码质量提升
- **代码量减少85%**：3,101行 → ~440行
- **文件数量减少60%**：29个 → 11个
- **依赖减少50%**：8个 → 4个

#### 维护性提升
- **简单架构**：无复杂抽象层
- **清晰逻辑**：每个文件单一职责
- **易于测试**：减少mock和stub需求

#### 用户体验提升
- **快速启动**：减少依赖安装时间
- **简单界面**：无复杂交互
- **可预测行为**：简单直接的操作

### 6. 风险与考虑

#### 兼容性风险
- 新版本不兼容旧配置
- 需要major version bump
- 用户需要迁移现有命令

#### 功能缺失
- 部分高级用户可能依赖当前功能
- 需要评估哪些功能确实需要保留
- 可以考虑插件机制满足高级需求

### 7. 成功标准

#### 量化指标
- [ ] 代码量 < 500行
- [ ] 启动时间 < 100ms
- [ ] 测试覆盖率 > 80%
- [ ] 零运行时依赖（除CLI框架外）

#### 定性指标
- [ ] 新用户5分钟内上手
- [ ] 代码易于理解和贡献
- [ ] 无复杂配置需求
- [ ] 错误信息清晰易懂

## 结论
通过"做一件事并做好"的重构，OpenCommands 可以从一个臃肿的工具转变为简洁高效的命令管理器，真正解决用户的核心需求。