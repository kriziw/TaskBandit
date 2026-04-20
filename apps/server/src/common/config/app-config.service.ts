import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import fs from "node:fs";
import path from "node:path";
import { OidcConfig } from "./oidc-config.type";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type WebPushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  private normalizeBaseUrl(value: string | undefined) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      return "";
    }

    return trimmedValue.replace(/\/+$/, "");
  }

  private normalizeOrigin(value: string | undefined) {
    const normalizedBaseUrl = this.normalizeBaseUrl(value);
    if (!normalizedBaseUrl) {
      return "";
    }

    try {
      return new URL(normalizedBaseUrl).origin;
    } catch {
      return normalizedBaseUrl;
    }
  }

  private uniqueConfiguredOrigins(values: Array<string | undefined>) {
    return [...new Set(values.map((value) => this.normalizeOrigin(value)).filter(Boolean))];
  }

  private isRemotePublicUrl(value: string) {
    if (!value) {
      return false;
    }

    try {
      const parsed = new URL(value);
      return !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) && !parsed.hostname.endsWith(".local");
    } catch {
      return false;
    }
  }

  private readRepositoryVersionFile(): string {
    const candidatePaths = [
      path.resolve(process.cwd(), "version.txt"),
      path.resolve(process.cwd(), "..", "..", "version.txt"),
      path.resolve(process.cwd(), "..", "..", "..", "version.txt")
    ];

    for (const candidatePath of candidatePaths) {
      if (!fs.existsSync(candidatePath)) {
        continue;
      }

      const value = fs.readFileSync(candidatePath, "utf8").trim();
      if (value) {
        return value;
      }
    }

    return "0.0.0-dev";
  }

  get port(): number {
    return Number(this.configService.get("PORT") ?? 8080);
  }

  get releaseVersion(): string {
    return this.configService.get<string>("TASKBANDIT_RELEASE_VERSION", "").trim() || this.readRepositoryVersionFile();
  }

  get buildNumber(): string {
    return this.configService.get<string>("TASKBANDIT_BUILD_NUMBER", "").trim() || "local";
  }

  get commitSha(): string {
    return this.configService.get<string>("TASKBANDIT_COMMIT_SHA", "").trim() || "local";
  }

  get imageTag(): string {
    return this.configService.get<string>("TASKBANDIT_IMAGE_TAG", "").trim();
  }

  get databaseUrl(): string {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }

    return databaseUrl;
  }

  get reverseProxyEnabled(): boolean {
    const explicitValue = this.configService.get<string>("TASKBANDIT_REVERSE_PROXY_ENABLED")?.trim();
    if (explicitValue) {
      return explicitValue === "true";
    }

    return this.isRemotePublicUrl(this.publicWebBaseUrl) || this.isRemotePublicUrl(this.publicApiBaseUrl);
  }

  get serveEmbeddedWeb(): boolean {
    return this.configService.get<string>("TASKBANDIT_SERVE_EMBEDDED_WEB", "false") === "true";
  }

  get reverseProxyPathBase(): string {
    const rawValue = this.configService.get<string>("TASKBANDIT_REVERSE_PROXY_PATH_BASE", "").trim();
    if (!rawValue) {
      return "";
    }

    return rawValue.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  get seedDemoData(): boolean {
    return this.configService.get<string>("TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA", "false") === "true";
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

  get dataRootHint(): string {
    return this.configService.get<string>("TASKBANDIT_DATA_ROOT_HINT", "").trim();
  }

  get composeFileHint(): string {
    return this.configService.get<string>("TASKBANDIT_COMPOSE_FILE_HINT", "./docker-compose.yml").trim();
  }

  get envFileHint(): string {
    return this.configService.get<string>("TASKBANDIT_ENV_FILE_HINT", "./.env").trim();
  }

  get corsAllowedOrigins(): string[] {
    const explicitOrigins = this.configService.get<string>("TASKBANDIT_CORS_ALLOWED_ORIGINS", "").trim();
    if (explicitOrigins) {
      return this.uniqueConfiguredOrigins(explicitOrigins.split(",").map((value) => value.trim()));
    }

    return this.uniqueConfiguredOrigins([
      this.configService.get<string>("TASKBANDIT_PUBLIC_WEB_BASE_URL")
    ]);
  }

  get publicWebBaseUrl(): string {
    return this.normalizeBaseUrl(this.configService.get<string>("TASKBANDIT_PUBLIC_WEB_BASE_URL"));
  }

  get publicApiBaseUrl(): string {
    return this.normalizeBaseUrl(this.configService.get<string>("TASKBANDIT_PUBLIC_API_BASE_URL"));
  }

  get runtimeLogFilePath(): string {
    return path.resolve(this.storageRootPath, "logs", "taskbandit-runtime.log");
  }

  get runtimeLogBufferSize(): number {
    return Number(this.configService.get("TASKBANDIT_RUNTIME_LOG_BUFFER_SIZE") ?? 1000);
  }

  get runtimeLogMaxFileSizeBytes(): number {
    const configuredValue = Number(
      this.configService.get("TASKBANDIT_RUNTIME_LOG_MAX_FILE_SIZE_MB") ?? 100
    );
    const resolvedMegabytes = Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 100;
    return Math.round(resolvedMegabytes * 1024 * 1024);
  }

  get runtimeLogMaxTotalSizeBytes(): number {
    const configuredValue = Number(
      this.configService.get("TASKBANDIT_RUNTIME_LOG_MAX_TOTAL_SIZE_MB") ?? 500
    );
    const resolvedMegabytes = Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 500;
    return Math.max(
      Math.round(resolvedMegabytes * 1024 * 1024),
      this.runtimeLogMaxFileSizeBytes
    );
  }

  get runtimeLogMaxFileSizeMb(): number {
    return Math.round(this.runtimeLogMaxFileSizeBytes / 1024 / 1024);
  }

  get runtimeLogMaxTotalSizeMb(): number {
    return Math.round(this.runtimeLogMaxTotalSizeBytes / 1024 / 1024);
  }

  get dockerLogMaxSize(): string {
    return this.configService.get<string>("TASKBANDIT_DOCKER_LOG_MAX_SIZE", "100m").trim() || "100m";
  }

  get dockerLogMaxFiles(): number {
    const configuredValue = Number(this.configService.get("TASKBANDIT_DOCKER_LOG_MAX_FILES") ?? 5);
    return Number.isFinite(configuredValue) && configuredValue > 0 ? configuredValue : 5;
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

  get webPushConfig(): WebPushConfig | null {
    const publicKey = this.configService.get<string>("TASKBANDIT_WEB_PUSH_PUBLIC_KEY", "").trim();
    const privateKey = this.configService.get<string>("TASKBANDIT_WEB_PUSH_PRIVATE_KEY", "").trim();
    const subject = this.configService.get<string>("TASKBANDIT_WEB_PUSH_SUBJECT", "").trim();

    if (!publicKey || !privateKey || !subject) {
      return null;
    }

    return {
      publicKey,
      privateKey,
      subject
    };
  }

  get webPushEnabled(): boolean {
    return this.webPushConfig !== null;
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

  get hostedModeEnabled(): boolean {
    return this.configService.get<string>("TASKBANDIT_HOSTED_MODE", "false") === "true";
  }

  get hostedTenantId(): string {
    return this.configService.get<string>("TASKBANDIT_HOSTED_TENANT_ID", "").trim();
  }

  get controlPlaneRuntimeBaseUrl(): string {
    return this.normalizeBaseUrl(
      this.configService.get<string>("TASKBANDIT_CONTROL_PLANE_RUNTIME_BASE_URL", "")
    ) ?? "";
  }

  get controlPlaneInternalServiceToken(): string {
    return this.configService.get<string>("TASKBANDIT_CONTROL_PLANE_INTERNAL_SERVICE_TOKEN", "").trim();
  }

  get hostedRuntimeConfigCacheTtlMs(): number {
    const configuredValue = Number(
      this.configService.get("TASKBANDIT_HOSTED_RUNTIME_CONFIG_CACHE_TTL_MS") ?? 60000
    );
    return Number.isFinite(configuredValue) && configuredValue >= 1000
      ? configuredValue
      : 60000;
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
