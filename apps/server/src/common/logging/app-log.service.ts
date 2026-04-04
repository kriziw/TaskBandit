import { ConsoleLogger, Injectable } from "@nestjs/common";
import { appendFile, readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { AppConfigService } from "../config/app-config.service";
import { RuntimeLogEntry, RuntimeLogLevel } from "./runtime-log-entry.type";

@Injectable()
export class AppLogService extends ConsoleLogger {
  private readonly entries: RuntimeLogEntry[] = [];
  private nextId = 1;
  private readonly logFilePath: string;
  private readonly maxEntries: number;

  constructor(private readonly appConfigService: AppConfigService) {
    super();
    this.logFilePath = appConfigService.runtimeLogFilePath;
    this.maxEntries = appConfigService.runtimeLogBufferSize;
    mkdirSync(path.dirname(this.logFilePath), { recursive: true });
  }

  override log(message: unknown, context?: string) {
    super.log(message as string, context);
    this.capture("log", message, context);
  }

  override warn(message: unknown, context?: string) {
    super.warn(message as string, context);
    this.capture("warn", message, context);
  }

  override error(message: unknown, stack?: string, context?: string) {
    super.error(message as string, stack, context);
    this.capture("error", message, context, stack);
  }

  override debug(message: unknown, context?: string) {
    super.debug?.(message as string, context);
    this.capture("debug", message, context);
  }

  override verbose(message: unknown, context?: string) {
    super.verbose?.(message as string, context);
    this.capture("verbose", message, context);
  }

  getRecentEntries(limit = 200) {
    return this.entries.slice(-Math.max(1, limit)).reverse();
  }

  async exportText() {
    try {
      return await readFile(this.logFilePath, "utf8");
    } catch {
      return this.entries
        .map((entry) => this.formatLine(entry))
        .join("\n");
    }
  }

  exportJson(limit = this.maxEntries) {
    return this.getRecentEntries(limit);
  }

  private capture(level: RuntimeLogLevel, message: unknown, context?: string, stack?: string) {
    const entry: RuntimeLogEntry = {
      id: String(this.nextId++),
      timestamp: new Date().toISOString(),
      level,
      context: context ?? null,
      message: this.stringifyLogMessage(message),
      stack: stack ?? null
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    void appendFile(this.logFilePath, `${this.formatLine(entry)}\n`, "utf8").catch(() => undefined);
  }

  private formatLine(entry: RuntimeLogEntry) {
    const contextPart = entry.context ? ` [${entry.context}]` : "";
    const stackPart = entry.stack ? `\n${entry.stack}` : "";
    return `${entry.timestamp} ${entry.level.toUpperCase()}${contextPart} ${entry.message}${stackPart}`;
  }

  private stringifyLogMessage(message: unknown) {
    if (typeof message === "string") {
      return message;
    }

    if (message instanceof Error) {
      return message.message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
