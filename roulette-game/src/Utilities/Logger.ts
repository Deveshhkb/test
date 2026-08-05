export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

/**
 * Namespaced logger with a global level.
 *
 * Production builds run at WARN so an operator's console stays readable, while
 * `debug: true` in the config lifts every namespace to DEBUG. Log calls are
 * cheap no-ops below the active level - message construction happens after the
 * level check, never before.
 */
export class Logger {
  private static level: LogLevel = LogLevel.WARN;
  private static readonly PREFIX = '[Roulette]';

  public static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  public static getLevel(): LogLevel {
    return Logger.level;
  }

  public static create(namespace: string): Logger {
    return new Logger(namespace);
  }

  private constructor(private readonly namespace: string) {}

  public debug(message: string, ...args: unknown[]): void {
    if (Logger.level < LogLevel.DEBUG) return;
    console.debug(`${Logger.PREFIX}[${this.namespace}]`, message, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    if (Logger.level < LogLevel.INFO) return;
    console.info(`${Logger.PREFIX}[${this.namespace}]`, message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    if (Logger.level < LogLevel.WARN) return;
    console.warn(`${Logger.PREFIX}[${this.namespace}]`, message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    if (Logger.level < LogLevel.ERROR) return;
    console.error(`${Logger.PREFIX}[${this.namespace}]`, message, ...args);
  }
}
