import chalk from 'chalk';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  error(message: string, error?: unknown): void {
    if (this.level >= LogLevel.ERROR) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red('✖'), message, error ? chalk.gray(`(${errorMessage})`) : '');
    }
  }

  warn(message: string): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(chalk.yellow('⚠'), message);
    }
  }

  info(message: string): void {
    if (this.level >= LogLevel.INFO) {
      console.info(chalk.blue('ℹ'), message);
    }
  }

  success(message: string): void {
    if (this.level >= LogLevel.INFO) {
      console.info(chalk.green('✔'), message);
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.level >= LogLevel.DEBUG) {
      console.debug(chalk.gray('🐛'), message, data ? chalk.gray(JSON.stringify(data, null, 2)) : '');
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const logger = new Logger();