# 安装指南

OpenCommands 提供多种安装方式，你可以根据自己的需求选择最适合的方法。

## 方式一：通过 NPM 安装（推荐）

这是最简单和推荐的安装方式：

```bash
npm install -g @dreamcats/opencommands
```

安装完成后，你可以直接使用 `opencommands` 命令：

```bash
opencommands --help
```

## 方式二：通过 NPX 临时使用

如果你不想全局安装，可以使用 NPX 临时运行：

```bash
npx @dreamcats/opencommands --help
npx @dreamcats/opencommands search git
npx @dreamcats/opencommands install <命令>
```

## 方式三：从 GitHub 安装

如果你想使用最新的开发版本或参与贡献：

```bash
# 克隆仓库
git clone https://github.com/your-username/open-commands.git
cd open-commands

# 安装依赖
npm install

# 构建项目
npm run build

# 链接到全局（需要管理员权限）
npm link
```

## 方式四：下载预编译二进制文件

未来我们会提供预编译的二进制文件，敬请期待。

## 验证安装

安装完成后，运行以下命令验证是否安装成功：

```bash
opencommands --version
```

如果显示版本号，说明安装成功。

## 初始化配置

首次使用时，建议初始化配置：

```bash
opencommands init
```

这会在你的主目录创建 `.opencommands` 文件夹和配置文件。

## 卸载

如果你想卸载 OpenCommands：

```bash
npm uninstall -g @dreamcats/opencommands
```

如果是通过 `npm link` 安装的：

```bash
npm unlink -g opencommands
```

## 故障排除

### 权限问题

如果在全局安装时遇到权限问题，可以尝试：

```bash
sudo npm install -g opencommands
```

或者配置 NPM 使用用户目录：

```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g opencommands
```

### Node.js 版本要求

OpenCommands 需要 Node.js 18.0.0 或更高版本。检查你的 Node.js 版本：

```bash
node --version
```

如果版本过低，请从 [nodejs.org](https://nodejs.org/) 下载最新版本。

### 命令未找到

如果安装后提示 `opencommands: command not found`，请检查：

1. NPM 全局模块路径是否在 PATH 中：
   ```bash
   npm bin -g
   ```

2. 重新打开终端或运行：
   ```bash
   source ~/.bashrc  # 或 ~/.zshrc
   ```

## 获取帮助

如果在安装过程中遇到问题，可以：

1. 查看 [GitHub Issues](https://github.com/opencommands/opencommands/issues)
2. 创建新的 Issue 描述你的问题
3. 查看项目的 [讨论区](https://github.com/opencommands/opencommands/discussions)