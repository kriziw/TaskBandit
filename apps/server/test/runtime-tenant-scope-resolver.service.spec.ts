import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeTenantScopeResolverService } from "../src/modules/dashboard/runtime-tenant-scope-resolver.service";

describe("RuntimeTenantScopeResolverService", () => {
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    notificationDevice: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let service: RuntimeTenantScopeResolverService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null)
      },
      notificationDevice: {
        findUnique: vi.fn().mockResolvedValue(null)
      }
    };

    service = new RuntimeTenantScopeResolverService(prisma as never);
  });

  it("returns UUID tenant scope without lookups", async () => {
    const tenantId = await service.resolveTenantIdForDiagnostics({
      tenantScope: "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7"
    });

    expect(tenantId).toBe("41f9cc5d-9b31-4a57-9b30-ec2f52236ab7");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.notificationDevice.findUnique).not.toHaveBeenCalled();
  });

  it("resolves non-UUID tenant scopes via user lookup", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      tenantId: "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7"
    });

    const tenantId = await service.resolveTenantIdForDiagnostics({
      tenantScope: "tenant_31",
      userId: "0b9e1f35-191c-4ccb-bd5c-78663ee2cc86"
    });

    expect(tenantId).toBe("41f9cc5d-9b31-4a57-9b30-ec2f52236ab7");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: "0b9e1f35-191c-4ccb-bd5c-78663ee2cc86"
      },
      select: {
        tenantId: true
      }
    });
  });

  it("falls back to device lookup when user lookup cannot resolve", async () => {
    prisma.notificationDevice.findUnique.mockResolvedValueOnce({
      tenantId: "41f9cc5d-9b31-4a57-9b30-ec2f52236ab7"
    });

    const tenantId = await service.resolveTenantIdForDiagnostics({
      tenantScope: "tenant_31",
      userId: "not-a-uuid",
      deviceId: "67404146-e7f3-4a3f-b6ca-f0b67293f17b"
    });

    expect(tenantId).toBe("41f9cc5d-9b31-4a57-9b30-ec2f52236ab7");
    expect(prisma.notificationDevice.findUnique).toHaveBeenCalledWith({
      where: {
        id: "67404146-e7f3-4a3f-b6ca-f0b67293f17b"
      },
      select: {
        tenantId: true
      }
    });
  });

  it("throws when non-UUID tenant scope cannot be resolved", async () => {
    await expect(
      service.resolveTenantIdForDiagnostics({
        tenantScope: "tenant_31",
        userId: "not-a-uuid",
        deviceId: "also-not-a-uuid"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
