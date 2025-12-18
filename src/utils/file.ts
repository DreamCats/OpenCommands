import { promises as fs } from 'fs';
import path from 'path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getFileName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function getDirName(filePath: string): string {
  return path.dirname(filePath);
}

export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

export function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}

export function isAbsolute(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

export function relativePath(from: string, to: string): string {
  return path.relative(from, to);
}