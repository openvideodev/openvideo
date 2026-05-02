enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

interface HistoryEntry {
  level: string;
  time: string;
  args: any[];
}

function any2Str(val: any): string {
  if (val instanceof Error) return String(val);
  if (typeof val === 'object' && val !== null) {
    try {
      return JSON.stringify(val, (_, v) =>
        v instanceof Error ? String(v) : v
      );
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function getTimeStr() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
}

class InternalLogger {
  private threshold: LogLevel = LogLevel.INFO;
  private history: HistoryEntry[] = [];

  public debug = (...args: any[]) =>
    this.log(LogLevel.DEBUG, console.debug, args);
  public info = (...args: any[]) => this.log(LogLevel.INFO, console.info, args);
  public warn = (...args: any[]) => this.log(LogLevel.WARN, console.warn, args);
  public error = (...args: any[]) =>
    this.log(LogLevel.ERROR, console.error, args);

  private log(
    level: LogLevel,
    consoleMethod: (...args: any[]) => void,
    args: any[]
  ) {
    if (level >= this.threshold) {
      consoleMethod(...args);
      this.history.push({
        level: LEVEL_NAMES[level],
        time: getTimeStr(),
        args,
      });
    }
  }

  public setThreshold(level: LogLevel) {
    this.threshold = level;
  }

  public getThreshold(): LogLevel {
    return this.threshold;
  }

  public createTagged(tag: string) {
    return {
      debug: (...args: any[]) => this.debug(tag, ...args),
      info: (...args: any[]) => this.info(tag, ...args),
      warn: (...args: any[]) => this.warn(tag, ...args),
      error: (...args: any[]) => this.error(tag, ...args),
    };
  }

  public dump(): string {
    return this.history
      .map(
        ({ level, time, args }) =>
          `[${level.toUpperCase()}][${time}] ${args.map(any2Str).join(' ')}`
      )
      .join('\n');
  }
}

const logger = new InternalLogger();

/**
 * Global logging utility.
 */
export const Log = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error,

  /**
   * Sets the logging threshold. Only logs at this level or higher will be recorded.
   * @example Log.setLogLevel(Log.warn) // Only warn and error will be logged
   */
  setLogLevel: <T extends Function>(logfn: T) => {
    const fn: any = logfn;
    if (fn === Log.debug) logger.setThreshold(LogLevel.DEBUG);
    else if (fn === Log.info) logger.setThreshold(LogLevel.INFO);
    else if (fn === Log.warn) logger.setThreshold(LogLevel.WARN);
    else if (fn === Log.error) logger.setThreshold(LogLevel.ERROR);
  },

  /**
   * Creates a logger instance that prefixes all messages with a tag.
   */
  create: (tag: string) => logger.createTagged(tag),

  /**
   * Dumps the log history as a string.
   */
  dump: async () => logger.dump(),
};

// Set initial log levels based on environment
if (import.meta.env?.DEV) {
  Log.setLogLevel(Log.debug);
} else if (import.meta.env?.MODE === 'test') {
  Log.setLogLevel(Log.warn);
}
