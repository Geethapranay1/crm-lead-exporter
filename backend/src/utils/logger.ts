type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  jobId?: string;
  batchIndex?: number;
  totalBatches?: number;
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  retries?: number;
  recordsIn?: number;
  recordsOut?: number;
  recordsSkipped?: number;
  validationErrors?: string[];
  [key: string]: unknown;
}

class Logger {
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const ctxStr = context ? " " + JSON.stringify(context) : "";
    return `[${timestamp}] ${level.toUpperCase()} ${message}${ctxStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      console.debug(this.format("debug", message, context));
    }
  }

  info(message: string, context?: LogContext) {
    console.log(this.format("info", message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.format("warn", message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.format("error", message, context));
  }

  logAiBatch(context: LogContext & { level: LogLevel; message: string }) {
    this[context.level](context.message, context);
  }
}

export const logger = new Logger();

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
