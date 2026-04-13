import { ConsoleLogger, Injectable } from "@nestjs/common";
import { appendFile, readFile, rename, stat, unlink } from "node:fs/promises";
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
  private readonly maxFileSizeBytes: number;
  private readonly maxTotalSizeBytes: number;
  private readonly maxArchiveFiles: number;
  private writeQueue = Promise.resolve();

  constructor(private readonly appConfigService: AppConfigService) {
    super();
    this.logFilePath = appConfigService.runtimeLogFilePath;
    this.maxEntries = appConfigService.runtimeLogBufferSize;
    this.maxFileSizeBytes = appConfigService.runtimeLogMaxFileSizeBytes;
    this.maxTotalSizeBytes = appConfigService.runtimeLogMaxTotalSizeBytes;
    this.maxArchiveFiles = Math.max(
      0,
      Math.ceil(this.maxTotalSizeBytes / this.maxFileSizeBytes) - 1
    );
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

    const serializedEntry = `${this.formatLine(entry)}\n`;
    this.writeQueue = this.writeQueue
      .then(() => this.persistEntry(serializedEntry))
      .catch(() => undefined);
  }

  private async persistEntry(serializedEntry: string) {
    const serializedSize = Buffer.byteLength(serializedEntry, "utf8");
    await this.rotateIfNeeded(serializedSize);
    await appendFile(this.logFilePath, serializedEntry, "utf8");
    await this.pruneArchivedLogsToTotalLimit();
  }

  private async rotateIfNeeded(nextEntrySizeBytes: number) {
    const currentFileSize = await this.getFileSize(this.logFilePath);
    if (currentFileSize === 0) {
      return;
    }

    if (currentFileSize + nextEntrySizeBytes <= this.maxFileSizeBytes) {
      return;
    }

    if (this.maxArchiveFiles === 0) {
      await unlink(this.logFilePath).catch(() => undefined);
      return;
    }

    await unlink(this.getArchivePath(this.maxArchiveFiles)).catch(() => undefined);

    for (let archiveIndex = this.maxArchiveFiles; archiveIndex >= 1; archiveIndex -= 1) {
      const sourcePath = archiveIndex === 1 ? this.logFilePath : this.getArchivePath(archiveIndex - 1);
      const destinationPath = this.getArchivePath(archiveIndex);

      if (!(await this.fileExists(sourcePath))) {
        continue;
      }

      await unlink(destinationPath).catch(() => undefined);
      await rename(sourcePath, destinationPath).catch(() => undefined);
    }
  }

  private async pruneArchivedLogsToTotalLimit() {
    let totalSize = await this.getFileSize(this.logFilePath);
    const archiveSizes: Array<{ index: number; size: number }> = [];

    for (let archiveIndex = 1; archiveIndex <= this.maxArchiveFiles; archiveIndex += 1) {
      const archivePath = this.getArchivePath(archiveIndex);
      const archiveSize = await this.getFileSize(archivePath);
      if (archiveSize === 0) {
        continue;
      }

      archiveSizes.push({ index: archiveIndex, size: archiveSize });
      totalSize += archiveSize;
    }

    for (const archive of archiveSizes.sort((left, right) => right.index - left.index)) {
      if (totalSize <= this.maxTotalSizeBytes) {
        return;
      }

      await unlink(this.getArchivePath(archive.index)).catch(() => undefined);
      totalSize -= archive.size;
    }
  }

  private async getFileSize(filePath: string) {
    try {
      const fileStats = await stat(filePath);
      return fileStats.size;
    } catch {
      return 0;
    }
  }

  private async fileExists(filePath: string) {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getArchivePath(index: number) {
    return `${this.logFilePath}.${index}`;
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
