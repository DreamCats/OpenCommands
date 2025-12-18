import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncCommand } from './sync';
import { config } from '../utils/config';
import { LocalSource } from '../sources/local';
import { GitSource } from '../sources/git';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

vi.mock('../utils/config');
vi.mock('../sources/local');
vi.mock('../sources/git');
vi.mock('inquirer');
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}));
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('syncCommand', () => {
  const mockConfig = {
    get: vi.fn(() => ({
      registry: {
        sources: [
          { type: 'git', url: 'https://github.com/test/commands.git' },
          { type: 'local', path: '/path/to/commands' }
        ]
      }
    })),
    getCommandDirectory: vi.fn(() => '/user/commands'),
    load: vi.fn()
  };

  const mockLocalCommands = [
    {
      name: 'existing-command',
      namespace: 'test',
      fullName: 'test:existing-command',
      version: '1.0.0',
      description: 'Existing command',
      metadata: { name: 'existing-command', namespace: 'test' },
      content: 'existing content'
    }
  ];

  const mockRemoteCommands = [
    {
      name: 'existing-command',
      namespace: 'test',
      fullName: 'test:existing-command',
      version: '2.0.0',
      description: 'Updated command',
      metadata: { name: 'existing-command', namespace: 'test' },
      content: 'updated content'
    },
    {
      name: 'new-command',
      namespace: 'test',
      fullName: 'test:new-command',
      version: '1.0.0',
      description: 'New command',
      metadata: { name: 'new-command', namespace: 'test' },
      content: 'new content'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    config.load = mockConfig.load;
    config.get = mockConfig.get;
    config.getCommandDirectory = mockConfig.getCommandDirectory;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect and display sync candidates', async () => {
    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(mockRemoteCommands))
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    // Mock inquirer to return empty selection to avoid prompt
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ selectedIndices: [] });

    await syncCommand({ noExit: true });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Found 2 command(s) to sync:'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[更新] test:existing-command (1.0.0 → 2.0.0)'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[新增] test:new-command'));
  });

  it('should allow user to select commands to sync', async () => {
    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(mockRemoteCommands))
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      selectedIndices: [0, 1] // Select both commands
    });

    await syncCommand({ noExit: true });

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'checkbox',
        name: 'selectedIndices',
        message: '选择要同步的命令（空格键选择，a键全选，回车确认）：'
      })
    ]);
  });

  it('should save updated commands to files', async () => {
    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(mockRemoteCommands))
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      selectedIndices: [0] // Select only the update
    });

    await syncCommand({ noExit: true });

    expect(fs.mkdir).toHaveBeenCalledWith('/user/commands/test', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/user/commands/test/existing-command.md',
      expect.stringContaining('updated content'),
      'utf-8'
    );
  });

  it('should handle namespace commands correctly', async () => {
    const namespacedRemoteCommands = [
      {
        name: 'deploy',
        namespace: 'k8s',
        fullName: 'k8s:deploy',
        version: '1.0.0',
        description: 'Kubernetes deploy command',
        metadata: { name: 'deploy', namespace: 'k8s' },
        content: 'kubectl apply -f deployment.yaml'
      }
    ];

    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve([]))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(namespacedRemoteCommands))
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      selectedIndices: [0]
    });

    await syncCommand({ noExit: true });

    expect(fs.mkdir).toHaveBeenCalledWith('/user/commands/k8s', { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/user/commands/k8s/deploy.md',
      expect.any(String),
      'utf-8'
    );
  });

  it('should skip sync in dry-run mode', async () => {
    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(mockRemoteCommands))
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    await syncCommand({ dryRun: true, noExit: true });

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should handle no sync candidates', async () => {
    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands)) // Same commands, no changes
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    await syncCommand({ noExit: true });

    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('没有发现需要同步的命令。'));
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it('should handle user cancelling selection', async () => {
    const localSource = {
      validate: vi.fn(() => Promise.resolve(true)),
      fetch: vi.fn(() => Promise.resolve(mockLocalCommands))
    };

    const gitSource = {
      fetch: vi.fn(() => Promise.resolve(mockRemoteCommands))
    };

    vi.mocked(LocalSource).mockImplementation(() => localSource as any);
    vi.mocked(GitSource).mockImplementation(() => gitSource as any);

    vi.mocked(inquirer.prompt).mockResolvedValueOnce({
      selectedIndices: [] // No selection
    });

    await syncCommand({ noExit: true });

    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('未选择任何命令，同步已取消。'));
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});