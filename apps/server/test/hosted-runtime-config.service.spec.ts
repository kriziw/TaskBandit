import { ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostedRuntimeConfigService } from "../src/common/tenancy/hosted-runtime-config.service";

describe("HostedRuntimeConfigService", () => {
  let appConfigService: {
    hostedModeEnabled: boolean;
    controlPlaneRuntimeBaseUrl: string;
    controlPlaneInternalServiceToken: string;
    hostedRuntimeConfigCacheTtlMs: number;
  };
  let tenantContextService: {
    resolveFromRequest: ReturnType<typeof vi.fn>;
  };
  let appLogService: {
    warn: ReturnType<typeof vi.fn>;
  };
  let service: HostedRuntimeConfigService;

  beforeEach(() => {
    appConfigService = {
      hostedModeEnabled: true,
      controlPlaneRuntimeBaseUrl: "https://control-plane.taskbandit.example",
      controlPlaneInternalServiceToken: "internal-token",
      hostedRuntimeConfigCacheTtlMs: 60_000
    };
    tenantContextService = {
      resolveFromRequest: vi.fn().mockResolvedValue({ tenantId: "tenant-a" })
    };
    appLogService = {
      warn: vi.fn()
    };

    service = new HostedRuntimeConfigService(
      appConfigService as never,
      tenantContextService as never,
      appLogService as never
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("surfaces safe reason details when control plane rejects runtime tenant mapping", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: "not_found",
            details: { reason: "runtime_tenant_not_mapped" },
            message: "Hosted runtime tenant mapping could not be found."
          }
        })
      })
    );

    const error = await service.getTenantRuntimeConfig("runtime-tenant-a").catch((caught) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getResponse()).toMatchObject({
      code: "hosted_runtime_config_unavailable",
      message: "Hosted runtime config could not be loaded from the control plane.",
      details: {
        reason: "runtime_tenant_not_mapped",
        upstreamCode: "not_found",
        upstreamStatusCode: 404
      }
    });
    expect(appLogService.warn).toHaveBeenCalledTimes(1);
  });

  it("declares runtime contract version and accepts additive contract metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tenantConfig: {
          compatibilityMode: "soft",
          configVersion: "2026-05-09T09:00:00.000Z",
          contractVersion: "1.0.0",
          entitlementState: "active",
          featureAccess: {},
          graceEndsAt: null,
          hostedOidcConfig: {
            allowedDomains: [],
            clientId: null,
            clientSecretRef: null,
            enabled: false,
            issuer: null,
            scopes: []
          },
          hostedPushConfig: {
            fcm: {
              enabled: true,
              serviceAccountBase64: "base64-payload"
            }
          },
          lifecycleState: "active",
          packageCode: "family_plus",
          packageDisplayName: "Family Plus",
          packageRevisionId: null,
          packageRevisionNumber: null,
          billingStatus: "active",
          planCode: "family_plus",
          integrations: [],
          quotaPolicy: {},
          quotaPolicyVersion: "2026-05-09T09:00:00.000Z",
          suspensionReason: null,
          tenantId: "tenant-a",
          trialEndsAt: null,
          updatedAt: "2026-05-09T09:00:00.000Z"
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const config = await service.getTenantRuntimeConfig("tenant-a");
    expect(config?.contractVersion).toBe("1.0.0");
    expect(config?.compatibilityMode).toBe("soft");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: {
        "x-internal-service-token": "internal-token",
        "x-taskbandit-runtime-contract-version": "1.0.0"
      }
    });
  });

  it("uses safe fallback reason categories when control plane returns non-json errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("non-json");
        }
      })
    );

    const error = await service.getTenantRuntimeConfig("runtime-tenant-b").catch((caught) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getResponse()).toMatchObject({
      code: "hosted_runtime_config_unavailable",
      message: "Hosted runtime config could not be loaded from the control plane.",
      details: {
        reason: "control_plane_unavailable",
        upstreamCode: null,
        upstreamStatusCode: 503
      }
    });
    expect(appLogService.warn).toHaveBeenCalledTimes(1);
  });

  it("surfaces runtime contract incompatibility responses with stable reason code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: "runtime_contract_incompatible",
            details: {
              reason: "runtime_contract_version_incompatible"
            },
            message: "Runtime contract version is incompatible with the control-plane runtime contract."
          }
        })
      })
    );

    const error = await service.getTenantRuntimeConfig("runtime-tenant-c").catch((caught) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getResponse()).toMatchObject({
      code: "hosted_runtime_config_unavailable",
      details: {
        reason: "runtime_contract_version_incompatible",
        upstreamCode: "runtime_contract_incompatible",
        upstreamStatusCode: 409
      }
    });
    expect(appLogService.warn).toHaveBeenCalledTimes(1);
  });

  it("uses short stale cache fallback when control plane is temporarily unavailable", async () => {
    appConfigService.hostedRuntimeConfigCacheTtlMs = 1_000;
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tenantConfig: {
            compatibilityMode: "soft",
            configVersion: "2026-05-12T10:00:00.000Z",
            contractVersion: "1.0.0",
            entitlementState: "active",
            featureAccess: {},
            graceEndsAt: null,
            hostedOidcConfig: {
              allowedDomains: [],
              clientId: null,
              clientSecretRef: null,
              enabled: false,
              issuer: null,
              scopes: []
            },
            lifecycleState: "active",
            packageCode: "family_plus",
            packageDisplayName: "Family Plus",
            packageRevisionId: null,
            packageRevisionNumber: null,
            billingStatus: "active",
            planCode: "family_plus",
            integrations: [],
            quotaPolicy: {},
            quotaPolicyVersion: "2026-05-12T10:00:00.000Z",
            suspensionReason: null,
            tenantId: "tenant-a",
            trialEndsAt: null,
            updatedAt: "2026-05-12T10:00:00.000Z"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: "service_unavailable",
            details: { reason: "control_plane_unavailable" },
            message: "Control plane runtime config endpoint is unavailable."
          }
        })
      });

    vi.stubGlobal("fetch", fetchMock);

    const freshConfig = await service.getTenantRuntimeConfig("tenant-a");
    now += 1_500;
    const staleFallbackConfig = await service.getTenantRuntimeConfig("tenant-a");

    expect(freshConfig?.tenantId).toBe("tenant-a");
    expect(staleFallbackConfig?.tenantId).toBe("tenant-a");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(appLogService.warn).toHaveBeenCalledTimes(2);
    expect(appLogService.warn).toHaveBeenLastCalledWith(
      expect.stringContaining("using_stale_cache"),
      "HostedRuntimeConfigService"
    );
  });

  it("fails closed when cached runtime config is too stale", async () => {
    appConfigService.hostedRuntimeConfigCacheTtlMs = 500;
    let now = 2_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tenantConfig: {
            compatibilityMode: "soft",
            configVersion: "2026-05-12T10:00:00.000Z",
            contractVersion: "1.0.0",
            entitlementState: "active",
            featureAccess: {},
            graceEndsAt: null,
            hostedOidcConfig: {
              allowedDomains: [],
              clientId: null,
              clientSecretRef: null,
              enabled: false,
              issuer: null,
              scopes: []
            },
            lifecycleState: "active",
            packageCode: "family_plus",
            packageDisplayName: "Family Plus",
            packageRevisionId: null,
            packageRevisionNumber: null,
            billingStatus: "active",
            planCode: "family_plus",
            integrations: [],
            quotaPolicy: {},
            quotaPolicyVersion: "2026-05-12T10:00:00.000Z",
            suspensionReason: null,
            tenantId: "tenant-a",
            trialEndsAt: null,
            updatedAt: "2026-05-12T10:00:00.000Z"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: "service_unavailable",
            details: { reason: "control_plane_unavailable" },
            message: "Control plane runtime config endpoint is unavailable."
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    await service.getTenantRuntimeConfig("tenant-a");
    now += 5 * 60_000 + 2_000;

    const error = await service.getTenantRuntimeConfig("tenant-a").catch((caught) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getResponse()).toMatchObject({
      code: "hosted_runtime_config_unavailable",
      details: {
        reason: "control_plane_unavailable",
        upstreamStatusCode: 503
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
