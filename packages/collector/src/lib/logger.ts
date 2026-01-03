export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;
  private levelValue: number;

  constructor(level: LogLevel = "info") {
    this.level = level;
    this.levelValue = LOG_LEVELS[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.levelValue;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const levelTag = `[${level.toUpperCase()}]`;
    if (context && Object.keys(context).length > 0) {
      return `${levelTag} ${message} ${JSON.stringify(context)}`;
    }
    return `${levelTag} ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, context));
    }
  }
}
