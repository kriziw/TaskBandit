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
});
