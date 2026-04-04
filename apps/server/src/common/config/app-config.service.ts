import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "node:path";
import { OidcConfig } from "./oidc-config.type";

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return Number(this.configService.get("PORT") ?? 8080);
  }

  get databaseUrl(): string {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    return databaseUrl;
  }

  get reverseProxyEnabled(): boolean {
    return this.configService.get<string>("TASKBANDIT_REVERSE_PROXY_ENABLED", "false") === "true";
  }

  get reverseProxyPathBase(): string {
    const rawValue = this.configService.get<string>("TASKBANDIT_REVERSE_PROXY_PATH_BASE", "").trim();
    if (!rawValue) {
      return "";
    }

    return rawValue.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  get seedDemoData(): boolean {
    return this.configService.get<string>("TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA", "true") === "true";
  }

  get reminderIntervalMs(): number {
    return Number(this.configService.get("TASKBANDIT_REMINDER_INTERVAL_MS") ?? 300000);
  }

  get dueSoonReminderWindowHours(): number {
    return Number(this.configService.get("TASKBANDIT_DUE_SOON_WINDOW_HOURS") ?? 6);
  }

  get dailySummaryHourUtc(): number {
    return Number(this.configService.get("TASKBANDIT_DAILY_SUMMARY_HOUR_UTC") ?? 6);
  }

  get storageRootPath(): string {
    const configuredPath = this.configService.get<string>("TASKBANDIT_STORAGE_ROOT", "").trim();
    if (!configuredPath) {
      return path.resolve(process.cwd(), "storage");
    }

    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  get jwtSecret(): string {
    return this.configService.get<string>("TASKBANDIT_JWT_SECRET", "taskbandit-dev-secret-change-me");
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>("TASKBANDIT_JWT_EXPIRES_IN", "7d");
  }

  get oidcConfig(): OidcConfig {
    const enabled = this.configService.get<string>("TASKBANDIT_OIDC_ENABLED", "false") === "true";
    const authority = this.configService.get<string>("TASKBANDIT_OIDC_AUTHORITY", "").trim();
    const clientId = this.configService.get<string>("TASKBANDIT_OIDC_CLIENT_ID", "").trim();

    return {
      enabled: enabled && Boolean(authority && clientId),
      authority,
      clientId
    };
  }

  withBasePath(path: string): string {
    if (!this.reverseProxyPathBase) {
      return path;
    }

    return `${this.reverseProxyPathBase}/${path.replace(/^\/+/, "")}`;
  }
}
