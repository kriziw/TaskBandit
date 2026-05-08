import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HostedTemplateSeedController } from "../src/modules/chores/hosted-template-seed.controller";

describe("HostedTemplateSeedController", () => {
  let householdRepository: {
    ensureDefaultTemplatesForTenant: ReturnType<typeof vi.fn>;
  };
  let appConfigService: {
    controlPlaneInternalServiceToken: string;
  };
  let controller: HostedTemplateSeedController;

  beforeEach(() => {
    householdRepository = {
      ensureDefaultTemplatesForTenant: vi.fn().mockResolvedValue({
        seeded: true,
        templateCount: 4
      })
    };
    appConfigService = {
      controlPlaneInternalServiceToken: "internal-token"
    };
    controller = new HostedTemplateSeedController(
      appConfigService as never,
      householdRepository as never,
      {
        resolveLanguage: vi.fn().mockReturnValue("en")
      } as never,
      {
        warn: vi.fn()
      } as never
    );
  });

  it("seeds hosted default templates when internal token is valid", async () => {
    await expect(
      controller.seedTenantDefaultTemplates("tenant-1", "en-US,en;q=0.9", "internal-token")
    ).resolves.toEqual({
      seeded: true,
      templateCount: 4,
      tenantId: "tenant-1"
    });

    expect(householdRepository.ensureDefaultTemplatesForTenant).toHaveBeenCalledWith("tenant-1", "en");
  });

  it("rejects calls when token is invalid", async () => {
    await expect(
      controller.seedTenantDefaultTemplates("tenant-1", "en-US,en;q=0.9", "wrong-token")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects calls when internal service token is not configured", async () => {
    appConfigService.controlPlaneInternalServiceToken = "";

    await expect(
      controller.seedTenantDefaultTemplates("tenant-1", "en-US,en;q=0.9", "any-token")
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
