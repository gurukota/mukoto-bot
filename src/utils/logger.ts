export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  enableColors: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      enableTimestamp: config.enableTimestamp ?? true,
      enableColors: config.enableColors ?? true,
    };
  }

  private getTimestamp(): string {
    if (!this.config.enableTimestamp) return '';
    return `[${new Date().toISOString()}] `;
  }

  private getColorCode(level: LogLevel): string {
    if (!this.config.enableColors) return '';

    switch (level) {
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.INFO:
        return '\x1b[36m'; // Cyan
      case LogLevel.DEBUG:
        return '\x1b[37m'; // White
      default:
        return '';
    }
  }

  private resetColor(): string {
    return this.config.enableColors ? '\x1b[0m' : '';
  }

  private getLevelString(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.WARN:
        return 'WARN ';
      case LogLevel.INFO:
        return 'INFO ';
      case LogLevel.DEBUG:
        return 'DEBUG';
      default:
        return '';
    }
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level > this.config.level) return;

    const timestamp = this.getTimestamp();
    const colorCode = this.getColorCode(level);
    const levelString = this.getLevelString(level);
    const resetColor = this.resetColor();

    const formattedMessage = `${colorCode}${timestamp}[${levelString}] ${message}${resetColor}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      default:
        console.log(formattedMessage, ...args);
        break;
    }
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }
}

// Create a singleton logger instance
const logLevel = process.env.LOG_LEVEL
  ? parseInt(process.env.LOG_LEVEL, 10)
  : process.env.NODE_ENV === 'production'
    ? LogLevel.INFO
    : LogLevel.DEBUG;

export const logger = new Logger({
  level: logLevel,
  enableTimestamp: true,
  enableColors: process.env.NODE_ENV !== 'production',
});

export default logger;
