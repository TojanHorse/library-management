import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private logFile: string | null = null;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  constructor() {
    // Set up log file in production
    if (process.env.NODE_ENV === 'production') {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      this.logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    const metadata = entry.metadata ? JSON.stringify(entry.metadata) : '';
    const stack = entry.stack ? `\n${entry.stack}` : '';
    
    return `${timestamp} ${level} ${context} ${entry.message} ${metadata}${stack}`;
  }

  private writeLog(entry: LogEntry): void {
    // Add to memory logs
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    // Console output
    const formattedLog = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
    }

    // File output in production
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, formattedLog + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.DEBUG,
        message,
        context,
        metadata
      });
    }
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message,
        context,
        metadata
      });
    }
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.WARN,
        message,
        context,
        metadata
      });
    }
  }

  error(message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message,
        context,
        metadata,
        stack: error?.stack
      });
    }
  }

  // Specialized logging methods
  logUserAction(action: string, userId: string, metadata?: Record<string, any>): void {
    this.info(`User action: ${action}`, 'USER_ACTION', {
      userId,
      ...metadata
    });
  }

  logEmailEvent(event: string, recipient: string, success: boolean, error?: string): void {
    this.info(`Email event: ${event}`, 'EMAIL', {
      recipient,
      success,
      error
    });
  }

  logTelegramEvent(event: string, chatId: string, success: boolean, error?: string): void {
    this.info(`Telegram event: ${event}`, 'TELEGRAM', {
      chatId,
      success,
      error
    });
  }

  logDatabaseOperation(operation: string, collection: string, success: boolean, duration?: number, error?: string): void {
    this.info(`Database operation: ${operation}`, 'DATABASE', {
      collection,
      success,
      duration,
      error
    });
  }

  logApiRequest(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
    this.info(`API request: ${method} ${path}`, 'API', {
      method,
      path,
      statusCode,
      duration,
      userId
    });
  }

  // Get recent logs for debugging
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel, limit: number = 100): LogEntry[] {
    return this.logs.filter(log => log.level === level).slice(-limit);
  }

  // Get logs by context
  getLogsByContext(context: string, limit: number = 100): LogEntry[] {
    return this.logs.filter(log => log.context === context).slice(-limit);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Get log statistics
  getLogStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const log of this.logs) {
      const level = LogLevel[log.level];
      stats[level] = (stats[level] || 0) + 1;
    }
    return stats;
  }
}

export const logger = Logger.getInstance();

// Set log level based on environment
if (process.env.NODE_ENV === 'development') {
  logger.setLogLevel(LogLevel.DEBUG);
} else {
  logger.setLogLevel(LogLevel.INFO);
}
