export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

/**
 * Namespaced logger with a single global level. Deliberately tiny — it exists
 * so nothing in the engine calls `console` directly and a production build can
 * be silenced from config.
 */
export class Logger {
  private static level: LogLevel = "warn";

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }

  static getLevel(): LogLevel {
    return Logger.level;
  }

  static create(namespace: string): Logger {
    return new Logger(namespace);
  }

  private readonly prefix: string;

  constructor(namespace: string) {
    this.prefix = `[baccarat:${namespace}]`;
  }

  private enabled(level: Exclude<LogLevel, "silent">): boolean {
    return LEVEL_ORDER[Logger.level] >= LEVEL_ORDER[level];
  }

  error(...args: unknown[]): void {
    if (this.enabled("error")) console.error(this.prefix, ...args);
  }

  warn(...args: unknown[]): void {
    if (this.enabled("warn")) console.warn(this.prefix, ...args);
  }

  info(...args: unknown[]): void {
    if (this.enabled("info")) console.info(this.prefix, ...args);
  }

  debug(...args: unknown[]): void {
    if (this.enabled("debug")) console.debug(this.prefix, ...args);
  }
}
