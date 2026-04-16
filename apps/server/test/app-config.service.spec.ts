import { describe, expect, it } from "vitest";
import { AppConfigService } from "../src/common/config/app-config.service";

const createService = (values: Record<string, string | undefined>) =>
  new AppConfigService({
    get: <T>(key: string, defaultValue?: T) =>
      (key in values ? values[key] : defaultValue) as T
  } as never);

describe("AppConfigService", () => {
  it("infers reverse proxy mode from remote public urls", () => {
    const service = createService({
      TASKBANDIT_PUBLIC_WEB_BASE_URL: "https://taskbandit.example.com/",
      TASKBANDIT_PUBLIC_API_BASE_URL: "https://api.taskbandit.example.com/"
    });

    expect(service.publicWebBaseUrl).toBe("https://taskbandit.example.com");
    expect(service.publicApiBaseUrl).toBe("https://api.taskbandit.example.com");
    expect(service.reverseProxyEnabled).toBe(true);
  });

  it("keeps reverse proxy mode disabled for localhost-only development urls", () => {
    const service = createService({
      TASKBANDIT_PUBLIC_WEB_BASE_URL: "http://localhost:4173/",
      TASKBANDIT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8080/"
    });

    expect(service.reverseProxyEnabled).toBe(false);
  });

  it("lets explicit reverse proxy configuration override inferred behavior", () => {
    const service = createService({
      TASKBANDIT_PUBLIC_WEB_BASE_URL: "https://taskbandit.example.com",
      TASKBANDIT_PUBLIC_API_BASE_URL: "https://api.taskbandit.example.com",
      TASKBANDIT_REVERSE_PROXY_ENABLED: "false"
    });

    expect(service.reverseProxyEnabled).toBe(false);
  });

  it("derives cors origins from the public web url when no override is provided", () => {
    const service = createService({
      TASKBANDIT_PUBLIC_WEB_BASE_URL: "https://taskbandit.example.com/app/"
    });

    expect(service.corsAllowedOrigins).toEqual(["https://taskbandit.example.com"]);
  });

  it("normalizes and deduplicates explicit cors origins", () => {
    const service = createService({
      TASKBANDIT_CORS_ALLOWED_ORIGINS:
        "https://taskbandit.example.com/, https://taskbandit.example.com/admin, https://api.taskbandit.example.com/v1"
    });

    expect(service.corsAllowedOrigins).toEqual([
      "https://taskbandit.example.com",
      "https://api.taskbandit.example.com"
    ]);
  });
});
