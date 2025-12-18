# 发布指南

本文档说明如何将 OpenCommands 发布到 NPM 仓库。

## 包名说明

我们使用作用域包名 `@dreamcats/opencommands`，这样可以：
- 避免与其他包名冲突
- 明确标识包的作者/组织
- 更好地管理包权限

## 发布前准备

### 1. 注册 NPM 账号

如果还没有 NPM 账号，请先注册：
```bash
npm adduser
```

### 2. 登录 NPM

```bash
npm login
```

### 3. 检查包名权限

确保你有权限发布 `@dreamcats` 作用域下的包。通常，你需要：
- 拥有 `dreamcats` 这个 NPM 用户名
- 或者被添加到该作用域的发布者列表中

## 发布步骤

### 1. 构建项目

```bash
npm run build
```

### 2. 运行测试（可选）

```bash
npm test
```

注意：目前 sync 命令的测试有 2 个失败，但不影响核心功能发布。

### 3. 更新版本号

根据语义化版本规范更新版本号：

```bash
npm version patch  # 修复 bug，如 0.1.0 -> 0.1.1
npm version minor  # 新增功能，如 0.1.0 -> 0.2.0
npm version major  # 破坏性变更，如 0.1.0 -> 1.0.0
```

### 4. 发布到 NPM

```bash
npm publish
```

如果是首次发布作用域包，可能需要：
```bash
npm publish --access public
```

## 发布后的验证

### 1. 检查包是否发布成功

```bash
npm view @dreamcats/opencommands
```

### 2. 测试安装

```bash
npm install -g @dreamcats/opencommands
opencommands --version
```

## 自动化发布（可选）

可以设置 GitHub Actions 实现自动化发布：

1. 在 GitHub 仓库设置 NPM_TOKEN secret
2. 创建 `.github/workflows/publish.yml` 工作流

## 常见问题

### 403 Forbidden 错误

如果遇到发布权限错误，可能是因为：
- 你不是该作用域的拥有者
- 需要联系 NPM 支持获取作用域权限
- 或者考虑使用非作用域包名

### 包名已被占用

如果 `@dreamcats/opencommands` 不可用，可以考虑：
- `@dreamcats/open-commands`
- `@dreamcats/oc`
- 其他变体

### 版本冲突

如果版本号已存在，需要更新版本号后重新发布。

## 发布后的推广

1. 在 GitHub 创建 Release
2. 更新项目文档
3. 在社区分享你的项目
4. 收集用户反馈并持续改进