import { logger, config } from '../utils/index.js';

interface ConfigOptions {
  get?: string;
  set?: string;
  list?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  try {
    await config.load();

    if (options.get) {
      await getConfigValue(options.get);
    } else if (options.set) {
      await setConfigValue(options.set);
    } else if (options.list) {
      await listConfig();
    } else {
      // Default to list
      await listConfig();
    }

  } catch (error) {
    logger.error('Config operation failed:', error);
    process.exit(1);
  }
}

async function getConfigValue(key: string): Promise<void> {
  const cfg = config.get();
  const keys = key.split('.');
  let value: any = cfg;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      logger.error(`Config key not found: ${key}`);
      return;
    }
  }

  console.log(JSON.stringify(value, null, 2));
}

async function setConfigValue(setStr: string): Promise<void> {
  const parts = setStr.split(' ');
  if (parts.length < 2) {
    logger.error('Usage: --set <key> <value>');
    return;
  }

  const key = parts[0];
  const valueStr = parts.slice(1).join(' ');

  // Try to parse value as JSON
  let value: any;
  try {
    value = JSON.parse(valueStr);
  } catch {
    // If not JSON, treat as string
    value = valueStr;
  }

  // Update config
  const cfg = config.get();
  const keys = key.split('.');
  let target: any = cfg;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in target) || typeof target[k] !== 'object') {
      target[k] = {};
    }
    target = target[k];
  }

  target[keys[keys.length - 1]] = value;

  // Save config
  config.set(cfg);
  await config.save();

  logger.success(`Config updated: ${key}`);
}

async function listConfig(): Promise<void> {
  const cfg = config.get();
  console.log(JSON.stringify(cfg, null, 2));
}