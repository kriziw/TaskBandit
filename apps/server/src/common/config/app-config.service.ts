import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "node:path";
import { OidcConfig } from "./oidc-config.type";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

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

  get pushDeliveryIntervalMs(): number {
    return Number(this.configService.get("TASKBANDIT_PUSH_DELIVERY_INTERVAL_MS") ?? 60000);
  }

  get emailDeliveryIntervalMs(): number {
    return Number(this.configService.get("TASKBANDIT_EMAIL_DELIVERY_INTERVAL_MS") ?? 60000);
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

  get runtimeLogFilePath(): string {
    return path.resolve(this.storageRootPath, "logs", "taskbandit-runtime.log");
  }

  get runtimeLogBufferSize(): number {
    return Number(this.configService.get("TASKBANDIT_RUNTIME_LOG_BUFFER_SIZE") ?? 1000);
  }

  get fcmEnabled(): boolean {
    return this.configService.get<string>("TASKBANDIT_FCM_ENABLED", "false") === "true";
  }

  get fcmServiceAccount(): FirebaseServiceAccount | null {
    const rawJson = this.configService.get<string>("TASKBANDIT_FCM_SERVICE_ACCOUNT_JSON", "").trim();
    const rawBase64 = this.configService
      .get<string>("TASKBANDIT_FCM_SERVICE_ACCOUNT_BASE64", "")
      .trim();
    const resolvedJson = rawJson || (rawBase64 ? Buffer.from(rawBase64, "base64").toString("utf8") : "");

    if (!resolvedJson) {
      return null;
    }

    try {
      const parsed = JSON.parse(resolvedJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        return null;
      }

      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n")
      };
    } catch {
      return null;
    }
  }

  get jwtSecret(): string {
    return this.configService.get<string>("TASKBANDIT_JWT_SECRET", "taskbandit-dev-secret-change-me");
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>("TASKBANDIT_JWT_EXPIRES_IN", "7d");
  }

  get forceLocalAuthEnabled(): boolean {
    return this.configService.get<string>("TASKBANDIT_FORCE_LOCAL_AUTH_ENABLED", "false") === "true";
  }

  get oidcFallbackConfig(): OidcConfig {
    const enabled = this.configService.get<string>("TASKBANDIT_OIDC_ENABLED", "false") === "true";
    const authority = this.configService.get<string>("TASKBANDIT_OIDC_AUTHORITY", "").trim();
    const clientId = this.configService.get<string>("TASKBANDIT_OIDC_CLIENT_ID", "").trim();
    const clientSecret = this.configService.get<string>("TASKBANDIT_OIDC_CLIENT_SECRET", "").trim();
    const scope = this.configService.get<string>("TASKBANDIT_OIDC_SCOPE", "openid profile email").trim();

    return {
      enabled: enabled && Boolean(authority && clientId),
      authority,
      clientId,
      clientSecret,
      scope,
      source: enabled && authority && clientId ? "env" : "none"
    };
  }

  withBasePath(path: string): string {
    if (!this.reverseProxyPathBase) {
      return path;
    }

    return `${this.reverseProxyPathBase}/${path.replace(/^\/+/, "")}`;
  }
}
