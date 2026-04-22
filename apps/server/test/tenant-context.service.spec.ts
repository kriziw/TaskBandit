import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantContextService } from "../src/common/tenancy/tenant-context.service";

describe("TenantContextService", () => {
  let prisma: {
    tenant: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let appConfigService: {
    hostedModeEnabled: boolean;
    hostedTenantId: string;
    hostedTenantRoutingMode: "subdomain" | "path";
    tenantPathPrefix: string;
    publicWebBaseUrl: string;
    publicApiBaseUrl: string;
  };
  let service: TenantContextService;

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id?: string; slug?: string } }) => {
          if (where.id === "tenant-123" || where.slug === "family") {
            return {
              id: "tenant-123",
              slug: "family",
              displayName: "Family Home",
              household: {
                id: "household-123"
              }
            };
          }

          return null;
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: "tenant-default",
          slug: "default-home",
          displayName: "Default Home",
          household: {
            id: "household-default"
          }
        })
      }
    };
    appConfigService = {
      hostedModeEnabled: false,
      hostedTenantId: "",
      hostedTenantRoutingMode: "subdomain",
      tenantPathPrefix: "/t",
      publicWebBaseUrl: "https://my.taskbandit.app",
      publicApiBaseUrl: "https://api.taskbandit.app"
    };

    service = new TenantContextService(prisma as never, appConfigService as never);
  });

  it("keeps self-hosted fallback as the default behavior", async () => {
    const result = await service.resolveFromRequest({
      hostHeader: "localhost:8080",
      originalUrl: "/api/auth/providers"
    });

    expect(result).toMatchObject({
      tenantId: "tenant-default",
      householdId: "household-default",
      source: "self_hosted_default"
    });
  });

  it("resolves hosted path tenants from the trusted request path", async () => {
    appConfigService.hostedModeEnabled = true;
    appConfigService.hostedTenantRoutingMode = "path";

    const result = await service.resolveFromRequest({
      hostHeader: "api.taskbandit.app",
      originalUrl: "/t/family/api/auth/providers"
    });

    expect(result).toMatchObject({
      tenantId: "tenant-123",
      householdId: "household-123",
      slug: "family",
      source: "path"
    });
  });

  it("fails closed on configured hosted path hosts without a tenant path", async () => {
    appConfigService.hostedModeEnabled = true;
    appConfigService.hostedTenantRoutingMode = "path";

    await expect(
      service.resolveFromRequest({
        hostHeader: "api.taskbandit.app",
        originalUrl: "/api/auth/providers"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
